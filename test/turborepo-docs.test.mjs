import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTurborepoDocPath } from "../turborepo-docs.js";

// ─── normalizeTurborepoDocPath ────────────────────────────────────────────────

test("normalizeTurborepoDocPath adds leading slash when missing", () => {
  assert.equal(normalizeTurborepoDocPath("getting-started"), "/getting-started");
});

test("normalizeTurborepoDocPath keeps existing leading slash", () => {
  assert.equal(normalizeTurborepoDocPath("/reference/configuration"), "/reference/configuration");
});

test("normalizeTurborepoDocPath strips base URL", () => {
  assert.equal(
    normalizeTurborepoDocPath("https://turborepo.dev/crafting-your-repository/caching"),
    "/crafting-your-repository/caching",
  );
});

test("normalizeTurborepoDocPath removes .md extension", () => {
  assert.equal(normalizeTurborepoDocPath("/guides/ci-vendors.md"), "/guides/ci-vendors");
});

test("normalizeTurborepoDocPath removes /index.md suffix", () => {
  assert.equal(normalizeTurborepoDocPath("/core-concepts/index.md"), "/core-concepts/");
});

test("normalizeTurborepoDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeTurborepoDocPath("https://turborepo.dev/reference/configuration.md"),
    "/reference/configuration",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Turborepo Docs\n\n- [Getting Started](/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Turborepo Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Caching\n\nTurborepo caches task outputs for faster builds.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/crafting-your-repository/caching" });
  assert.equal(result.path, "/crafting-your-repository/caching");
  assert.ok(result.markdown.includes("Caching"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Configuration", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://turborepo.dev/reference/configuration.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/reference/configuration"));
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
    "Turborepo is a high-performance build system for monorepos.",
    "",
    "# Caching",
    "Turborepo caching speeds up your builds significantly.",
    "You can configure remote cache for sharing across CI.",
    "",
    "# Task Graph",
    "Turborepo builds a task graph to determine execution order.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "caching" });
  assert.equal(result.query, "caching");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("caching"));
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
    "caching ".repeat(50),
    "",
    "# Section B",
    "caching ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "caching", maxChars: 100 });
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
    { message: 'Unknown turborepo-docs tool: "unknown-tool"' },
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
  return import(`../turborepo-docs.js?v=${importCounter}`);
}
