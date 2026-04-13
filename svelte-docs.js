/**
 * tools/svelte-docs.js
 *
 * Fetch Svelte UI framework and SvelteKit documentation — no API key required.
 * Svelte exposes all docs as clean Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index    → lists all available Svelte doc pages
 *   - get-page     → fetches a specific doc page as Markdown
 *   - search-docs  → searches across all Svelte docs
 */

const BASE = "https://svelte.dev";

export const tools = [
  {
    name: "get-index",
    description:
      "Returns a full index of all Svelte documentation pages. " +
      "Use this to discover page paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Svelte doc page as clean Markdown. " +
      "Use a path like '/docs/svelte/overview' or '/docs/kit/introduction'.",
    parameters: {
      path: "string — doc path, e.g. '/docs/svelte/reactivity'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Svelte documentation for a keyword or topic. " +
      "Good for questions like 'how does reactivity work' or 'sveltekit routing'.",
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
 * const { markdown } = await invoke("get-page", { path: "/docs/svelte/overview" });
 * const { result }   = await invoke("search-docs", { query: "reactivity" });
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
      throw new Error(`Unknown svelte-docs tool: "${toolName}"`);
  }
}

export function normalizeSvelteDocPath(raw) {
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
  normalized = normalized.replace(/\/index\.md$/i, "/");

  // Remove .md extension
  normalized = normalized.replace(/\.md$/i, "");

  return normalized;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  const res = await fetch(`${BASE}/llms.txt`);
  if (!res.ok) throw new Error(`Failed to fetch Svelte llms.txt: ${res.status}`);
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeSvelteDocPath(path);

  const res = await fetch(`${BASE}${cleanPath}`, {
    headers: { Accept: "text/markdown" },
  });

  if (!res.ok) {
    throw new Error(`Svelte page not found: ${path}`);
  }

  const markdown = await res.text();
  return { path: cleanPath, markdown };
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  const res = await fetch(`${BASE}/llms-full.txt`);
  if (!res.ok) throw new Error(`Failed to fetch Svelte full docs: ${res.status}`);

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

  return {
    query,
    found: seen.size,
    result: result || "No relevant sections found.",
  };
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
