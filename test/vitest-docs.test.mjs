import assert from "node:assert/strict";
import test from "node:test";

import { normalizeVitestDocPath } from "../vitest-docs.js";

// ─── normalizeVitestDocPath ───────────────────────────────────────────────────

test("normalizeVitestDocPath adds leading slash when missing", () => {
  assert.equal(normalizeVitestDocPath("guide/"), "/guide/");
});

test("normalizeVitestDocPath keeps existing leading slash", () => {
  assert.equal(normalizeVitestDocPath("/api/"), "/api/");
});

test("normalizeVitestDocPath strips base URL", () => {
  assert.equal(
    normalizeVitestDocPath("https://vitest.dev/guide/browser/"),
    "/guide/browser/",
  );
});

test("normalizeVitestDocPath removes .md extension", () => {
  assert.equal(normalizeVitestDocPath("/config/index.md"), "/config/");
});

test("normalizeVitestDocPath removes /index.md suffix", () => {
  assert.equal(normalizeVitestDocPath("/guide/index.md"), "/guide/");
});

test("normalizeVitestDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeVitestDocPath("https://vitest.dev/api/expect.md"),
    "/api/expect",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Vitest Docs\n\n- [Guide](/guide/)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Vitest Docs"));
  assert.ok(result.index.includes("Guide"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Snapshot Testing\n\nVitest supports snapshot testing out of the box.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/guide/snapshot" });
  assert.equal(result.path, "/guide/snapshot");
  assert.ok(result.markdown.includes("Snapshot Testing"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Config", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://vitest.dev/config/index.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/config/"));
  assert.ok(!requestedUrl.includes("index.md"));
});

test("get-page throws when path is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("get-page", {}),
    { message: "get-page requires `path`" },
  );
});

// ─── invoke search-docs ───────────────────────────────────────────────────────

test("search-docs finds matching sections", async () => {
  const docs = [
    "# Introduction",
    "Vitest is a blazing fast unit test framework.",
    "",
    "# Mock Functions",
    "Vitest provides mock functions via vi.fn() and vi.spyOn().",
    "You can track calls, arguments, and return values.",
    "",
    "# Coverage",
    "Vitest supports code coverage with v8 and istanbul providers.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "mock functions" });
  assert.equal(result.query, "mock functions");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("mock"));
});

test("search-docs returns fallback message when nothing matches", async () => {
  const docs = "# Introduction\n\nSome unrelated content here.";
  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "xyznonexistent" });
  assert.equal(result.found, 0);
  assert.equal(result.result, "No relevant sections found.");
});

test("search-docs respects maxChars", async () => {
  const docs = [
    "# Section A",
    "coverage ".repeat(50),
    "",
    "# Section B",
    "coverage ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "coverage", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

test("search-docs throws when query is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: "search-docs requires `query`" },
  );
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown vitest-docs tool: "unknown-tool"' },
  );
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loadWithMockedFetch(responseText) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(responseText, { status: 200 });

  const mod = await reimport();

  globalThis.fetch = original;
  // Return an invoke that still uses the mock
  return {
    invoke: async (name, args) => {
      globalThis.fetch = async () => new Response(responseText, { status: 200 });
      try {
        return await mod.invoke(name, args);
      } finally {
        globalThis.fetch = original;
      }
    },
  };
}

let importCounter = 0;
async function reimport() {
  importCounter++;
  return import(`../vitest-docs.js?v=${importCounter}`);
}
