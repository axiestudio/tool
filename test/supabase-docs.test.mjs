import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSupabaseDocPath } from "../supabase-docs.js";

// ─── normalizeSupabaseDocPath ─────────────────────────────────────────────────

test("normalizeSupabaseDocPath adds leading slash when missing", () => {
  assert.equal(normalizeSupabaseDocPath("docs/guides/getting-started"), "/docs/guides/getting-started");
});

test("normalizeSupabaseDocPath keeps existing leading slash", () => {
  assert.equal(normalizeSupabaseDocPath("/docs/guides/auth"), "/docs/guides/auth");
});

test("normalizeSupabaseDocPath strips base URL", () => {
  assert.equal(
    normalizeSupabaseDocPath("https://supabase.com/docs/guides/database"),
    "/docs/guides/database",
  );
});

test("normalizeSupabaseDocPath removes .md extension", () => {
  assert.equal(normalizeSupabaseDocPath("/docs/guides/auth.md"), "/docs/guides/auth");
});

test("normalizeSupabaseDocPath removes /index.md suffix", () => {
  assert.equal(normalizeSupabaseDocPath("/docs/guides/index.md"), "/docs/guides/");
});

test("normalizeSupabaseDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeSupabaseDocPath("https://supabase.com/docs/reference/javascript/introduction.md"),
    "/docs/reference/javascript/introduction",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Supabase Docs\n\n- [Getting Started](/docs/guides/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Supabase Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Authentication\n\nSupabase Auth makes it easy to implement authentication.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/guides/auth" });
  assert.equal(result.path, "/docs/guides/auth");
  assert.ok(result.markdown.includes("Authentication"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Database", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://supabase.com/docs/guides/database.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/guides/database"));
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
    "Supabase is an open source Firebase alternative.",
    "",
    "# Authentication",
    "Supabase Auth supports row level security and policies.",
    "You can configure auth providers and social logins.",
    "",
    "# Database",
    "Supabase uses Postgres as the core database engine.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "authentication" });
  assert.equal(result.query, "authentication");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("authentication"));
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
    "realtime ".repeat(50),
    "",
    "# Section B",
    "realtime ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "realtime", maxChars: 100 });
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
    { message: 'Unknown supabase-docs tool: "unknown-tool"' },
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
  return import(`../supabase-docs.js?v=${importCounter}`);
}
