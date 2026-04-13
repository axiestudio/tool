/**
 * tools/vercel-docs.js
 *
 * Fetch Vercel platform documentation — no API key required.
 * Vercel exposes docs as Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index   → lists all available Vercel doc pages
 *   - get-page    → fetches a specific doc page as Markdown
 *   - search-docs → searches across all Vercel docs
 */

const BASE = "https://vercel.com";

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
      "Returns a full index of all Vercel documentation pages. " +
      "Use this to discover paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Vercel doc page as clean Markdown. " +
      "Examples: '/docs/getting-started', '/docs/functions/serverless-functions', '/docs/deployments/overview'.",
    parameters: {
      path: "string — doc path, e.g. '/docs/functions/serverless-functions'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Vercel documentation for a keyword or topic. " +
      "Good for questions like 'serverless functions', 'edge middleware', 'environment variables', 'domains'.",
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
 * const { markdown } = await invoke("get-page", { path: "/docs/getting-started" });
 * const { result }   = await invoke("search-docs", { query: "edge middleware" });
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
      throw new Error(`Unknown vercel-docs tool: "${toolName}"`);
  }
}

/**
 * Normalize a Vercel doc path:
 *  - Strips https://vercel.com prefix
 *  - Ensures leading /
 *  - Removes /index.md suffix
 *  - Removes .md extension
 */
export function normalizeVercelDocPath(raw) {
  if (!raw) return "";

  let normalized = raw;

  // Strip base URL if present
  if (normalized.startsWith(BASE)) {
    normalized = normalized.slice(BASE.length);
  }

  // Ensure leading slash
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  // Remove /index.md suffix
  normalized = normalized.replace(/\/index\.md$/i, "");

  // Remove .md extension
  normalized = normalized.replace(/\.md$/i, "");

  return normalized;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  let res;
  try {
    res = await fetch(`${BASE}/llms.txt`);
  } catch (err) {
    throw new Error(`Network error fetching Vercel index: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Vercel docs index not found (404). The site may have changed its structure."
        : `Failed to fetch Vercel llms.txt: ${res.status}`,
    );
  }
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeVercelDocPath(path);

  const res = await fetch(`${BASE}${cleanPath}`, {
    headers: { Accept: "text/markdown" },
  });

  if (!res.ok) {
    throw new Error(`Vercel page not found: ${path}`);
  }

  const markdown = await res.text();
  return { path: cleanPath, markdown };
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  let res;
  try {
    res = await fetch(`${BASE}/llms-full.txt`);
  } catch (err) {
    throw new Error(`Network error loading Vercel docs: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Vercel full docs not found (404). The site may have changed its structure."
        : `Could not load Vercel docs: ${res.status}`,
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

  // Exact full-query match gets a big boost
  let score = lowerChunk.includes(lowerQuery) ? 10 : 0;

  // Score individual terms
  let distinctMatches = 0;
  for (const term of queryTerms) {
    const matches = lowerChunk.match(new RegExp(escapeRegExp(term), "g")) || [];
    if (matches.length > 0) {
      distinctMatches += 1;
      score += matches.length * 2;
    }
  }

  // Multi-term scoring bonus
  if (queryTerms.length > 1 && distinctMatches > 1) {
    score += distinctMatches * 3;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
