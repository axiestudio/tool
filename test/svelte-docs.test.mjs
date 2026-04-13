import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSvelteDocPath } from "../svelte-docs.js";

// ─── normalizeSvelteDocPath ───────────────────────────────────────────────────

test("normalizeSvelteDocPath adds leading slash when missing", () => {
  assert.equal(normalizeSvelteDocPath("docs/svelte/overview"), "/docs/svelte/overview");
});

test("normalizeSvelteDocPath keeps existing leading slash", () => {
  assert.equal(normalizeSvelteDocPath("/docs/kit/introduction"), "/docs/kit/introduction");
});

test("normalizeSvelteDocPath strips base URL", () => {
  assert.equal(
    normalizeSvelteDocPath("https://svelte.dev/docs/svelte/reactivity"),
    "/docs/svelte/reactivity",
  );
});

test("normalizeSvelteDocPath removes .md extension", () => {
  assert.equal(normalizeSvelteDocPath("/docs/kit/routing.md"), "/docs/kit/routing");
});

test("normalizeSvelteDocPath removes /index.md suffix", () => {
  assert.equal(normalizeSvelteDocPath("/docs/svelte/index.md"), "/docs/svelte/");
});

test("normalizeSvelteDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeSvelteDocPath("https://svelte.dev/docs/kit/load.md"),
    "/docs/kit/load",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Svelte Docs\n\n- [Overview](/docs/svelte/overview)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Svelte Docs"));
  assert.ok(result.index.includes("Overview"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Reactivity\n\nSvelte has built-in reactivity.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/svelte/reactivity" });
  assert.equal(result.path, "/docs/svelte/reactivity");
  assert.ok(result.markdown.includes("Reactivity"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Routing", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://svelte.dev/docs/kit/routing.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/kit/routing"));
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
    "Svelte is a UI framework that compiles components.",
    "",
    "# Reactivity",
    "Svelte reactivity is powerful and built-in.",
    "You can use $state and $derived runes for reactivity.",
    "",
    "# Routing",
    "SvelteKit routing uses file-based routing.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "reactivity" });
  assert.equal(result.query, "reactivity");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("reactivity"));
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
    "reactivity ".repeat(50),
    "",
    "# Section B",
    "reactivity ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "reactivity", maxChars: 100 });
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
    { message: 'Unknown svelte-docs tool: "unknown-tool"' },
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
  return import(`../svelte-docs.js?v=${importCounter}`);
}
