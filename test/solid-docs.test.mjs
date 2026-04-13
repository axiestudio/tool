import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSolidDocPath } from "../solid-docs.js";

// ─── normalizeSolidDocPath ────────────────────────────────────────────────────

test("normalizeSolidDocPath adds leading slash when missing", () => {
  assert.equal(normalizeSolidDocPath("concepts/signals"), "/concepts/signals");
});

test("normalizeSolidDocPath keeps existing leading slash", () => {
  assert.equal(normalizeSolidDocPath("/reference/component-apis/create-signal"), "/reference/component-apis/create-signal");
});

test("normalizeSolidDocPath strips base URL", () => {
  assert.equal(
    normalizeSolidDocPath("https://docs.solidjs.com/concepts/effects"),
    "/concepts/effects",
  );
});

test("normalizeSolidDocPath removes .md extension", () => {
  assert.equal(normalizeSolidDocPath("/guides/getting-started.md"), "/guides/getting-started");
});

test("normalizeSolidDocPath removes /index.md suffix", () => {
  assert.equal(normalizeSolidDocPath("/reference/index.md"), "/reference/");
});

test("normalizeSolidDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeSolidDocPath("https://docs.solidjs.com/concepts/stores.md"),
    "/concepts/stores",
  );
});

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array contains exactly 3 tools", async () => {
  const { tools } = await reimport();
  assert.equal(tools.length, 3);
});

test("tools have correct names", async () => {
  const { tools } = await reimport();
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("all tool descriptions mention SolidJS", async () => {
  const { tools } = await reimport();
  for (const tool of tools) {
    assert.ok(tool.description.includes("SolidJS"), `${tool.name} description should mention SolidJS`);
  }
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# SolidJS Docs\n\n- [Signals](/concepts/signals)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("SolidJS Docs"));
  assert.ok(result.index.includes("Signals"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Signals\n\nSignals are the cornerstone of reactivity in SolidJS.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/concepts/signals" });
  assert.equal(result.path, "/concepts/signals");
  assert.ok(result.markdown.includes("Signals"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Stores", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://docs.solidjs.com/concepts/stores.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/concepts/stores"));
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
    "SolidJS is a reactive JavaScript library.",
    "",
    "# Signals",
    "Signals are the core reactive primitive in SolidJS.",
    "You can create signals with createSignal().",
    "",
    "# Effects",
    "Effects run side effects when signals change.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "signals" });
  assert.equal(result.query, "signals");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("signals"));
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

test("search-docs uses llms.txt since llms-full.txt is unavailable", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Routing\n\nSolid Router handles routing.", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("search-docs", { query: "routing" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/llms.txt"), "search-docs should fetch llms.txt");
  assert.ok(!requestedUrl.includes("llms-full.txt"), "search-docs should NOT fetch llms-full.txt");
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown solid-docs tool: "unknown-tool"' },
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
  return import(`../solid-docs.js?v=${importCounter}`);
}
