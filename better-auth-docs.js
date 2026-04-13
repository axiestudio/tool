/**
 * tools/better-auth-docs.js
 *
 * Fetch Better Auth documentation — no API key required.
 * Better Auth exposes docs as Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index   → lists all available Better Auth doc pages
 *   - get-page    → fetches a specific doc page as Markdown
 *   - search-docs → searches across all Better Auth docs
 */

const BASE = "https://www.better-auth.com";
const INDEX_LINK_PATTERN = /\[([^\]]+)\]\((\/llms\.txt\/docs\/[^)]+\.md)\):\s*([^\n]+)/g;
const SEARCH_PAGE_LIMIT = 6;
const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "how",
  "i",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

export const tools = [
  {
    name: "get-index",
    description:
      "Returns a full index of all Better Auth documentation pages. " +
      "Use this to discover paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Better Auth doc page as clean Markdown. " +
      "Examples: '/docs/installation', '/docs/plugins/stripe', '/docs/plugins/sso', '/docs/plugins/scim'.",
    parameters: {
      path: "string — doc path, e.g. '/docs/concepts/session-management'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Better Auth documentation for a keyword or topic. " +
      "Good for questions about sessions, plugins, SSO, SCIM, organization, Stripe billing.",
    parameters: {
      query:    "string — what you're looking for",
      maxChars: "number (optional) — max characters to return (default 8000)",
    },
  },
];

/**
 * invoke(toolName, args)
 *
 * @example
 * const { index }    = await invoke("get-index");
 * const { markdown } = await invoke("get-page", { path: "/docs/plugins/organization" });
 * const { result }   = await invoke("search-docs", { query: "session enrichment" });
 */
export async function invoke(toolName, args = {}) {
  switch (toolName) {
    case "get-index":
      return getIndex();
    case "get-page":
      return getPage(args);
    case "search-docs":
      return searchDocs(args);
    default:
      throw new Error(`Unknown better-auth-docs tool: "${toolName}"`);
  }
}

export function normalizeBetterAuthDocPath(path) {
  if (!path) return "";

  let normalized = path.startsWith("/") ? path : `/${path}`;

  if (normalized.startsWith("/llms.txt/docs/")) {
    normalized = normalized.replace(/^\/llms\.txt/, "");
  }

  normalized = normalized.replace(/\/index\.md$/i, "");
  normalized = normalized.replace(/\.md$/i, "");

  if (normalized.endsWith("/") && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  const res = await fetch(`${BASE}/llms.txt`);
  if (!res.ok) throw new Error(`Failed to fetch Better Auth llms.txt: ${res.status}`);
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeBetterAuthDocPath(path);

  for (const candidatePath of getPageCandidates(cleanPath)) {
    const response = await fetch(`${BASE}${candidatePath}`, {
      headers: { Accept: "text/markdown" },
    });

    if (!response.ok) continue;

    const markdown = await response.text();
    if (isHtmlResponse(response.headers.get("content-type"), markdown)) continue;

    return { path: cleanPath, markdown };
  }

  throw new Error(`Better Auth page not found: ${path}`);
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  const { index } = await getIndex();
  const entries = parseBetterAuthIndex(index);
  const candidates = entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, SEARCH_PAGE_LIMIT);

  if (candidates.length === 0) {
    return {
      query,
      found: 0,
      result: "No relevant sections found.",
    };
  }

  const pages = await Promise.all(candidates.map(async ({ entry, score }) => ({
    entry,
    score,
    markdown: await fetchMarkdownPage(entry.markdownPath),
  })));

  const matches = [];

  for (const page of pages) {
    if (!page.markdown) continue;

    for (const match of findRelevantChunks(page.markdown, query)) {
      matches.push({
        score: page.score + match.score,
        chunk: `Source: ${page.entry.docPath}\n\n${match.chunk}`,
      });
    }
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
    query,
    found: seen.size,
    result: result || "No relevant sections found.",
  };
}

function getPageCandidates(cleanPath) {
  return [toBetterAuthMarkdownPath(cleanPath), cleanPath];
}

function toBetterAuthMarkdownPath(cleanPath) {
  return cleanPath.startsWith("/docs/")
    ? `/llms.txt${cleanPath}.md`
    : `${cleanPath}.md`;
}

function parseBetterAuthIndex(index) {
  const entries = new Map();

  for (const match of index.matchAll(INDEX_LINK_PATTERN)) {
    const title = match[1].trim();
    const markdownPath = match[2].trim();
    const description = match[3].trim();
    const docPath = normalizeBetterAuthDocPath(markdownPath);

    entries.set(markdownPath, {
      title,
      description,
      markdownPath,
      docPath,
    });
  }

  return [...entries.values()];
}

function scoreEntry(entry, query) {
  const lowerQuery = query.toLowerCase();
  const haystack = `${entry.title} ${entry.description} ${entry.docPath}`.toLowerCase();
  const terms = toQueryTerms(query);

  let score = haystack.includes(lowerQuery) ? 8 : 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += term.length >= 8 ? 3 : 2;
  }

  return score;
}

async function fetchMarkdownPage(path) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Accept: "text/markdown" },
  });

  if (!response.ok) return "";

  const markdown = await response.text();
  return isHtmlResponse(response.headers.get("content-type"), markdown) ? "" : markdown;
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

    windows.push({
      score: 1,
      chunk,
    });
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

function isHtmlResponse(contentType, text) {
  const normalizedType = contentType || "";
  return normalizedType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE html") || text.includes("<html");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
