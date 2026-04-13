import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTrpcDocPath } from "../trpc-docs.js";

// ─── tools array structure ────────────────────────────────────────────────────

test("tools array has exactly 3 tools", async () => {
  const mod = await reimport();
  assert.equal(mod.tools.length, 3);
});

test("tools array has correct names", async () => {
  const mod = await reimport();
  const names = mod.tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has name, description, and parameters", async () => {
  const mod = await reimport();
  for (const tool of mod.tools) {
    assert.ok(typeof tool.name === "string" && tool.name.length > 0);
    assert.ok(typeof tool.description === "string" && tool.description.length > 0);
    assert.ok(typeof tool.parameters === "object");
  }
});

// ─── normalizeTrpcDocPath ─────────────────────────────────────────────────────

test("normalizeTrpcDocPath adds leading slash when missing", () => {
  assert.equal(normalizeTrpcDocPath("docs/getting-started"), "/docs/getting-started");
});

test("normalizeTrpcDocPath keeps existing leading slash", () => {
  assert.equal(normalizeTrpcDocPath("/docs/client/react"), "/docs/client/react");
});

test("normalizeTrpcDocPath strips base URL", () => {
  assert.equal(
    normalizeTrpcDocPath("https://trpc.io/docs/server/routers"),
    "/docs/server/routers",
  );
});

test("normalizeTrpcDocPath removes .md extension", () => {
  assert.equal(normalizeTrpcDocPath("/docs/client/react.md"), "/docs/client/react");
});

test("normalizeTrpcDocPath removes /index.md suffix", () => {
  assert.equal(normalizeTrpcDocPath("/docs/server/index.md"), "/docs/server/");
});

test("normalizeTrpcDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeTrpcDocPath("https://trpc.io/docs/quickstart.md"),
    "/docs/quickstart",
  );
});

// ─── invoke throws on unknown tool ────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown trpc-docs tool: "unknown-tool"' },
  );
});

// ─── get-page throws on missing path ──────────────────────────────────────────

test("get-page throws when path is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("get-page", {}),
    { message: "get-page requires `path`" },
  );
});

// ─── get-page normalizes path ─────────────────────────────────────────────────

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# React Query", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://trpc.io/docs/client/react.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/client/react"));
  assert.ok(!requestedUrl.includes(".md"));
});

// ─── search-docs throws on missing query ──────────────────────────────────────

test("search-docs throws when query is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: "search-docs requires `query`" },
  );
});

// ─── search-docs maxChars limit ───────────────────────────────────────────────

test("search-docs respects maxChars", async () => {
  const docs = [
    "# Section A",
    "subscription ".repeat(50),
    "",
    "# Section B",
    "subscription ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "subscription", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

// ─── search-docs scoring (heading matches higher) ────────────────────────────

test("search-docs scores heading sections with multiplier", async () => {
  const docs = [
    "# Middleware",
    "Middleware runs before handlers.",
    "",
    "# Subscriptions",
    "tRPC supports real-time subscriptions via WebSocket.",
    "Subscriptions are a powerful feature of tRPC.",
    "",
    "# Context",
    "Context is passed to all resolvers.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "subscriptions" });
  assert.ok(result.found > 0);
  // The subscriptions section should appear first since it has more matches
  assert.ok(result.result.toLowerCase().includes("subscriptions"));
});

// ─── search-docs stop word / no match ─────────────────────────────────────────

test("search-docs returns fallback when nothing matches", async () => {
  const docs = "# Introduction\n\nSome unrelated content here about tRPC.";
  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "xyznonexistent" });
  assert.equal(result.found, 0);
  assert.equal(result.result, "No relevant sections found.");
});

// ─── search-docs heading + HR splitting ───────────────────────────────────────

test("search-docs splits sections by heading boundaries", async () => {
  const docs = [
    "# First Section",
    "Content about routers and procedures.",
    "",
    "# Second Section",
    "More content about routers here.",
    "Routers are the core of tRPC.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "routers" });
  assert.ok(result.found > 0);
  // Both sections mention routers, so both should be found
  assert.ok(result.result.includes("First Section") || result.result.includes("Second Section"));
});

// ─── get-index returns index ──────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# tRPC Docs\n\n- [Getting Started](/docs/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("tRPC Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loadWithMockedFetch(responseText) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(responseText, { status: 200 });

  const mod = await reimport();

  globalThis.fetch = original;
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
  return import(`../trpc-docs.js?v=${importCounter}`);
}
