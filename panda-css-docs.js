/**
 * tools/panda-css-docs.js
 *
 * Fetch Panda CSS documentation — no API key required.
 * Panda CSS exposes docs as Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index   → lists all available Panda CSS doc pages
 *   - get-page    → fetches a specific doc page as Markdown
 *   - search-docs → searches across all Panda CSS docs
 */

const BASE = "https://panda-css.com";

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
      "Returns a full index of all Panda CSS documentation pages. " +
      "Use this to discover paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Panda CSS doc page as clean Markdown. " +
      "Examples: '/docs/concepts/writing-styles', '/docs/installation/astro'.",
    parameters: {
      path: "string — doc path, e.g. '/docs/concepts/writing-styles'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Panda CSS documentation for a keyword or topic. " +
      "Good for questions like 'recipes', 'tokens', 'responsive design', 'css function'.",
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
 * const { markdown } = await invoke("get-page", { path: "/docs/concepts/writing-styles" });
 * const { result }   = await invoke("search-docs", { query: "recipes" });
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
      throw new Error(`Unknown panda-css-docs tool: "${toolName}"`);
  }
}

/**
 * Normalize a Panda CSS doc path:
 *  - Strips https://panda-css.com prefix
 *  - Ensures leading /
 *  - Removes /index.md suffix
 *  - Removes .md suffix
 */
export function normalizePandaCssDocPath(path) {
  if (!path) return "";

  let normalized = path;

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch {
      normalized = normalized.replace(/^https?:\/\/[^/]+/, "");
    }
  }

  normalized = normalized.split(/[?#]/)[0];

  normalized = normalized.replace(/\/index\.md$/i, "");
  normalized = normalized.replace(/\.md$/i, "");

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  let res;
  try {
    res = await fetch(`${BASE}/llms.txt`);
  } catch (err) {
    throw new Error(`Network error fetching Panda CSS index: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Panda CSS docs index not found (404). The site may have changed its structure."
        : `Failed to fetch Panda CSS llms.txt: ${res.status}`,
    );
  }
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizePandaCssDocPath(path);

  for (const candidateUrl of getPageCandidates(cleanPath)) {
    let res;
    try {
      res = await fetch(candidateUrl, {
        headers: { Accept: "text/markdown" },
      });
    } catch {
      continue;
    }

    if (!res.ok) continue;

    const text = await res.text();
    if (isHtmlResponse(res.headers.get("content-type"), text)) continue;

    return { path: cleanPath, markdown: text };
  }

  throw new Error(`Panda CSS page not found: ${path}. Check the path or use get-index to discover available pages.`);
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  let res;
  try {
    res = await fetch(`${BASE}/llms-full.txt`);
  } catch (err) {
    throw new Error(`Network error loading Panda CSS docs: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Panda CSS full docs archive not found (404). The site may have changed its structure."
        : `Could not load Panda CSS full docs: ${res.status}`,
    );
  }

  const fullText = await res.text();
  const lowerQuery = query.toLowerCase();
  const queryTerms = toQueryTerms(query);
  const sections = splitSections(fullText);

  const scored = [];
  for (const chunk of sections) {
    const score = scoreChunk(chunk, lowerQuery, queryTerms);
    if (score > 0) scored.push({ score, chunk });
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  let result = "";

  for (const { chunk } of scored) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageCandidates(cleanPath) {
  const candidates = [
    `${BASE}${cleanPath}`,
    `${BASE}${cleanPath}.md`,
    `${BASE}${cleanPath}/index.md`,
  ];
  return [...new Set(candidates)];
}

function splitSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let buffer = [];

  for (const line of lines) {
    const isBoundary = line.startsWith("#") || /^---+\s*$/.test(line);
    if (isBoundary && buffer.length > 0) {
      const chunk = buffer.join("\n").trim();
      if (chunk) sections.push(chunk);
      buffer = /^---+\s*$/.test(line) ? [] : [line];
      continue;
    }
    buffer.push(line);
  }

  if (buffer.length > 0) {
    const chunk = buffer.join("\n").trim();
    if (chunk) sections.push(chunk);
  }

  return sections;
}

function scoreChunk(chunk, lowerQuery, queryTerms) {
  const lowerChunk = chunk.toLowerCase();
  const isHeading = chunk.startsWith("#");

  let score = lowerChunk.includes(lowerQuery) ? 10 : 0;

  let distinctMatches = 0;
  for (const term of queryTerms) {
    const matches = lowerChunk.match(new RegExp(escapeRegExp(term), "g")) || [];
    if (matches.length > 0) {
      distinctMatches += 1;
      score += matches.length * 2;
    }
  }

  if (queryTerms.length > 1 && distinctMatches > 1) {
    score += distinctMatches * 3;
  }

  if (isHeading && score > 0) {
    score *= 1.5;
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
