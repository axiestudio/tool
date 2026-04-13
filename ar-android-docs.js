/**
 * tools/ar-android-docs.js
 *
 * Fetch Google ARCore Scene Viewer documentation from developers.google.com.
 *
 * Tools:
 *   - get-index    -> lists the main official Android AR documentation paths
 *   - get-page     -> fetches a specific Google documentation page as Markdown
 *   - search-docs  -> searches the official Scene Viewer documentation set
 */

const BASE = "https://developers.google.com";
const DEFAULT_PATH = "/ar/develop/scene-viewer";
const INDEX_PAGES = [
  {
    path: "/ar/develop/scene-viewer",
    description: "Scene Viewer guide: runtime requirements, explicit intents, AR-only launch, model-viewer integration, file limits, and validation.",
  },
  {
    path: "/ar/develop/runtime",
    description: "Runtime considerations for ARCore experiences on Android devices.",
  },
  {
    path: "/ar/develop/performance",
    description: "Performance considerations and asset/runtime constraints for AR experiences.",
  },
  {
    path: "/ar/develop/webxr/model-viewer",
    description: "Google's model-viewer integration guidance for launching Scene Viewer from the web.",
  },
  {
    path: "/ar/discover/supported-devices",
    description: "ARCore-supported Android devices.",
  },
  {
    path: "/ar/develop/privacy-requirements",
    description: "User privacy requirements relevant to ARCore apps and experiences.",
  },
];

export const tools = [
  {
    name: "get-index",
    description:
      "Returns an index of official Google Android AR documentation pages. " +
      "Use this to discover paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Google Scene Viewer or ARCore documentation page as Markdown. " +
      "Use paths like '/ar/develop/scene-viewer' or '/ar/develop/runtime'.",
    parameters: {
      path: "string - documentation path or full developers.google.com URL",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches official Android AR documentation for a keyword or topic. " +
      "Good for questions like 'ar_only intent', 'fallback URL', or 'model limits'.",
    parameters: {
      query: "string - what you're looking for",
      maxChars: "number (optional) - max characters to return (default 8000)",
    },
  },
];

export async function invoke(toolName, args = {}) {
  switch (toolName) {
    case "get-index":
      return getIndex();
    case "get-page":
      return getPage(args);
    case "search-docs":
      return searchDocs(args);
    default:
      throw new Error(`Unknown ar-android-docs tool: "${toolName}"`);
  }
}

export function normalizeAndroidDocumentationPath(path = DEFAULT_PATH) {
  let normalized = String(path).trim();

  if (!normalized) return DEFAULT_PATH;
  if (normalized.startsWith(BASE)) {
    normalized = normalized.slice(BASE.length);
  }
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/[?#].*$/, "").replace(/\/+$/, "");
  return normalized || DEFAULT_PATH;
}

export function extractAndroidDocMarkdownFromHtml(html, path = DEFAULT_PATH) {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) {
    return `# ${toTitleCase(path.split("/").filter(Boolean).at(-1) || "Android AR docs")}`;
  }

  let content = mainMatch[1]
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<button\b[\s\S]*?<\/button>/gi, "")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, "");

  content = content.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (_, attrs = "", inner = "") => {
    const language = attrs.match(/language-([a-z0-9_-]+)/i)?.[1] ?? attrs.match(/data-language="([^"]+)"/i)?.[1] ?? "text";
    const code = decodeHtmlEntities(stripTags(inner)).trim();
    return `\n\n@@CODE:${language}@@\n${code}\n@@ENDCODE@@\n\n`;
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
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${stripTags(decodeHtmlEntities(text)).trim()}`)
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n\n${stripTags(decodeHtmlEntities(text)).trim()}\n\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(div|section|article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  content = decodeHtmlEntities(content)
    .replace(/@@CODE:([^@]+)@@\n([\s\S]*?)\n@@ENDCODE@@/g, (_, language, code) => `\n\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n`)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!content.startsWith("# ")) {
    content = `# ${toTitleCase(path.split("/").filter(Boolean).at(-1) || "Android AR docs")}\n\n${content}`;
  }

  return content;
}

async function getIndex() {
  const lines = ["# Google Android AR Documentation Index"];
  for (const page of INDEX_PAGES) {
    lines.push(`- ${page.path} - ${page.description}`);
  }
  return { index: lines.join("\n") };
}

async function getPage({ path = DEFAULT_PATH }) {
  const cleanPath = normalizeAndroidDocumentationPath(path);
  const html = await fetchAndroidDocumentationHtml(cleanPath);
  return { path: cleanPath, markdown: extractAndroidDocMarkdownFromHtml(html, cleanPath) };
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  const seen = new Set();
  const scored = [];

  for (const page of INDEX_PAGES) {
    const html = await fetchAndroidDocumentationHtml(page.path).catch(() => null);
    if (!html) continue;
    const markdown = extractAndroidDocMarkdownFromHtml(html, page.path);
    for (const match of findRelevantChunks(markdown, query)) {
      const chunk = `Source: ${page.path}\n\n${match.chunk}`;
      if (seen.has(chunk)) continue;
      seen.add(chunk);
      scored.push({ score: match.score, chunk });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  let result = "";
  for (const { chunk } of scored) {
    const separator = result ? "\n\n---\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;
    const snippet = chunk.length > remaining
      ? `${chunk.slice(0, Math.max(0, remaining - 3)).trimEnd()}...`
      : chunk;
    result += `${separator}${snippet}`;
    if (snippet.length < chunk.length) break;
  }

  return {
    query,
    found: seen.size,
    result: result || "No relevant sections found.",
  };
}

async function fetchAndroidDocumentationHtml(path) {
  const url = new URL(`${BASE}${normalizeAndroidDocumentationPath(path)}`);
  if (!url.searchParams.has("hl")) {
    url.searchParams.set("hl", "en");
  }

  const res = await fetch(url, {
    headers: { Accept: "text/html" },
  });

  if (!res.ok) {
    throw new Error(`Google documentation page not found: ${path} (${res.status})`);
  }

  return res.text();
}

function findRelevantChunks(text, query) {
  const lowerQuery = query.toLowerCase();
  const escaped = lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(escaped, "g");
  const lines = text.split("\n");
  const chunks = [];
  let buffer = [];

  for (const line of lines) {
    buffer.push(line);
    if (line.startsWith("#") && buffer.length > 1) {
      const chunk = buffer.join("\n").trim();
      const score = (chunk.toLowerCase().match(matcher) || []).length;
      if (score > 0) chunks.push({ score, chunk });
      buffer = [line];
    }
  }

  if (buffer.length) {
    const chunk = buffer.join("\n").trim();
    const score = (chunk.toLowerCase().match(matcher) || []).length;
    if (score > 0) chunks.push({ score, chunk });
  }

  return chunks;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(text) {
  return String(text || "").replace(/<[^>]+>/g, "");
}

function toTitleCase(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
