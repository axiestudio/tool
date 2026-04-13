/**
 * tools/tanstack-docs.js
 *
 * Fetch TanStack documentation — no API key required.
 * TanStack exposes a docs index via llms.txt.
 * Covers Query, Router, Table, Form, Virtual, Store, Start, and Config.
 *
 * Tools:
 *   - get-index    → lists all available TanStack doc pages
 *   - get-page     → fetches a specific doc page as Markdown
 *   - search-docs  → searches across all TanStack docs
 */

const BASE = "https://tanstack.com";

export const tools = [
  {
    name: "get-index",
    description:
      "Returns a full index of all TanStack documentation pages. " +
      "Use this to discover page paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific TanStack doc page as clean Markdown. " +
      "Use a path like '/query/latest/docs/overview' or '/router/latest/docs/framework/react/quick-start'.",
    parameters: {
      path: "string — doc path, e.g. '/query/latest/docs/overview'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all TanStack documentation for a keyword or topic. " +
      "Good for questions like 'useQuery hooks', 'table column defs', or 'form validation'.",
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
 * const { markdown } = await invoke("get-page", { path: "/query/latest/docs/overview" });
 * const { result }   = await invoke("search-docs", { query: "useQuery" });
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
      throw new Error(`Unknown tanstack-docs tool: "${toolName}"`);
  }
}

/**
 * Normalize a TanStack doc path:
 *  - Strips absolute https://tanstack.com prefix
 *  - Removes .md suffix
 *  - Ensures leading /
 */
export function normalizeTanstackDocPath(path) {
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
    throw new Error(`Network error fetching TanStack index: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "TanStack docs index not found (404). The site may have changed its structure."
        : `Failed to fetch TanStack llms.txt: ${res.status}`,
    );
  }
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires `path`");

  const cleanPath = normalizeTanstackDocPath(path);

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

  throw new Error(`TanStack page not found: ${path}. Check the path or use get-index to discover available pages.`);
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  let res;
  try {
    res = await fetch(`${BASE}/llms.txt`);
  } catch (err) {
    throw new Error(`Network error loading TanStack docs: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "TanStack docs index not found (404). The site may have changed its structure."
        : `Could not load TanStack docs index: ${res.status}`,
    );
  }

  const fullText = await res.text();
  const scored = [];

  for (const match of findRelevantChunks(fullText, query)) {
    scored.push(match);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageCandidates(cleanPath) {
  return [
    `${BASE}${cleanPath}`,
    `${BASE}${cleanPath}.md`,
    `${BASE}${cleanPath}/index.md`,
  ];
}

function findRelevantChunks(text, query) {
  const lowerQuery = query.toLowerCase();
  const escapedQuery = lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escapedQuery, "g");
  const lines = text.split("\n");
  const sections = [];
  let buffer = [];

  for (const line of lines) {
    if (line.startsWith("#") && buffer.length > 0) {
      const chunk = buffer.join("\n");
      const score = (chunk.toLowerCase().match(pattern) || []).length;
      if (score > 0) sections.push({ score: score * 3, chunk: chunk.trim() });
      buffer = [line];
    } else {
      buffer.push(line);
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
