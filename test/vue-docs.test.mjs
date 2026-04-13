import assert from "node:assert/strict";
import test from "node:test";

import { normalizeVueDocPath } from "../vue-docs.js";

// ─── normalizeVueDocPath ──────────────────────────────────────────────────────

test("normalizeVueDocPath adds leading slash when missing", () => {
  assert.equal(normalizeVueDocPath("guide/introduction"), "/guide/introduction");
});

test("normalizeVueDocPath keeps existing leading slash", () => {
  assert.equal(normalizeVueDocPath("/api/composition-api-setup"), "/api/composition-api-setup");
});

test("normalizeVueDocPath strips base URL", () => {
  assert.equal(
    normalizeVueDocPath("https://vuejs.org/guide/essentials/reactivity-fundamentals"),
    "/guide/essentials/reactivity-fundamentals",
  );
});

test("normalizeVueDocPath removes .md extension", () => {
  assert.equal(normalizeVueDocPath("/guide/components/props.md"), "/guide/components/props");
});

test("normalizeVueDocPath removes /index.md suffix", () => {
  assert.equal(normalizeVueDocPath("/guide/essentials/index.md"), "/guide/essentials/");
});

test("normalizeVueDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeVueDocPath("https://vuejs.org/api/composition-api-setup.md"),
    "/api/composition-api-setup",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Vue.js Docs\n\n- [Introduction](/guide/introduction)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Vue.js Docs"));
  assert.ok(result.index.includes("Introduction"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Reactivity Fundamentals\n\nVue uses a reactivity system based on proxies.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/guide/essentials/reactivity-fundamentals" });
  assert.equal(result.path, "/guide/essentials/reactivity-fundamentals");
  assert.ok(result.markdown.includes("Reactivity Fundamentals"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Props", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://vuejs.org/guide/components/props.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/guide/components/props"));
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
    "Vue.js is a progressive JavaScript framework.",
    "",
    "# Reactivity",
    "Vue reactivity is powerful and flexible.",
    "You can use ref() and reactive() for state management.",
    "",
    "# Components",
    "Components are reusable Vue instances.",
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
    { message: 'Unknown vue-docs tool: "unknown-tool"' },
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
  return import(`../vue-docs.js?v=${importCounter}`);
}
