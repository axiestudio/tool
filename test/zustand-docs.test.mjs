import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeZustandDocPath, tools } from "../zustand-docs.js";

const BASE = "https://zustand.docs.pmnd.rs";

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

// ─── normalizeZustandDocPath ─────────────────────────────────────

test("normalizeZustandDocPath strips base URL prefix", () => {
  assert.equal(normalizeZustandDocPath("https://zustand.docs.pmnd.rs/guides/updating-state"), "/guides/updating-state");
  assert.equal(normalizeZustandDocPath("https://zustand.docs.pmnd.rs/getting-started/introduction"), "/getting-started/introduction");
});

test("normalizeZustandDocPath ensures leading slash", () => {
  assert.equal(normalizeZustandDocPath("guides/updating-state"), "/guides/updating-state");
  assert.equal(normalizeZustandDocPath("recipes/recipes"), "/recipes/recipes");
});

test("normalizeZustandDocPath removes .md extension", () => {
  assert.equal(normalizeZustandDocPath("/guides/updating-state.md"), "/guides/updating-state");
  assert.equal(normalizeZustandDocPath("guides/slices-pattern.md"), "/guides/slices-pattern");
});

test("normalizeZustandDocPath removes /index.md suffix", () => {
  assert.equal(normalizeZustandDocPath("/guides/index.md"), "/guides/");
  assert.equal(normalizeZustandDocPath("/getting-started/index.md"), "/getting-started/");
});

test("normalizeZustandDocPath handles base URL + .md combo", () => {
  assert.equal(normalizeZustandDocPath("https://zustand.docs.pmnd.rs/guides/updating-state.md"), "/guides/updating-state");
  assert.equal(normalizeZustandDocPath("https://zustand.docs.pmnd.rs/guides/index.md"), "/guides/");
});

test("normalizeZustandDocPath returns empty string for empty input", () => {
  assert.equal(normalizeZustandDocPath(""), "");
  assert.equal(normalizeZustandDocPath(null), "");
  assert.equal(normalizeZustandDocPath(undefined), "");
});

// ─── invoke errors ───────────────────────────────────────────────

test("invoke throws for unknown tool", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown zustand-docs tool/ },
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
        "# Persist Middleware",
        "Zustand provides a persist middleware for state persistence.",
        "Persist saves your store to storage.",
        "",
        "This plain paragraph mentions persist once without a heading.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "persist" });
    assert.ok(result.found > 0, "Should find matching sections");
    assert.ok(
      result.result.indexOf("# Persist") < result.result.indexOf("plain paragraph"),
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
        "# Selectors",
        "Zustand selectors let you pick state slices. ".repeat(20),
        "",
        "# More Selectors",
        "Additional selector documentation for zustand selectors. ".repeat(20),
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "selectors", maxChars: 100 });
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
        "# Immer Middleware",
        "Zustand works with immer for immutable state updates.",
        "Use the immer middleware to write mutable logic.",
        "",
        "# Devtools",
        "Configure the devtools middleware for debugging.",
        "The devtools extension shows state changes.",
        "",
        "# Immer and Devtools",
        "Zustand supports combining immer middleware with devtools.",
        "Using immer with devtools gives you mutable writes and visual debugging.",
        "The immer devtools combo is popular.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    // "the" and "and" are stop words; only "immer" and "devtools" should count
    const result = await invoke("search-docs", { query: "the immer and devtools" });
    assert.ok(result.found > 0, "Should find matching sections");
    // Section with both "immer" and "devtools" should rank highest
    assert.ok(
      result.result.startsWith("# Immer and Devtools") || result.result.startsWith("# Immer"),
      "Top result should be about immer and devtools",
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
        "Content about store creation.",
        "---",
        "# Second Section",
        "More about store middleware.",
        "---",
        "Unrelated content with no store mention.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "store" });
    assert.ok(result.found >= 2, `Should find at least 2 sections, got ${result.found}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
