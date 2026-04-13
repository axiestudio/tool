const CONTEXT7_API_KEY = process.env.CONTEXT7_API_KEY ?? "";
const BASE_URL = "https://context7.com/api/v2";
const CONTEXT7_ORIGINS = new Set(["https://context7.com", "https://www.context7.com"]);

const HEADERS = {
  ...(CONTEXT7_API_KEY ? { Authorization: `Bearer ${CONTEXT7_API_KEY}` } : {}),
  "Content-Type": "application/json",
};

/**
 * Tool definitions — same shape as what the MCP exposes.
 * Pass one of these tool names + args to `invoke()`.
 */
export const tools = [
  {
    name: "resolve-library-id",
    description:
      "Resolves a human-readable library name into a Context7 library ID. " +
      "Always call this first before fetching docs if you don't have the ID.",
    parameters: {
      libraryName: "string — e.g. 'react', 'next.js', 'supabase'",
      query: "string (optional) — extra context to help narrow the match",
    },
  },
  {
    name: "get-library-docs",
    description:
      "Fetches up-to-date documentation snippets for a library. " +
      "Requires a Context7 library ID (e.g. /facebook/react).",
    parameters: {
      libraryId: "string — Context7 library ID from resolve-library-id",
      topic: "string (optional) — focus area, e.g. 'routing', 'hooks'",
      tokens: "number (optional) — max tokens to return (default 5000)",
    },
  },
];

/**
 * invoke(toolName, args) — call a Context7 tool by name.
 *
 * Set CONTEXT7_API_KEY env var to authenticate (free tier works without it).
 *
 * @example
 * const id = await invoke("resolve-library-id", { libraryName: "react" });
 * const docs = await invoke("get-library-docs", { libraryId: id, topic: "hooks" });
 */
export async function invoke(toolName, args = {}) {
  switch (toolName) {
    case "resolve-library-id":
      return resolveLibraryId(args);
    case "get-library-docs":
      return getLibraryDocs(args);
    default:
      throw new Error(`Unknown Context7 tool: "${toolName}"`);
  }
}

export function normalizeContext7LibraryId(value) {
  if (!value) return "";

  const rawValue = String(value).trim();
  if (!rawValue) return "";

  if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
    const url = new URL(rawValue);
    if (!CONTEXT7_ORIGINS.has(url.origin)) return rawValue;
    return normalizeLibraryIdPath(url.pathname);
  }

  if (rawValue.startsWith("/")) {
    return normalizeLibraryIdPath(rawValue);
  }

  if (rawValue.includes("/") && !/\s/.test(rawValue)) {
    return normalizeLibraryIdPath(`/${rawValue}`);
  }

  return rawValue;
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function resolveLibraryId({ libraryName, query }) {
  if (!libraryName) throw new Error("resolveLibraryId requires `libraryName`");

  const directLibraryId = normalizeContext7LibraryId(libraryName);
  if (isContext7LibraryId(directLibraryId)) {
    return directLibraryId;
  }

  const params = new URLSearchParams({ query: query || libraryName, libraryName });
  const res = await fetch(`${BASE_URL}/libs/search?${params}`, { headers: HEADERS });

  if (!res.ok) throw new Error(await parseContext7ErrorResponse("search", res));

  const data = await res.json();
  const libraries = data?.results ?? data?.libraries ?? [];

  if (!libraries.length) throw new Error(`No library found for "${libraryName}"`);

  const top = pickBestContext7Library(libraries, { libraryName, query });
  return top.id ?? top.libraryId ?? top.slug;
}

async function getLibraryDocs({ libraryId, topic, tokens = 5000 }) {
  if (!libraryId) throw new Error("getLibraryDocs requires `libraryId`");

  const normalizedLibraryId = normalizeContext7LibraryId(libraryId);
  if (!isContext7LibraryId(normalizedLibraryId)) {
    throw new Error("getLibraryDocs requires a valid Context7 `libraryId`");
  }

  const params = new URLSearchParams({
    libraryId: normalizedLibraryId,
    ...(topic ? { query: topic } : {}),
    tokens: String(normalizeContext7TokenCount(tokens)),
  });

  const res = await fetch(`${BASE_URL}/context?${params}`, { headers: HEADERS });

  if (!res.ok) throw new Error(await parseContext7ErrorResponse("docs", res));

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return extractContext7DocsText(data);
  }
  return res.text();
}

