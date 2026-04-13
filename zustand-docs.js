/**
 * tools/zustand-docs.js
 *
 * Fetch Zustand state management library documentation — no API key required.
 * Zustand exposes docs as Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index   → lists all available Zustand doc pages
 *   - get-page    → fetches a specific doc page as Markdown
 *   - search-docs → searches across all Zustand docs
 */

const BASE = "https://zustand.docs.pmnd.rs";

export const tools = [
  {
    name: "get-index",
    description:
      "Returns a full index of all Zustand documentation pages. " +
      "Use this to discover page paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Zustand doc page as clean Markdown. " +
      "Examples: '/getting-started/introduction', '/guides/updating-state', '/recipes/recipes'.",
    parameters: {
      path: "string — doc path, e.g. '/guides/updating-state'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Zustand documentation for a keyword or topic. " +
      "Good for questions like 'selectors', 'middleware', 'persist', 'immer', 'devtools'.",
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
 * const { markdown } = await invoke("get-page", { path: "/guides/updating-state" });
 * const { result }   = await invoke("search-docs", { query: "persist middleware" });
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
      throw new Error(`Unknown zustand-docs tool: "${toolName}"`);
  }
}

/**
 * Normalize a Zustand doc path:
 *  - Strips the base URL prefix
 *  - Ensures leading /
 *  - Removes /index.md suffix
 *  - Removes .md extension
 */
export function normalizeZustandDocPath(raw) {
  if (!raw) return "";

  let normalized = raw;

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch {
      normalized = normalized.replace(/^https?:\/\/[^/]+/, "");
    }
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/index\.md$/i, "/");
  normalized = normalized.replace(/\.md$/i, "");

  return normalized;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  const res = await fetch(`${BASE}/llms.txt`);
  if (!res.ok) throw new Error(`Failed to fetch Zustand llms.txt: ${res.status}`);
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeZustandDocPath(path);
  const res = await fetch(`${BASE}${cleanPath}`, {
    headers: { Accept: "text/markdown" },
  });

  if (!res.ok) {
    throw new Error(`Zustand page not found: ${path} (${res.status}). Use get-index to discover available pages.`);
  }

  const markdown = await res.text();
  return { path: cleanPath, markdown };
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");
  const res = await fetch(`${BASE}/llms-full.txt`);
  if (!res.ok) throw new Error(`Failed to fetch full docs: ${res.status}`);
  const text = await res.text();
  const scored = findRelevantChunks(text, query);
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
  return { query, found: seen.size, result: result || "No relevant sections found." };
}

function findRelevantChunks(text, query) {
  const stopWords = new Set(["the","a","an","is","are","was","were","be","been","in","on","at","to","for","of","and","or","not","with","how","do","does","what","this","that","it"]);
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t));
  const lines = text.split("\n");
  const sections = [];
  let buffer = [];
  for (const line of lines) {
    if ((line.startsWith("#") || /^---+$/.test(line.trim())) && buffer.length > 1) {
      sections.push(buffer.join("\n"));
      buffer = [];
    }
    buffer.push(line);
  }
  if (buffer.length > 0) sections.push(buffer.join("\n"));

  return sections.map(chunk => {
    const lower = chunk.toLowerCase();
    let score = 0;
    const matchedTerms = new Set();
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = lower.match(new RegExp(escaped, "g"));
      if (matches) { score += matches.length; matchedTerms.add(term); }
    }
    if (matchedTerms.size > 1) score *= 1 + (matchedTerms.size * 0.3);
    if (/^#{1,3}\s/.test(chunk)) score *= 1.5;
    return { score, chunk: chunk.trim() };
  }).filter(s => s.score > 0);
}
