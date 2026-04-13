import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFastifyDocPath } from "../fastify-docs.js";

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array exports three tools", async () => {
  const mod = await reimport();
  assert.equal(mod.tools.length, 3);
  const names = mod.tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("tools descriptions mention Fastify", async () => {
  const mod = await reimport();
  for (const tool of mod.tools) {
    assert.ok(
      tool.description.includes("Fastify"),
      `tool "${tool.name}" description should mention Fastify`,
    );
  }
});

// ─── normalizeFastifyDocPath ──────────────────────────────────────────────────

test("normalizeFastifyDocPath adds leading slash when missing", () => {
  assert.equal(normalizeFastifyDocPath("docs/getting-started"), "/docs/getting-started");
});

test("normalizeFastifyDocPath keeps existing leading slash", () => {
  assert.equal(normalizeFastifyDocPath("/docs/guides/plugins"), "/docs/guides/plugins");
});

test("normalizeFastifyDocPath strips base URL", () => {
  assert.equal(
    normalizeFastifyDocPath("https://fastify.dev/docs/guides/plugins"),
    "/docs/guides/plugins",
  );
});

test("normalizeFastifyDocPath removes .md extension", () => {
  assert.equal(normalizeFastifyDocPath("/docs/reference/hooks.md"), "/docs/reference/hooks");
});

test("normalizeFastifyDocPath removes /index.md suffix", () => {
  assert.equal(normalizeFastifyDocPath("/docs/guides/index.md"), "/docs/guides/");
});

test("normalizeFastifyDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeFastifyDocPath("https://fastify.dev/docs/reference/server.md"),
    "/docs/reference/server",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Fastify Docs\n\n- [Getting Started](/docs/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Fastify Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Plugins\n\nFastify has a powerful plugin system.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/guides/plugins" });
  assert.equal(result.path, "/docs/guides/plugins");
  assert.ok(result.markdown.includes("Plugins"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Hooks", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://fastify.dev/docs/reference/hooks.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/reference/hooks"));
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
    "Fastify is a fast and low overhead web framework.",
    "",
    "# Routing",
    "Fastify routing is declarative and powerful.",
    "You can define routes with fastify.get() and fastify.post().",
    "",
    "# Plugins",
    "Plugins are the backbone of the Fastify ecosystem.",
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
    "plugins ".repeat(50),
    "",
    "# Section B",
    "plugins ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "plugins", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

test("search-docs throws when query is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: "search-docs requires `query`" },
  );
});

test("search-docs scores heading sections higher than window matches", async () => {
  const docs = [
    "# Decorators",
    "Fastify allows you to decorate the server instance.",
    "decorators decorators decorators",
    "",
    "# Hooks",
    "Lifecycle hooks let you listen to specific events.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "decorators" });
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("decorators"));
});

test("search-docs does not match stop words as false positives", async () => {
  const docs = [
    "# Overview",
    "The framework is designed for speed.",
    "",
    "# Installation",
    "Install with npm install fastify.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "websocket" });
  assert.equal(result.found, 0);
  assert.equal(result.result, "No relevant sections found.");
});

test("search-docs splits on headings correctly", async () => {
  const docs = [
    "# Alpha",
    "Content for alpha section.",
    "# Beta",
    "Content for beta section with target keyword.",
    "# Gamma",
    "Content for gamma section.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "target keyword" });
  assert.ok(result.found > 0);
  assert.ok(result.result.includes("Beta"));
  assert.ok(!result.result.includes("Alpha"));
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown fastify-docs tool: "unknown-tool"' },
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
  return import(`../fastify-docs.js?v=${importCounter}`);
}
