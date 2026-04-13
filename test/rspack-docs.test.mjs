import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeRspackDocPath, tools } from "../rspack-docs.js";

const BASE = "https://rspack.dev";

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

// ─── normalizeRspackDocPath ──────────────────────────────────────

test("normalizeRspackDocPath strips base URL prefix", () => {
  assert.equal(normalizeRspackDocPath("https://rspack.dev/guide/start/quick-start"), "/guide/start/quick-start");
  assert.equal(normalizeRspackDocPath("https://rspack.dev/config/"), "/config/");
});

test("normalizeRspackDocPath ensures leading slash", () => {
  assert.equal(normalizeRspackDocPath("guide/start/quick-start"), "/guide/start/quick-start");
  assert.equal(normalizeRspackDocPath("config/output"), "/config/output");
});

test("normalizeRspackDocPath removes .md extension", () => {
  assert.equal(normalizeRspackDocPath("/guide/start/quick-start.md"), "/guide/start/quick-start");
  assert.equal(normalizeRspackDocPath("config/output.md"), "/config/output");
});

test("normalizeRspackDocPath removes /index.md suffix", () => {
  assert.equal(normalizeRspackDocPath("/guide/index.md"), "/guide/");
  assert.equal(normalizeRspackDocPath("/config/index.md"), "/config/");
});

test("normalizeRspackDocPath handles base URL + .md combo", () => {
  assert.equal(normalizeRspackDocPath("https://rspack.dev/guide/start/quick-start.md"), "/guide/start/quick-start");
  assert.equal(normalizeRspackDocPath("https://rspack.dev/guide/index.md"), "/guide/");
});

test("normalizeRspackDocPath returns empty string for empty input", () => {
  assert.equal(normalizeRspackDocPath(""), "");
  assert.equal(normalizeRspackDocPath(null), "");
  assert.equal(normalizeRspackDocPath(undefined), "");
});

// ─── invoke errors ───────────────────────────────────────────────

test("invoke throws for unknown tool", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown rspack-docs tool/ },
  );
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /get-page requires `path`/ },
  );
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /search-docs requires `query`/ },
  );
});

// ─── search-docs scoring via mock fetch ──────────────────────────

test("search-docs scores heading sections higher than plain text", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Code Splitting",
        "Rspack supports code splitting out of the box.",
        "Code splitting reduces initial bundle size.",
        "",
        "This plain paragraph mentions code splitting once without a heading.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "code splitting" });
    assert.ok(result.found > 0, "Should find matching sections");
    assert.ok(
      result.result.indexOf("# Code Splitting") < result.result.indexOf("plain paragraph"),
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
        "# Loaders",
        "Rspack loaders transform source files during bundling. ".repeat(20),
        "",
        "# More Loaders",
        "Additional loader documentation for rspack loaders. ".repeat(20),
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "loaders", maxChars: 100 });
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
        "# Tree Shaking",
        "Rspack performs tree shaking to eliminate dead code.",
        "Tree shaking works with ES modules by default.",
        "",
        "# Dev Server",
        "Configure the dev server with server options.",
        "The server can proxy API requests.",
        "",
        "# Tree Shaking and Dead Code",
        "Rspack uses tree shaking to remove dead code from bundles.",
        "Dead code elimination via tree shaking is automatic.",
        "Tree shaking and dead code removal improve bundle size.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "the tree and shaking dead code" });
    assert.ok(result.found > 0, "Should find matching sections");
    assert.ok(
      result.result.startsWith("# Tree Shaking"),
      "Top result should be about tree shaking",
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
      return createResponse("# Getting Started\nRspack is a fast Rust-based bundler.\n");
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
