import assert from "node:assert/strict";
import test from "node:test";

import { normalizeElysiaDocPath } from "../elysia-docs.js";

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array exports three tools", async () => {
  const mod = await reimport();
  assert.equal(mod.tools.length, 3);
  const names = mod.tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("tools descriptions mention Elysia", async () => {
  const mod = await reimport();
  for (const tool of mod.tools) {
    assert.ok(
      tool.description.toLowerCase().includes("elysia"),
      `${tool.name} description should mention Elysia`,
    );
  }
});

// ─── normalizeElysiaDocPath ───────────────────────────────────────────────────

test("normalizeElysiaDocPath adds leading slash when missing", () => {
  assert.equal(normalizeElysiaDocPath("essential/route"), "/essential/route");
});

test("normalizeElysiaDocPath keeps existing leading slash", () => {
  assert.equal(normalizeElysiaDocPath("/essential/handler"), "/essential/handler");
});

test("normalizeElysiaDocPath strips base URL", () => {
  assert.equal(
    normalizeElysiaDocPath("https://elysiajs.com/patterns/cookie"),
    "/patterns/cookie",
  );
});

test("normalizeElysiaDocPath removes .md extension", () => {
  assert.equal(normalizeElysiaDocPath("/essential/route.md"), "/essential/route");
});

test("normalizeElysiaDocPath removes /index.md suffix", () => {
  assert.equal(normalizeElysiaDocPath("/patterns/index.md"), "/patterns/");
});

test("normalizeElysiaDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeElysiaDocPath("https://elysiajs.com/essential/validation.md"),
    "/essential/validation",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Elysia Docs\n\n- [Route](/essential/route)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Elysia Docs"));
  assert.ok(result.index.includes("Route"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Lifecycle\n\nElysia has a powerful lifecycle system.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/essential/lifecycle" });
  assert.equal(result.path, "/essential/lifecycle");
  assert.ok(result.markdown.includes("Lifecycle"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Validation", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://elysiajs.com/essential/validation.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/essential/validation"));
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
    "Elysia is the Bun web framework.",
    "",
    "# Lifecycle",
    "Elysia lifecycle hooks let you intercept requests.",
    "You can use onRequest, onParse, and onTransform.",
    "",
    "# Validation",
    "Elysia validates request and response schemas.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "lifecycle" });
  assert.equal(result.query, "lifecycle");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("lifecycle"));
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
    "lifecycle ".repeat(50),
    "",
    "# Section B",
    "lifecycle ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "lifecycle", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

test("search-docs throws when query is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: "search-docs requires `query`" },
  );
});

test("search-docs scoring prefers sections with more matches", async () => {
  const docs = [
    "# Section One",
    "handler handler handler handler handler",
    "",
    "# Section Two",
    "handler once mentioned",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "handler" });
  assert.ok(result.result.toLowerCase().indexOf("handler handler") < result.result.length);
  assert.ok(result.found >= 1);
});

test("search-docs splits on heading boundaries", async () => {
  const docs = [
    "# Alpha",
    "Content about alpha topic.",
    "",
    "# Beta",
    "Searching for beta content here.",
    "",
    "# Gamma",
    "Unrelated gamma section content.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "beta" });
  assert.ok(result.result.includes("Beta"));
  assert.ok(!result.result.includes("gamma"));
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown elysia-docs tool: "unknown-tool"' },
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
  return import(`../elysia-docs.js?v=${importCounter}`);
}
