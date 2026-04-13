/**
 * tools/astro-docs.js
 *
 * Fetch Astro framework documentation — no API key required.
 * Astro exposes all docs as clean Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index    → lists all available Astro doc pages
 *   - get-page     → fetches a specific doc page as Markdown
 *   - search-docs  → searches across all Astro docs
 */

const BASE = "https://docs.astro.build";

const ASTRO_PATH_ALIASES = new Map([
  ["/en/guides/integrations-guide/", "/en/guides/integrations/"],
]);

const ASTRO_SEARCH_SOURCES = [
  { name: "full-docs", url: `${BASE}/llms-full.txt` },
  { name: "api-reference", url: `${BASE}/_llms-txt/api-reference.txt` },
  { name: "how-to-recipes", url: `${BASE}/_llms-txt/how-to-recipes.txt` },
  { name: "deployment-guides", url: `${BASE}/_llms-txt/deployment-guides.txt` },
  { name: "cms-guides", url: `${BASE}/_llms-txt/cms-guides.txt` },
  { name: "backend-services", url: `${BASE}/_llms-txt/backend-services.txt` },
  { name: "migration-guides", url: `${BASE}/_llms-txt/migration-guides.txt` },
  { name: "additional-guides", url: `${BASE}/_llms-txt/additional-guides.txt` },
  { name: "build-a-blog-tutorial", url: `${BASE}/_llms-txt/build-a-blog-tutorial.txt` },
];