function normalizeLibraryIdPath(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return pathname;
  return `/${segments.join("/")}`;
}

function isContext7LibraryId(value) {
  return value.startsWith("/") && value.split("/").filter(Boolean).length >= 2;
}

function normalizeContext7TokenCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5000;
  return String(Math.min(50000, Math.max(100, Math.trunc(parsed))));
}

async function parseContext7ErrorResponse(operation, response) {
  try {
    const data = await response.clone().json();
    if (typeof data?.message === "string" && data.message) {
      return `Context7 ${operation} failed: ${data.message}`;
    }
    if (typeof data?.error === "string" && data.error) {
      return `Context7 ${operation} failed: ${data.error}`;
    }
  } catch {}

  if (response.status === 401) {
    return "Context7 request failed: invalid API key. API keys should start with `ctx7sk`.";
  }

  if (response.status === 404) {
    return "Context7 request failed: the requested library could not be found.";
  }

  if (response.status === 429) {
    return CONTEXT7_API_KEY
      ? "Context7 request failed: rate limit or quota exceeded for the current API key."
      : "Context7 request failed: rate limit or quota exceeded. Set `CONTEXT7_API_KEY` for higher limits.";
  }

  return `Context7 ${operation} failed: ${response.status} ${response.statusText}`;
}

function pickBestContext7Library(libraries, { libraryName, query }) {
  const normalizedName = normalizeComparisonValue(libraryName);
  const normalizedDirectId = normalizeContext7LibraryId(libraryName);
  const queryTerms = toSearchTerms(`${libraryName} ${query ?? ""}`);

  return [...libraries]
    .map((library) => ({
      library,
      score: scoreContext7Library(library, { normalizedName, normalizedDirectId, queryTerms }),
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.library)[0];
}

function scoreContext7Library(library, { normalizedName, normalizedDirectId, queryTerms }) {
  const id = normalizeContext7LibraryId(library.id ?? library.libraryId ?? library.slug ?? "");
  const title = normalizeComparisonValue(library.title ?? "");
  const description = normalizeComparisonValue(library.description ?? "");
  const haystack = `${id} ${title} ${description}`;
  let score = 0;

  if (normalizedDirectId && id === normalizedDirectId) score += 200;
  if (title === normalizedName) score += 140;
  if (id.endsWith(`/${normalizedName}`)) score += 100;
  if (id.includes(normalizedName)) score += 60;
  if (title.includes(normalizedName)) score += 45;
  if (description.includes(normalizedName)) score += 20;

  for (const term of queryTerms) {
    if (haystack.includes(term)) score += term.length >= 8 ? 8 : 5;
  }

  score += Number(library.trustScore ?? 0) * 5;
  score += Number(library.benchmarkScore ?? 0) / 10;
  score += Math.min(12, Math.log10(Math.max(1, Number(library.totalSnippets ?? 0) + 1)) * 3);
  score += Math.min(8, Math.log10(Math.max(1, Number(library.stars ?? 0) + 1)) * 2);

  return score;
}

function extractContext7DocsText(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return String(payload ?? "");

  const directText = [payload.data, payload.content, payload.text, payload.markdown]
    .find((value) => typeof value === "string" && value.trim());
  if (directText) return directText;

  const extracted = extractNestedText(payload).join("\n\n").trim();
  return extracted || JSON.stringify(payload, null, 2);
}

function extractNestedText(value) {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractNestedText(item));
  }

  const orderedKeys = ["text", "markdown", "content", "data", "title", "description", "source"];
  const results = [];

  for (const key of orderedKeys) {
    if (key in value) {
      results.push(...extractNestedText(value[key]));
    }
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (orderedKeys.includes(key)) continue;
    results.push(...extractNestedText(nestedValue));
  }

  return [...new Set(results)];
}

function normalizeComparisonValue(value) {
  return String(value)
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/https?:\/\/(www\.)?context7\.com\//g, "")
    .replace(/[^a-z0-9@./-]+/g, " ")
    .trim();
}

function toSearchTerms(value) {
  return [...new Set(
    String(value)
      .toLowerCase()
      .split(/[^a-z0-9@./-]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3),
  )];
}
