/**
 * tools/cloudflare-docs.js
 *
 * Fetch Cloudflare developer docs — no API key required.
 * Cloudflare exposes all docs as clean Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - list-products      → lists all CF product areas (workers, pages, r2, etc.)
 *   - get-product-index  → gets the doc index/sitemap for one product
 *   - get-page           → fetches a specific doc page as Markdown
 *   - search-docs        → searches a product's full docs (llms-full.txt)
 */

const BASE = "https://developers.cloudflare.com";
const SEARCH_PAGE_LIMIT = 6;
const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "how",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

export const tools = [
  {
    name: "list-products",
    description:
      "Returns a list of all Cloudflare product areas (workers, pages, r2, ai, etc.). " +
      "Use this first if you don't know the product slug.",
    parameters: {},
  },
  {
    name: "get-product-index",
    description:
      "Returns the doc page index for a specific Cloudflare product (e.g. 'workers', 'r2', 'pages'). " +
      "Lists all available pages you can fetch.",
    parameters: {
      product: "string — product slug, e.g. 'workers', 'pages', 'r2', 'ai', 'd1'",
    },
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Cloudflare doc page as clean Markdown. " +
      "Use a path like '/workers/configuration/environment-variables/'.",
    parameters: {
      path: "string — doc path, e.g. '/workers/runtime-apis/fetch/'",
    },
  },
  {
    name: "search-docs",
    description:
      "Loads the full documentation for a Cloudflare product and searches it for a keyword/topic. " +
      "Good for broad questions like 'how does KV storage work'.",
    parameters: {
      product: "string — product slug, e.g. 'workers', 'kv', 'd1'",
      query: "string — what you're looking for",
      maxChars: "number (optional) — max characters to return (default 8000)",
    },
  },
];

/**
 * invoke(toolName, args)
 *
 * @example
 * // Find available products
 * const products = await invoke("list-products");
 *
 * // Get all pages for Workers
 * const index = await invoke("get-product-index", { product: "workers" });
 *
 * // Read a specific page
 * const page = await invoke("get-page", { path: "/workers/runtime-apis/kv/" });
 *
 * // Search Workers docs for bindings info
 * const results = await invoke("search-docs", { product: "workers", query: "bindings" });
 */
export async function invoke(toolName, args = {}) {
  switch (toolName) {
    case "list-products":
      return listProducts();
    case "get-product-index":
      return getProductIndex(args);
    case "get-page":
      return getPage(args);
    case "search-docs":
      return searchDocs(args);
    default:
      throw new Error(`Unknown cloudflare-docs tool: "${toolName}"`);
  }
}

