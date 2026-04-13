/**
 * tools/ar-ios-docs.js
 *
 * Fetch Apple ARKit documentation from Apple's structured documentation JSON.
 *
 * Tools:
 *   - get-index    -> lists the main ARKit documentation paths and topics
 *   - get-page     -> fetches a specific Apple documentation page as Markdown
 *   - search-docs  -> searches ARKit documentation and returns relevant sections
 */

const SITE_BASE = "https://developer.apple.com";
const DATA_BASE = `${SITE_BASE}/tutorials/data`;
const ROOT_PATH = "/documentation/arkit";

export const tools = [
  {
    name: "get-index",
    description:
      "Returns an index of Apple ARKit documentation pages. " +
      "Use this to discover paths before calling get-page.",
    parameters: {},
  },
  {
    name: "get-page",
    description:
      "Fetches a specific Apple documentation page as Markdown. " +
      "Use paths like '/documentation/arkit' or '/documentation/arkit/arsession'.",
    parameters: {
      path: "string - Apple documentation path or full developer.apple.com URL",
    },
  },
  {
    name: "search-docs",
    description:
      "Searches official Apple ARKit documentation for a keyword or topic. " +
      "Good for questions like 'ARSession lifecycle' or 'device support'.",
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
      throw new Error(`Unknown ar-ios-docs tool: "${toolName}"`);
  }
}

