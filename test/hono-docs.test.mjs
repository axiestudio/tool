import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHonoDocPath } from "../hono-docs.js";

// ─── normalizeHonoDocPath ─────────────────────────────────────────────────────

test("normalizeHonoDocPath adds leading slash when missing", () => {
  assert.equal(normalizeHonoDocPath("docs/getting-started"), "/docs/getting-started");
});

test("normalizeHonoDocPath keeps existing leading slash", () => {
  assert.equal(normalizeHonoDocPath("/docs/api/hono"), "/docs/api/hono");
});

test("normalizeHonoDocPath strips base URL", () => {
  assert.equal(
    normalizeHonoDocPath("https://hono.dev/docs/guides/middleware"),
    "/docs/guides/middleware",
  );
});

test("normalizeHonoDocPath removes .md extension", () => {
  assert.equal(normalizeHonoDocPath("/docs/api/routing.md"), "/docs/api/routing");
});

test("normalizeHonoDocPath removes /index.md suffix", () => {
  assert.equal(normalizeHonoDocPath("/docs/helpers/index.md"), "/docs/helpers/");
});

test("normalizeHonoDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeHonoDocPath("https://hono.dev/docs/api/context.md"),
    "/docs/api/context",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Hono Docs\n\n- [Getting Started](/docs/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Hono Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Middleware\n\nHono has built-in middleware.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/guides/middleware" });
  assert.equal(result.path, "/docs/guides/middleware");
  assert.ok(result.markdown.includes("Middleware"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Routing", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://hono.dev/docs/api/routing.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/api/routing"));
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
    "Hono is an ultrafast web framework.",
    "",
    "# Routing",
    "Hono routing is powerful and flexible.",
    "You can define routes with app.get() and app.post().",
    "",
    "# Middleware",
    "Middleware runs before your route handler.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "routing" });
  assert.equal(result.query, "routing");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("routing"));
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
    "middleware ".repeat(50),
    "",
    "# Section B",
    "middleware ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "middleware", maxChars: 100 });
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
    { message: 'Unknown hono-docs tool: "unknown-tool"' },
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
  return import(`../hono-docs.js?v=${importCounter}`);
}
