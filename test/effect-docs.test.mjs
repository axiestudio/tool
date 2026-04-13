import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEffectDocPath } from "../effect-docs.js";

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array exports three tools", async () => {
  const { tools } = await reimport();
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("get-index"));
  assert.ok(names.includes("get-page"));
  assert.ok(names.includes("search-docs"));
});

test("tools descriptions mention Effect", async () => {
  const { tools } = await reimport();
  for (const t of tools) {
    assert.ok(
      t.description.toLowerCase().includes("effect"),
      `Tool "${t.name}" description should mention Effect`,
    );
  }
});

// ─── normalizeEffectDocPath ───────────────────────────────────────────────────

test("normalizeEffectDocPath adds leading slash when missing", () => {
  assert.equal(normalizeEffectDocPath("docs/getting-started"), "/docs/getting-started");
});

test("normalizeEffectDocPath keeps existing leading slash", () => {
  assert.equal(normalizeEffectDocPath("/docs/guides/error-management"), "/docs/guides/error-management");
});

test("normalizeEffectDocPath strips base URL", () => {
  assert.equal(
    normalizeEffectDocPath("https://effect.website/docs/guides/pipelines"),
    "/docs/guides/pipelines",
  );
});

test("normalizeEffectDocPath removes .md extension", () => {
  assert.equal(normalizeEffectDocPath("/docs/api/effect.md"), "/docs/api/effect");
});

test("normalizeEffectDocPath removes /index.md suffix", () => {
  assert.equal(normalizeEffectDocPath("/docs/guides/index.md"), "/docs/guides/");
});

test("normalizeEffectDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeEffectDocPath("https://effect.website/docs/api/context.md"),
    "/docs/api/context",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Effect Docs\n\n- [Getting Started](/docs/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Effect Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Error Management\n\nEffect provides type-safe error handling.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/guides/error-management" });
  assert.equal(result.path, "/docs/guides/error-management");
  assert.ok(result.markdown.includes("Error Management"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Pipelines", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://effect.website/docs/guides/pipelines.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/guides/pipelines"));
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
    "Effect is a TypeScript library for type-safe programs.",
    "",
    "# Pipelines",
    "Effect pipelines compose operations safely.",
    "You can chain effects with pipe() and flow().",
    "",
    "# Error Management",
    "Effect handles errors at the type level.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "pipelines" });
  assert.equal(result.query, "pipelines");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("pipelines"));
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
    "pipeline ".repeat(50),
    "",
    "# Section B",
    "pipeline ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "pipeline", maxChars: 100 });
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
    "# Low match",
    "This section mentions effect once.",
    "",
    "# High match",
    "Effect effect effect — this section mentions effect many times.",
    "Effect is great. Effect is powerful. Effect is composable.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "effect" });
  assert.ok(result.found > 0);
  // The high-match section should appear first
  const firstLine = result.result.split("\n")[0];
  assert.ok(
    firstLine.includes("High match") || result.result.indexOf("High match") < result.result.indexOf("Low match"),
    "Higher-scoring section should come first",
  );
});

test("search-docs handles stop words gracefully", async () => {
  const docs = [
    "# Guide",
    "The effect of the change is significant.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "the" });
  assert.ok(result.found > 0);
  assert.ok(result.result.includes("effect"));
});

test("search-docs splits by heading boundaries", async () => {
  const docs = [
    "# First Section",
    "Content of the first section about streams.",
    "",
    "# Second Section",
    "Content of the second section about streams.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "streams" });
  assert.equal(result.found, 2);
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown effect-docs tool: "unknown-tool"' },
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
  return import(`../effect-docs.js?v=${importCounter}`);
}