export function normalizeAppleDocumentationPath(path = ROOT_PATH) {
  let normalized = String(path).trim();

  if (!normalized) return ROOT_PATH;
  if (normalized.startsWith(SITE_BASE)) {
    normalized = normalized.slice(SITE_BASE.length);
  }
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  normalized = normalized
    .replace(/[?#].*$/, "")
    .replace(/\.json$/i, "")
    .replace(/\/index$/i, "")
    .replace(/\/+$/, "");

  if (!normalized.startsWith("/documentation/")) {
    throw new Error(`Apple documentation paths must start with /documentation/: ${path}`);
  }

  return normalized || ROOT_PATH;
}

export function buildAppleDocumentationDataUrl(path = ROOT_PATH) {
  return `${DATA_BASE}${normalizeAppleDocumentationPath(path)}.json`;
}

export function renderAppleDocMarkdown(document) {
  const references = document?.references ?? {};
  const title = getAppleTitle(document) || "ARKit";
  const parts = [`# ${title}`];

  const abstract = renderAppleInline(document?.abstract, references);
  if (abstract) parts.push(abstract);

  const platforms = formatApplePlatforms(document?.metadata?.platforms);
  if (platforms) parts.push(`Supported platforms: ${platforms}`);

  for (const section of document?.primaryContentSections ?? []) {
    const rendered = renderApplePrimarySection(section, references);
    if (rendered) parts.push(rendered);
  }

  for (const topic of document?.topicSections ?? []) {
    const rendered = renderAppleTopicSection(topic, references);
    if (rendered) parts.push(rendered);
  }

  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function getIndex() {
  const rootDocument = await fetchAppleDocument(ROOT_PATH);
  const entries = collectAppleIndexEntries(rootDocument);
  const lines = ["# Apple ARKit Documentation Index"];

  const grouped = new Map();
  for (const entry of entries) {
    const group = entry.group || "Core";
    const items = grouped.get(group) ?? [];
    items.push(entry);
    grouped.set(group, items);
  }

  for (const [group, items] of grouped) {
    lines.push(`\n## ${group}`);
    for (const entry of items) {
      lines.push(`- ${entry.path} - ${entry.title}${entry.abstract ? `: ${entry.abstract}` : ""}`);
    }
  }

  return { index: lines.join("\n") };
}

async function getPage({ path = ROOT_PATH }) {
  const cleanPath = normalizeAppleDocumentationPath(path);
  const document = await fetchAppleDocument(cleanPath);
  return { path: cleanPath, markdown: renderAppleDocMarkdown(document) };
}

async function searchDocs({ query, maxChars = 8000 }) {
  if (!query) throw new Error("search-docs requires `query`");

  const rootDocument = await fetchAppleDocument(ROOT_PATH);
  const candidates = scoreAppleEntries(collectAppleIndexEntries(rootDocument), query).slice(0, 6);
  const sections = [];

  for (const candidate of candidates) {
    const document = candidate.path === ROOT_PATH
      ? rootDocument
      : await fetchAppleDocument(candidate.path).catch(() => null);
    if (!document) continue;

    const markdown = renderAppleDocMarkdown(document);
    const excerpt = extractRelevantExcerpt(markdown, query, maxChars);
    if (!excerpt) continue;
    sections.push(`Source: ${candidate.path}\n\n${excerpt}`);
  }

  let result = "";
  for (const section of sections) {
    const separator = result ? "\n\n---\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;
    const snippet = section.length > remaining
      ? `${section.slice(0, Math.max(0, remaining - 3)).trimEnd()}...`
      : section;
    result += `${separator}${snippet}`;
    if (snippet.length < section.length) break;
  }

  return {
    query,
    found: sections.length,
    result: result || "No relevant sections found.",
  };
}

async function fetchAppleDocument(path) {
  const res = await fetch(buildAppleDocumentationDataUrl(path), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Apple documentation page not found: ${path} (${res.status})`);
  }

  return res.json();
}

function collectAppleIndexEntries(document) {
  const entries = [];
  const seen = new Set();
  const references = document?.references ?? {};

  pushAppleEntry(entries, seen, {
    path: ROOT_PATH,
    title: getAppleTitle(document) || "ARKit",
    abstract: renderAppleInline(document?.abstract, references),
    group: "Core",
  });

  for (const topic of document?.topicSections ?? []) {
    for (const identifier of topic.identifiers ?? []) {
      const reference = references[identifier];
      const path = reference?.url;
      if (!path || typeof path !== "string" || !path.startsWith("/documentation/")) continue;
      pushAppleEntry(entries, seen, {
        path: normalizeAppleDocumentationPath(path),
        title: reference.title || reference.navigatorTitle?.[0]?.text || path,
        abstract: renderAppleInline(reference.abstract, references),
        group: topic.title || "Topics",
      });
    }
  }

  for (const reference of Object.values(references)) {
    const path = reference?.url;
    if (!path || typeof path !== "string" || !path.startsWith("/documentation/arkit")) continue;
    pushAppleEntry(entries, seen, {
      path: normalizeAppleDocumentationPath(path),
      title: reference.title || reference.navigatorTitle?.[0]?.text || path,
      abstract: renderAppleInline(reference.abstract, references),
      group: reference.kind === "article" ? "Guides" : "Symbols",
    });
  }

  return entries;
}

function pushAppleEntry(entries, seen, entry) {
  if (!entry.path || seen.has(entry.path)) return;
  seen.add(entry.path);
  entries.push(entry);
}

function scoreAppleEntries(entries, query) {
  const lowerQuery = query.toLowerCase();
  return entries
    .map((entry) => {
      const haystack = `${entry.title} ${entry.abstract} ${entry.path} ${entry.group}`.toLowerCase();
      const matches = haystack.match(new RegExp(lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [];
      const titleBoost = entry.title.toLowerCase().includes(lowerQuery) ? 3 : 0;
      return { ...entry, score: matches.length + titleBoost };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function renderApplePrimarySection(section, references) {
  if (section?.kind === "declarations") {
    const declarations = (section.declarations ?? [])
      .map((declaration) => renderAppleDeclaration(declaration))
      .filter(Boolean);
    if (!declarations.length) return "";
    return ["## Declaration", ...declarations].join("\n\n");
  }

  if (section?.kind === "mentions") {
    const mentions = (section.mentions ?? [])
      .map((identifier) => renderAppleReferenceListItem(references[identifier], references))
      .filter(Boolean);
    if (!mentions.length) return "";
    return ["## Related", ...mentions].join("\n");
  }

  if (section?.kind === "content") {
    return renderAppleContentBlocks(section.content ?? [], references);
  }

  return "";
}

function renderAppleTopicSection(topic, references) {
  const items = (topic?.identifiers ?? [])
    .map((identifier) => renderAppleReferenceListItem(references[identifier], references))
    .filter(Boolean);
  if (!items.length) return "";
  return [`## ${topic.title || "Topics"}`, ...items].join("\n");
}

function renderAppleReferenceListItem(reference, references) {
  if (!reference) return "";
  const title = reference.title || reference.navigatorTitle?.[0]?.text || reference.url || "Untitled";
  const abstract = renderAppleInline(reference.abstract, references);
  const path = reference.url || "";
  return `- ${path} - ${title}${abstract ? `: ${abstract}` : ""}`;
}

function renderAppleContentBlocks(blocks, references) {
  const lines = [];
  for (const block of blocks) {
    if (!block) continue;
    if (block.type === "heading") {
      const level = Math.max(2, Math.min(Number(block.level) || 2, 6));
      lines.push(`${"#".repeat(level)} ${block.text}`);
      continue;
    }
    if (block.type === "paragraph") {
      const text = renderAppleInline(block.inlineContent, references);
      if (text) lines.push(text);
      continue;
    }
    if (block.type === "codeListing") {
      const syntax = block.syntax || "text";
      const code = Array.isArray(block.code) ? block.code.join("\n") : String(block.code || "");
      if (code.trim()) lines.push(`\`\`\`${syntax}\n${code.trim()}\n\`\`\``);
      continue;
    }
    if (block.type === "unorderedList" || block.type === "orderedList") {
      const list = renderAppleList(block.items ?? [], references, block.type === "orderedList");
      if (list) lines.push(list);
    }
  }
  return lines.join("\n\n");
}

function renderAppleList(items, references, ordered) {
  return items
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}. ` : "- ";
      const text = renderAppleInline(item?.content ?? item?.inlineContent ?? item, references);
      return text ? `${prefix}${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function renderAppleDeclaration(declaration) {
  const code = (declaration?.tokens ?? []).map((token) => token.text || "").join("").trim();
  if (!code) return "";
  const language = declaration?.languages?.[0] === "swift" ? "swift" : "objc";
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

function renderAppleInline(value, references) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => renderAppleInline(item, references)).join("").trim();

  if (value.type === "text") return value.text || "";
  if (value.type === "codeVoice") return `\`${value.code || ""}\``;
  if (value.type === "emphasis") return `*${renderAppleInline(value.inlineContent, references)}*`;
  if (value.type === "strong") return `**${renderAppleInline(value.inlineContent, references)}**`;
  if (value.type === "reference") {
    const reference = references?.[value.identifier];
    return reference?.title || reference?.navigatorTitle?.[0]?.text || value.identifier || "";
  }
  if (value.inlineContent) return renderAppleInline(value.inlineContent, references);
  if (value.content) return renderAppleInline(value.content, references);
  return "";
}

function getAppleTitle(document) {
  return document?.metadata?.title || document?.title || "ARKit";
}

function formatApplePlatforms(platforms) {
  if (!Array.isArray(platforms) || !platforms.length) return "";
  return platforms
    .map((platform) => `${platform.name}${platform.introducedAt ? ` ${platform.introducedAt}+` : ""}`)
    .join(", ");
}

function extractRelevantExcerpt(markdown, query, maxChars) {
  const chunks = findRelevantChunks(markdown, query);
  if (!chunks.length) return "";

  let result = "";
  for (const { chunk } of chunks) {
    const separator = result ? "\n\n---\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;
    const snippet = chunk.length > remaining
      ? `${chunk.slice(0, Math.max(0, remaining - 3)).trimEnd()}...`
      : chunk;
    result += `${separator}${snippet}`;
    if (snippet.length < chunk.length) break;
  }

  return result;
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

  return chunks.sort((a, b) => b.score - a.score);
}