export function normalizeCloudflareDocPath(path) {
  if (!path) return "";

  const url = path.startsWith("http://") || path.startsWith("https://")
    ? new URL(path)
    : new URL(path.startsWith("/") ? path : `/${path}`, BASE);

  let normalizedPath = url.pathname;

  if (normalizedPath.endsWith("/llms.txt")) {
    normalizedPath = `${normalizedPath.slice(0, -"llms.txt".length)}`;
  } else if (normalizedPath.endsWith("/index.md")) {
    normalizedPath = `${normalizedPath.slice(0, -"index.md".length)}`;
  } else if (normalizedPath.endsWith(".md")) {
    normalizedPath = normalizedPath.slice(0, -".md".length);
    if (!normalizedPath.endsWith("/")) normalizedPath += "/";
  } else if (!normalizedPath.endsWith("/") && !looksLikeFilePath(normalizedPath)) {
    normalizedPath += "/";
  }

  const suffix = `${url.search}${url.hash}`;
  return `${normalizedPath}${suffix}`;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function listProducts() {
  // Cloudflare's global llms.txt lists every product with its slug
  const res = await fetch(`${BASE}/llms.txt`);
  if (!res.ok) throw new Error(`Failed to fetch llms.txt: ${res.status}`);
  const text = await res.text();

  const { entries, groups, products } = parseCloudflareDirectoryIndex(text);
  return { products, entries, groups, raw: text };
}

async function getProductIndex({ product }) {
  if (!product) throw new Error("get-product-index requires `product`");

  const res = await fetch(`${BASE}/${product}/llms.txt`);
  if (!res.ok) throw new Error(`Product "${product}" not found (${res.status}). Try list-products first.`);

  const text = await res.text();
  const { entries, sections } = parseCloudflareProductIndex(text);
  return { product, index: text, entries, sections };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeCloudflareDocPath(path);

  for (const candidateUrl of getPageCandidates(path, cleanPath)) {
    const response = await fetch(candidateUrl, {
      headers: { Accept: "text/markdown" },
    });

    if (!response.ok) continue;

    const markdown = await response.text();
    if (isHtmlResponse(response.headers.get("content-type"), markdown)) continue;

    return { path: cleanPath, markdown };
  }

  throw new Error(`Page not found: ${path}`);
}

async function searchDocs({ product, query, maxChars = 8000 }) {
  if (!product) throw new Error("search-docs requires `product`");
  if (!query) throw new Error("search-docs requires `query`");

  const { entries } = await getProductIndex({ product });
  const candidates = entries
    .map((entry) => ({ entry, score: scoreIndexEntry(entry, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, SEARCH_PAGE_LIMIT);

  const matches = [];

  if (candidates.length > 0) {
    const pages = await Promise.all(candidates.map(async ({ entry, score }) => ({
      entry,
      score,
      markdown: await fetchCloudflareMarkdownPage(entry.url),
    })));

    for (const page of pages) {
      if (!page.markdown) continue;

      for (const match of findRelevantChunks(page.markdown, query)) {
        matches.push({
          score: page.score + match.score,
          chunk: `Source: ${page.entry.path}\n\n${match.chunk}`,
        });
      }
    }
  }

  if (matches.length === 0) {
    return searchCloudflareFullArchive(product, query, maxChars);
  }

  matches.sort((left, right) => right.score - left.score);

  const seen = new Set();
  let result = "";

  for (const { chunk } of matches) {
    const normalized = chunk.trim();
    if (!normalized || seen.has(normalized)) continue;

    const separator = result.length > 0 ? "\n\n---\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;

    const snippet = normalized.length > remaining
      ? normalized.slice(0, Math.max(0, remaining - 3)).trimEnd() + "..."
      : normalized;

    if (!snippet.trim()) continue;

    seen.add(normalized);
    result += separator + snippet;

    if (snippet.length < normalized.length) break;
  }

  return {
    product,
    query,
    found: seen.size,
    result: result || "No relevant sections found.",
  };
}

function parseCloudflareDirectoryIndex(index) {
  const entries = [];
  const groups = [];
  const products = [];
  const seen = new Set();

  for (const section of splitMarkdownSections(index)) {
    const sectionEntries = parseMarkdownEntries(section.body)
      .map((entry) => createDirectoryEntry(entry, section.title))
      .filter(Boolean);

    if (sectionEntries.length === 0) continue;

    groups.push({
      title: section.title,
      entries: sectionEntries,
    });

    for (const entry of sectionEntries) {
      entries.push(entry);
      if (seen.has(entry.slug)) continue;
      seen.add(entry.slug);
      products.push(entry.slug);
    }
  }

  return { entries, groups, products };
}

function parseCloudflareProductIndex(index) {
  const sections = [];
  const entries = [];

  for (const section of splitMarkdownSections(index)) {
    const sectionEntries = parseMarkdownEntries(section.body)
      .map((entry) => createProductEntry(entry, section.title))
      .filter(Boolean);

    if (sectionEntries.length === 0) continue;

    sections.push({
      title: section.title,
      entries: sectionEntries,
    });
    entries.push(...sectionEntries);
  }

  return { entries, sections };
}

function splitMarkdownSections(text) {
  const matches = [...text.matchAll(/^##\s+(.+)$/gm)];
  if (matches.length === 0) return [{ title: "Overview", body: text }];

  const sections = [];
  for (let index = 0; index < matches.length; index++) {
    const current = matches[index];
    const next = matches[index + 1];
    const title = normalizeWhitespace(current[1]);
    const start = current.index + current[0].length;
    const end = next ? next.index : text.length;
    const body = text.slice(start, end).trim();
    sections.push({ title, body });
  }

  return sections;
}

function parseMarkdownEntries(body) {
  const entries = [];
  const pattern = /- \[([^\]]+)\]\(([^)]+)\)(?::\s*([\s\S]*?))?(?=\n- \[|\n## |\n# |$)/g;

  for (const match of body.matchAll(pattern)) {
    entries.push({
      title: normalizeWhitespace(match[1]),
      url: match[2].trim(),
      description: normalizeWhitespace(match[3] ?? ""),
    });
  }

  return entries;
}

function createDirectoryEntry(entry, group) {
  const llmsPath = normalizeCloudflareDocPath(entry.url);
  const slug = extractTopLevelSlug(llmsPath);
  if (!slug) return null;

  return {
    ...entry,
    group,
    slug,
    llmsPath,
    path: `/${slug}/`,
  };
}

function createProductEntry(entry, section) {
  const path = normalizeCloudflareDocPath(entry.url);
  if (!path) return null;

  return {
    ...entry,
    section,
    path,
  };
}

function extractTopLevelSlug(path) {
  const [pathname] = path.split(/[?#]/, 1);
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

function getPageCandidates(originalPath, cleanPath) {
  const candidates = [];
  const normalizedUrl = new URL(cleanPath, BASE);
  const rawUrl = originalPath.startsWith("http://") || originalPath.startsWith("https://")
    ? new URL(originalPath)
    : new URL(originalPath.startsWith("/") ? originalPath : `/${originalPath}`, BASE);

  if (!rawUrl.search && !rawUrl.hash) {
    const markdownPath = normalizedUrl.pathname.endsWith("/")
      ? `${normalizedUrl.pathname}index.md`
      : `${normalizedUrl.pathname}.md`;
    candidates.push(`${BASE}${markdownPath}`);
  }

  candidates.push(normalizedUrl.toString());
  return [...new Set(candidates)];
}

async function fetchCloudflareMarkdownPage(url) {
  const response = await fetch(new URL(url, BASE), {
    headers: { Accept: "text/markdown" },
  });

  if (!response.ok) return "";

  const markdown = await response.text();
  return isHtmlResponse(response.headers.get("content-type"), markdown) ? "" : markdown;
}

async function searchCloudflareFullArchive(product, query, maxChars) {
  const response = await fetch(`${BASE}/${product}/llms-full.txt`);
  if (!response.ok) throw new Error(`Could not load full docs for "${product}": ${response.status}`);

  const fullText = await response.text();
  const matches = findRelevantChunks(fullText, query)
    .sort((left, right) => right.score - left.score);

  let result = "";
  let found = 0;

  for (const { chunk } of matches) {
    const separator = result.length > 0 ? "\n\n---\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;

    const snippet = chunk.length > remaining
      ? chunk.slice(0, Math.max(0, remaining - 3)).trimEnd() + "..."
      : chunk;

    if (!snippet.trim()) continue;

    found += 1;
    result += separator + snippet;
  }

  return {
    product,
    query,
    found,
    result: result || "No relevant sections found.",
  };
}

function scoreIndexEntry(entry, query) {
  const lowerQuery = query.toLowerCase();
  const haystack = `${entry.title} ${entry.description} ${entry.path} ${entry.section}`.toLowerCase();
  const terms = toQueryTerms(query);

  let score = haystack.includes(lowerQuery) ? 8 : 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += term.length >= 8 ? 3 : 2;
  }

  return score;
}

function findRelevantChunks(text, query) {
  const lowerQuery = query.toLowerCase();
  const queryTerms = toQueryTerms(query);
  const lines = text.split("\n");
  const sections = [];
  let buffer = [];

  for (const line of lines) {
    if (line.startsWith("#") && buffer.length > 0) {
      const chunk = buffer.join("\n").trim();
      const score = scoreChunk(chunk, lowerQuery, queryTerms);
      if (score > 0) sections.push({ score, chunk });
      buffer = [line];
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    const chunk = buffer.join("\n").trim();
    const score = scoreChunk(chunk, lowerQuery, queryTerms);
    if (score > 0) sections.push({ score, chunk });
  }

  if (sections.length > 0) return sections;

  const windows = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].toLowerCase();
    if (!queryTerms.some((term) => line.includes(term))) continue;

    const start = Math.max(0, index - 4);
    const end = Math.min(lines.length, index + 10);
    const chunk = lines.slice(start, end).join("\n").trim();
    if (!chunk) continue;

    windows.push({ score: 1, chunk });
  }

  return windows;
}

function scoreChunk(chunk, lowerQuery, queryTerms) {
  const lowerChunk = chunk.toLowerCase();
  let score = lowerChunk.includes(lowerQuery) ? 10 : 0;

  for (const term of queryTerms) {
    const matches = lowerChunk.match(new RegExp(escapeRegExp(term), "g")) || [];
    score += matches.length * 2;
  }

  return score;
}

function toQueryTerms(query) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => normalizeTerm(term))
    .filter((term) => term && !SEARCH_STOP_WORDS.has(term));

  return [...new Set(terms)];
}

function normalizeTerm(term) {
  if (!term) return "";
  if (term.endsWith("ies") && term.length > 4) return `${term.slice(0, -3)}y`;
  if (term.endsWith("s") && term.length > 3 && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

function looksLikeFilePath(path) {
  return /\.[a-z0-9]+$/i.test(path);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isHtmlResponse(contentType, text) {
  const normalizedType = contentType || "";
  return normalizedType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE html") || text.includes("<html");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
