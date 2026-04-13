import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeViteDocPath, tools } from "../vite-docs.js";

const BASE = "https://vite.dev";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/markdown");
  }
  return new Response(body, { status: 200, ...init, headers });
}

// ─── tools array ─────────────────────────────────────────────────

test("tools array contains exactly 3 tools", () => {
  assert.equal(tools.length, 3);
});

test("tools have correct names", () => {
  const names = tools.map(t => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has name, description, and parameters", () => {
  for (const tool of tools) {
    assert.ok(typeof tool.name === "string" && tool.name.length > 0);
    assert.ok(typeof tool.description === "string" && tool.description.length > 0);
    assert.ok(typeof tool.parameters === "object");
  }
});

// ─── normalizeViteDocPath ────────────────────────────────────────

test("normalizeViteDocPath strips base URL prefix", () => {
  assert.equal(normalizeViteDocPath("https://vite.dev/guide/features"), "/guide/features");
  assert.equal(normalizeViteDocPath("https://vite.dev/config/"), "/config/");
});

test("normalizeViteDocPath ensures leading slash", () => {
  assert.equal(normalizeViteDocPath("guide/features"), "/guide/features");
  assert.equal(normalizeViteDocPath("config/shared-options"), "/config/shared-options");
});

test("normalizeViteDocPath removes .md extension", () => {
  assert.equal(normalizeViteDocPath("/guide/features.md"), "/guide/features");
  assert.equal(normalizeViteDocPath("guide/ssr.md"), "/guide/ssr");
});

test("normalizeViteDocPath removes /index.md suffix", () => {
  assert.equal(normalizeViteDocPath("/guide/index.md"), "/guide/");
  assert.equal(normalizeViteDocPath("/config/index.md"), "/config/");
});

test("normalizeViteDocPath handles base URL + .md combo", () => {
  assert.equal(normalizeViteDocPath("https://vite.dev/guide/features.md"), "/guide/features");
  assert.equal(normalizeViteDocPath("https://vite.dev/guide/index.md"), "/guide/");
});

test("normalizeViteDocPath returns empty string for empty input", () => {
  assert.equal(normalizeViteDocPath(""), "");
  assert.equal(normalizeViteDocPath(null), "");
  assert.equal(normalizeViteDocPath(undefined), "");
});

// ─── invoke errors ───────────────────────────────────────────────

test("invoke throws for unknown tool", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown vite-docs tool/ },
  );
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /get-page requires `path`/ },
  );
});

test("search-docs throws when query is missing", async () => {
  const originalFetch = globalThis.fetch;
  // Ensure it throws before any fetch happens
  try {
    await assert.rejects(
      () => invoke("search-docs", {}),
      { message: /search-docs requires `query`/ },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs scoring via mock fetch ──────────────────────────

test("search-docs scores heading sections higher than plain text", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# HMR Hot Module Replacement",
        "Vite provides an HMR API for fast updates.",
        "HMR is a core feature of vite.",
        "",
        "This plain paragraph mentions hmr once without a heading.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "HMR" });
    assert.ok(result.found > 0, "Should find matching sections");
    // The heading section should appear first due to 1.5x heading bonus
    assert.ok(
      result.result.indexOf("# HMR") < result.result.indexOf("plain paragraph"),
      "Heading section should rank before plain paragraph",
    );
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
        "# Plugins",
        "Vite plugins extend the build pipeline. ".repeat(20),
        "",
        "# More Plugins",
        "Additional plugin documentation for vite plugins. ".repeat(20),
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "plugins", maxChars: 100 });
    assert.ok(result.result.length <= 100, `Result should be <= 100 chars, got ${result.result.length}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs filters stop words and scores multi-term matches higher", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Environment Variables",
        "Vite exposes env variables through import.meta.env.",
        "You can define custom env variables in .env files.",
        "",
        "# Server Options",
        "Configure the dev server with server options.",
        "The server can proxy API requests.",
        "",
        "# Env and Mode",
        "Vite uses env files and mode to control environment variables.",
        "The mode determines which env file is loaded.",
        "Environment variables from env files are available at runtime.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    // "the" and "and" are stop words; only "env" and "variables" should count
    const result = await invoke("search-docs", { query: "the env and variables" });
    assert.ok(result.found > 0, "Should find matching sections");
    // Section with both "env" and "variables" should rank highest
    assert.ok(
      result.result.startsWith("# Env") || result.result.startsWith("# Environment"),
      "Top result should be about env variables",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs splits on heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# First Section",
        "Content about build optimization.",
        "---",
        "Second section after HR about build.",
        "",
        "# Third Section",
        "Unrelated content about routing.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "build optimization" });
    assert.ok(result.found >= 1, "Should find at least 1 section");
    // "Third Section" about routing should NOT be in results
    assert.ok(!result.result.includes("routing"), "Unrelated section should not appear");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns fallback message when nothing matches", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse("# Getting Started\nVite is a build tool.\n");
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "xyznonexistent" });
    assert.equal(result.found, 0);
    assert.equal(result.result, "No relevant sections found.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
