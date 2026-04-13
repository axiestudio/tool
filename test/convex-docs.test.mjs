import assert from "node:assert/strict";
import test from "node:test";

import { normalizeConvexDocPath } from "../convex-docs.js";

// ─── normalizeConvexDocPath ───────────────────────────────────────────────────

test("normalizeConvexDocPath adds leading slash when missing", () => {
  assert.equal(normalizeConvexDocPath("quickstart"), "/quickstart");
});

test("normalizeConvexDocPath keeps existing leading slash", () => {
  assert.equal(normalizeConvexDocPath("/functions"), "/functions");
});

test("normalizeConvexDocPath strips base URL", () => {
  assert.equal(
    normalizeConvexDocPath("https://docs.convex.dev/database"),
    "/database",
  );
});

test("normalizeConvexDocPath removes .md extension", () => {
  assert.equal(normalizeConvexDocPath("/auth.md"), "/auth");
});

test("normalizeConvexDocPath removes /index.md suffix", () => {
  assert.equal(normalizeConvexDocPath("/search/index.md"), "/search/");
});

test("normalizeConvexDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeConvexDocPath("https://docs.convex.dev/ai.md"),
    "/ai",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Convex Docs\n\n- [Quickstart](/quickstart)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Convex Docs"));
  assert.ok(result.index.includes("Quickstart"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Functions\n\nConvex functions run on the server.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/functions" });
  assert.equal(result.path, "/functions");
  assert.ok(result.markdown.includes("Functions"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Database", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://docs.convex.dev/database.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/database"));
  assert.ok(!requestedUrl.includes(".md"));
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
    "Convex is a reactive backend platform.",
    "",
    "# Mutations",
    "Mutations modify data in the Convex database.",
    "You can define mutations with mutation() helper.",
    "",
    "# Queries",
    "Queries read data and are automatically reactive.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "mutations" });
  assert.equal(result.query, "mutations");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("mutations"));
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
    "mutations ".repeat(50),
    "",
    "# Section B",
    "mutations ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "mutations", maxChars: 100 });
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
    { message: 'Unknown convex-docs tool: "unknown-tool"' },
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
  return import(`../convex-docs.js?v=${importCounter}`);
}