export const tools = [
  {
    name: "get-index",
    description:
      "Returns a full index of all Astro documentation pages. " +
      "Use this to discover page paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Astro doc page as clean Markdown. " +
      "Use a path like '/en/guides/integrations-guide/' or '/en/reference/configuration-reference/'.",
    parameters: {
      path: "string — doc path, e.g. '/en/guides/server-side-rendering/'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Astro documentation for a keyword or topic. " +
      "Good for questions like 'how does middleware work' or 'astro actions'.",
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
 * const { markdown } = await invoke("get-page", { path: "/en/guides/middleware/" });
 * const { result }   = await invoke("search-docs", { query: "server islands" });
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
      throw new Error(`Unknown astro-docs tool: "${toolName}"`);
  }
}

export function normalizeAstroDocPath(path) {
  let normalized = path.startsWith("/") ? path : `/${path}`;
  normalized = normalized.replace(/\/index\.md$/i, "/");
  normalized = normalized.replace(/\.md$/i, "");

  if (!/[?#]$/.test(normalized) && !normalized.endsWith("/")) {
    normalized += "/";
  }

  return ASTRO_PATH_ALIASES.get(normalized) ?? normalized;
}

export function extractAstroMarkdownFromHtml(html, path = "") {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return "";

  let content = mainMatch[1];

  content = content
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<a\b[^>]*class="[^"]*sl-anchor-link[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<span\b[^>]*class="[^"]*sr-only[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<button\b[\s\S]*?<\/button>/gi, "");

  content = content.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (_, attrs = "", inner = "") => {
    const lang = attrs.match(/data-language="([^"]+)"/i)?.[1] ?? "text";
    let code = inner
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>\s*<div\b[^>]*>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<div\b[^>]*>/gi, "")
      .replace(/<span\b[^>]*>/gi, "")
      .replace(/<\/span>/gi, "")
      .replace(/<code\b[^>]*>/gi, "")
      .replace(/<\/code>/gi, "")
      .replace(/<[^>]+>/g, "");

    code = decodeHtmlEntities(code)
      .replace(/\n{3,}/g, "\n\n")
      .trim();

      return `\n\n@@ASTRO_CODE:${lang}@@\n${code}\n@@ASTRO_END_CODE@@\n\n`;
  });

  content = content
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = stripTags(decodeHtmlEntities(text)).trim();
      return label ? `[${label}](${href})` : href;
    })
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, (_, text) => `**${stripTags(decodeHtmlEntities(text)).trim()}**`)
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_, text) => `*${stripTags(decodeHtmlEntities(text)).trim()}*`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, text) => `\`${stripTags(decodeHtmlEntities(text)).trim()}\``)
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n\n# ${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n\n## ${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n\n### ${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n\n#### ${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `\n\n##### ${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `\n\n###### ${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${stripTags(decodeHtmlEntities(text)).trim()}`)
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n\n${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<div\b[^>]*class="[^"]*sl-heading-wrapper[^"]*"[^>]*>/gi, "")
    .replace(/<\/?(div|section|article|main)\b[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  content = decodeHtmlEntities(content)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

    content = content.replace(/@@ASTRO_CODE:([^@]+)@@\n([\s\S]*?)\n@@ASTRO_END_CODE@@/g, (_, lang, code) => `\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`);

  if (!content.startsWith("# ")) {
    const title = path ? path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") : "Astro docs";
    content = `# ${title ? toTitleCase(title) : "Astro docs"}\n\n${content}`;
  }

  return content.replace(/\n{3,}/g, "\n\n").trim();
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  const res = await fetch(`${BASE}/llms.txt`);
  if (!res.ok) throw new Error(`Failed to fetch Astro llms.txt: ${res.status}`);
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeAstroDocPath(path);
  const mdPath = cleanPath.endsWith("/")
    ? `${cleanPath}index.md`
    : `${cleanPath}.md`;

  let htmlFallback = "";

  for (const url of [`${BASE}${mdPath}`, `${BASE}${cleanPath}`]) {
    const res = await fetch(url, {
      headers: { Accept: "text/markdown" },
    });

    if (!res.ok) continue;

    const text = await res.text();
    if (!isHtmlResponse(res.headers.get("content-type"), text)) {
      return { path: cleanPath, markdown: text };
    }

    htmlFallback = text;
  }

  if (htmlFallback) {
    const markdown = extractAstroMarkdownFromHtml(htmlFallback, cleanPath);
    if (markdown) return { path: cleanPath, markdown };
  }

  throw new Error(`Astro page not found: ${path}`);
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  const relevantSources = selectSearchSources(query);
  const scored = [];

  for (const source of relevantSources) {
    const res = await fetch(source.url);
    if (!res.ok) continue;

    const text = await res.text();
    for (const match of findRelevantChunks(text, query)) {
      scored.push({
        score: match.score,
        chunk: source.name === "full-docs" ? match.chunk : `Source: ${source.name}\n\n${match.chunk}`,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  let result = "";
  for (const { chunk } of scored) {
    const normalized = chunk.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const separator = result.length > 0 ? "\n\n---\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;

    const snippet = normalized.length > remaining
      ? normalized.slice(0, Math.max(0, remaining - 3)).trimEnd() + "..."
      : normalized;

    if (!snippet.trim()) continue;
    result += separator + snippet;

    if (snippet.length < normalized.length) break;
  }

  return {
    query,
    found: seen.size,
    result: result || "No relevant sections found.",
  };
}

function selectSearchSources(query) {
  const lowerQuery = query.toLowerCase();
  const selected = new Set(["full-docs", "api-reference", "additional-guides"]);

  if (/(deploy|adapter|cloudflare|ssr|server output|on-demand)/.test(lowerQuery)) {
    selected.add("deployment-guides");
  }

  if (/(cms|contentful|sanity|blog|docs pattern|documentation)/.test(lowerQuery)) {
    selected.add("cms-guides");
    selected.add("build-a-blog-tutorial");
  }

  if (/(recipe|form|docker|image|bun)/.test(lowerQuery)) {
    selected.add("how-to-recipes");
  }

  if (/(backend|supabase|firebase|sentry|auth)/.test(lowerQuery)) {
    selected.add("backend-services");
  }

  if (/(migrate|migration)/.test(lowerQuery)) {
    selected.add("migration-guides");
  }

  return ASTRO_SEARCH_SOURCES.filter((source) => selected.has(source.name));
}

function findRelevantChunks(text, query) {
  const lowerQuery = query.toLowerCase();
  const escapedQuery = lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escapedQuery, "g");
  const lines = text.split("\n");
  const sections = [];
  let buffer = [];

  for (const line of lines) {
    buffer.push(line);
    if (line.startsWith("#") && buffer.length > 1) {
      const chunk = buffer.join("\n");
      const score = (chunk.toLowerCase().match(pattern) || []).length;
      if (score > 0) sections.push({ score: score * 3, chunk: chunk.trim() });
      buffer = [line];
    }
  }

  if (buffer.length > 0) {
    const chunk = buffer.join("\n");
    const score = (chunk.toLowerCase().match(pattern) || []).length;
    if (score > 0) sections.push({ score: score * 3, chunk: chunk.trim() });
  }

  if (sections.length > 0) return sections;

  const windows = [];
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].toLowerCase().includes(lowerQuery)) continue;
    const start = Math.max(0, index - 6);
    const end = Math.min(lines.length, index + 18);
    const chunk = lines.slice(start, end).join("\n").trim();
    if (chunk) windows.push({ score: 1, chunk });
  }

  return windows;
}

function isHtmlResponse(contentType, text) {
  return (contentType || "").includes("text/html") || text.trimStart().startsWith("<!DOCTYPE html") || text.includes("<html");
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function toTitleCase(value) {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
