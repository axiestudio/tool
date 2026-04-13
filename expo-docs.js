/**
 * tools/expo-docs.js
 *
 * Fetch Expo React Native framework documentation — no API key required.
 * Expo exposes docs as Markdown via llms.txt endpoints.
 *
 * Tools:
 *   - get-index   → lists all available Expo doc pages
 *   - get-page    → fetches a specific doc page as Markdown
 *   - search-docs → searches across all Expo docs
 */

const BASE = "https://docs.expo.dev";

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "of", "to", "for", "and", "or", "is", "it",
  "on", "at", "by", "with", "as", "be", "was", "are", "from", "that",
  "this", "has", "have", "had", "but", "not", "do", "does", "did",
  "will", "can", "its", "my", "your", "how", "what", "which", "when",
]);

export const tools = [
  {
    name: "get-index",
    description:
      "Returns a full index of all Expo documentation pages. " +
      "Use this to discover paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Expo doc page as clean Markdown. " +
      "Examples: '/guides/routing', '/develop/development-builds/introduction', '/deploy/submit-to-app-stores'.",
    parameters: {
      path: "string — doc path, e.g. '/guides/routing'",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches all Expo documentation for a keyword or topic. " +
      "Good for questions like 'push notifications', 'EAS build', 'expo router', 'camera permissions'.",
    parameters: {
      query:    "string — what you're looking for",
      maxChars: "number (optional) — max characters to return (default 8000)",
    },
  },
];

/**
 * Normalizes an Expo doc path:
 * - Strips https://docs.expo.dev prefix
 * - Ensures leading /
 * - Removes /index.md suffix
 * - Removes .md extension
 */
export function normalizeExpoDocPath(input) {
  if (!input) return "/";
  let p = input;

  // Strip absolute URL prefix
  if (p.startsWith(BASE)) {
    p = p.slice(BASE.length);
  } else {
    try {
      const url = new URL(p);
      if (url.hostname === "docs.expo.dev") {
        p = url.pathname;
      }
    } catch {
      // Not a full URL — strip query/hash manually
      p = p.split("?")[0].split("#")[0];
    }
  }

  // Ensure leading slash
  if (!p.startsWith("/")) p = `/${p}`;

  // Strip /index.md suffix
  p = p.replace(/\/index\.md$/, "");

  // Strip .md extension
  p = p.replace(/\.md$/, "");

  return p;
}

/**
 * invoke(toolName, args)
 *
 * @example
 * const { index }    = await invoke("get-index");
 * const { markdown } = await invoke("get-page", { path: "/guides/routing" });
 * const { result }   = await invoke("search-docs", { query: "push notifications" });
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
      throw new Error(`Unknown expo-docs tool: "${toolName}". Available tools: get-index, get-page, search-docs.`);
  }
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function getIndex() {
  const res = await fetch(`${BASE}/llms.txt`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Expo docs index (${res.status}). ` +
      `The Expo docs site may be temporarily unavailable.`,
    );
  }
  const index = await res.text();
  return { index };
}

async function getPage({ path }) {
  if (!path) throw new Error("get-page requires a `path` argument, e.g. '/guides/routing'.");

  const cleanPath = normalizeExpoDocPath(path);

  const candidates = [
    `${BASE}${cleanPath}`,
  ];

  const uniqueCandidates = [...new Set(candidates)];

  for (const url of uniqueCandidates) {
    const res = await fetch(url, { headers: { Accept: "text/markdown" } });
    if (res.ok) {
      return { path: cleanPath, markdown: await res.text() };
    }
  }

  throw new Error(
    `Expo page not found: "${path}" (normalized: "${cleanPath}"). ` +
    `Try invoke("get-index") to discover available paths.`,
  );
}

/**
 * Splits query into meaningful terms, filtering out stop words.
 * Returns lowercase terms.
 */
function extractSearchTerms(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !STOP_WORDS.has(w));
  return meaningful.length > 0 ? meaningful : words;
}

/**
 * Scores a text chunk against search terms.
 * Returns { termHits, totalHits, allMatch, headingBoost }
 */
function scoreChunk(chunkLower, terms) {
  let termHits = 0;
  let totalHits = 0;

  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = chunkLower.match(new RegExp(escaped, "g"));
    if (matches) {
      termHits++;
      totalHits += matches.length;
    }
  }

  const allMatch = termHits === terms.length;

  // Heading boost: if a term appears in a heading line, add extra score
  let headingBoost = 0;
  const headingLines = chunkLower.split("\n").filter((l) => l.startsWith("#"));
  for (const heading of headingLines) {
    for (const term of terms) {
      if (heading.includes(term)) headingBoost += 2;
    }
  }

  return { termHits, totalHits, allMatch, headingBoost };
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires a `query` argument, e.g. 'push notifications'.");

  const res = await fetch(`${BASE}/llms-full.txt`);
  if (!res.ok) {
    throw new Error(
      `Could not load Expo full docs (${res.status}). ` +
      `The Expo docs site may be temporarily unavailable.`,
    );
  }

  const fullText = await res.text();
  const terms = extractSearchTerms(query);
  const lines = fullText.split("\n");

  const scored = [];
  let buffer = [];

  for (const line of lines) {
    const isBoundary =
      (line.startsWith("#") || line.trim() === "---") && buffer.length > 1;

    if (isBoundary) {
      flushBuffer(buffer, terms, scored);
      buffer = line.trim() === "---" ? [] : [line];
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    flushBuffer(buffer, terms, scored);
  }

  // Sort: all-terms-match first, then by distinct term count, heading boost, then total hits
  scored.sort((a, b) => {
    if (a.allMatch !== b.allMatch) return a.allMatch ? -1 : 1;
    if (a.termHits !== b.termHits) return b.termHits - a.termHits;
    if (a.headingBoost !== b.headingBoost) return b.headingBoost - a.headingBoost;
    return b.totalHits - a.totalHits;
  });

  let result = "";
  for (const { chunk } of scored) {
    if (result.length + chunk.length > maxChars) break;
    result += chunk + "\n\n---\n\n";
  }

  return {
    query,
    found: scored.length,
    result: result || "No relevant sections found for your query. Try broader terms or invoke('get-index') to browse available pages.",
  };
}

function flushBuffer(buffer, terms, scored) {
  const chunk = buffer.join("\n");
  const chunkLower = chunk.toLowerCase();
  const { termHits, totalHits, allMatch, headingBoost } = scoreChunk(chunkLower, terms);
  if (termHits > 0) {
    scored.push({ termHits, totalHits, allMatch, headingBoost, chunk });
  }
}
