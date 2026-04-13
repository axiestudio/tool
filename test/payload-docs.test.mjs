import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizePayloadDocPath, tools } from "../payload-docs.js";

const BASE = "https://payloadcms.com";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/markdown");
  }

  return new Response(body, {
    status: 200,
    ...init,
    headers,
  });
}

// ─── tools export ────────────────────────────────────────────────

test("tools array exports exactly 3 tools", () => {
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

// ─── normalizePayloadDocPath ─────────────────────────────────────

test("normalizePayloadDocPath strips absolute URL to path", () => {
  assert.equal(
    normalizePayloadDocPath("https://payloadcms.com/docs/fields/overview"),
    "/docs/fields/overview",
  );
  assert.equal(
    normalizePayloadDocPath("https://payloadcms.com/docs/access-control/collections"),
    "/docs/access-control/collections",
  );
});

test("normalizePayloadDocPath strips .md and /index.md suffixes", () => {
  assert.equal(
    normalizePayloadDocPath("/docs/hooks/overview.md"),
    "/docs/hooks/overview",
  );
  assert.equal(
    normalizePayloadDocPath("/docs/configuration/index.md"),
    "/docs/configuration",
  );
  assert.equal(
    normalizePayloadDocPath("docs/fields/text.md"),
    "/docs/fields/text",
  );
});

test("normalizePayloadDocPath ensures leading slash", () => {
  assert.equal(
    normalizePayloadDocPath("docs/getting-started"),
    "/docs/getting-started",
  );
  assert.equal(
    normalizePayloadDocPath("docs/collections"),
    "/docs/collections",
  );
});

test("normalizePayloadDocPath strips trailing slash", () => {
  assert.equal(
    normalizePayloadDocPath("/docs/globals/"),
    "/docs/globals",
  );
});

test("normalizePayloadDocPath returns empty string for empty input", () => {
  assert.equal(normalizePayloadDocPath(""), "");
  assert.equal(normalizePayloadDocPath(null), "");
  assert.equal(normalizePayloadDocPath(undefined), "");
});

test("normalizePayloadDocPath strips query params and hash", () => {
  assert.equal(
    normalizePayloadDocPath("/docs/fields/text?tab=config#usage"),
    "/docs/fields/text",
  );
  assert.equal(
    normalizePayloadDocPath("https://payloadcms.com/docs/hooks/overview#beforeChange"),
    "/docs/hooks/overview",
  );
});

// ─── invoke error handling ───────────────────────────────────────

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    (err) => {
      assert.match(err.message, /unknown payload-docs tool/i);
      return true;
    },
  );
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    (err) => {
      assert.match(err.message, /requires.*path/i);
      return true;
    },
  );
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    (err) => {
      assert.match(err.message, /requires.*query/i);
      return true;
    },
  );
});

// ─── search-docs scoring ─────────────────────────────────────────

test("search-docs scores sections with more distinct query terms higher", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Collections overview",
        "Collections are the primary way to structure content in Payload.",
        "Define collections with fields and hooks.",
        "",
        "# Access control and hooks",
        "Access control restricts operations on collections.",
        "Use hooks and access control together for secure collections.",
        "Hooks run before and after collection operations.",
        "",
        "# Globals",
        "Globals are single documents, unlike collections.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "access control hooks collections" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /access control/i, "Top result should mention access control");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /access control|hooks/i, "First section should be the best multi-term match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Section A",
        "Payload collections are powerful. ".repeat(50),
        "",
        "# Section B",
        "More about Payload collections and fields. ".repeat(50),
        "",
        "# Section C",
        "Even more about Payload collections and globals. ".repeat(50),
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "collections", maxChars: 200 });

    assert.ok(result.result.length <= 200, `Result should be <= 200 chars, got ${result.result.length}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs filters stop words from query terms", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Authentication",
        "Payload provides built-in authentication for collections.",
        "Configure auth strategies and access control policies.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the authentication in payload" });

    assert.ok(result.found > 0, "Should find auth section despite stop words");
    assert.match(result.result, /authentication/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs section splitting ──────────────────────────────

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Fields overview",
        "Payload fields define the shape of your content.",
        "---",
        "Field validation runs on both client and server.",
        "---",
        "# Field types",
        "Text, number, select, relationship, and more field types.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "field" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs heading boost ───────────────────────────────────

test("search-docs boosts score when query term appears in heading", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Hooks",
        "Hooks allow you to execute side effects during operations.",
        "",
        "# Plugins",
        "Plugins extend Payload. Some plugins use hooks internally.",
        "Hooks are a common extension point for plugins.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "hooks" });

    assert.ok(result.found > 0);
    const sections = result.result.split("---");
    assert.match(sections[0].trim(), /^# Hooks/i, "Section with heading match should appear first");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
