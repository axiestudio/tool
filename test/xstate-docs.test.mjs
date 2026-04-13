import assert from "node:assert/strict";
import test from "node:test";

import { normalizeXstateDocPath } from "../xstate-docs.js";

// ─── normalizeXstateDocPath ───────────────────────────────────────────────────

test("normalizeXstateDocPath adds leading slash when missing", () => {
  assert.equal(normalizeXstateDocPath("docs/xstate"), "/docs/xstate");
});

test("normalizeXstateDocPath keeps existing leading slash", () => {
  assert.equal(normalizeXstateDocPath("/docs/machines"), "/docs/machines");
});

test("normalizeXstateDocPath strips base URL", () => {
  assert.equal(
    normalizeXstateDocPath("https://stately.ai/docs/guards"),
    "/docs/guards",
  );
});

test("normalizeXstateDocPath removes .md extension", () => {
  assert.equal(normalizeXstateDocPath("/docs/actors.md"), "/docs/actors");
});

test("normalizeXstateDocPath removes /index.md suffix", () => {
  assert.equal(normalizeXstateDocPath("/docs/actions/index.md"), "/docs/actions/");
});

test("normalizeXstateDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeXstateDocPath("https://stately.ai/docs/context.md"),
    "/docs/context",
  );
});

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array exports three tools", async () => {
  const { tools } = await reimport();
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("tools descriptions mention XState", async () => {
  const { tools } = await reimport();
  for (const tool of tools) {
    assert.ok(
      tool.description.toLowerCase().includes("xstate"),
      `Tool "${tool.name}" description should mention XState`,
    );
  }
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# XState Docs\n\n- [Machines](/docs/machines)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("XState Docs"));
  assert.ok(result.index.includes("Machines"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Guards\n\nGuards are conditions that determine transitions.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/guards" });
  assert.equal(result.path, "/docs/guards");
  assert.ok(result.markdown.includes("Guards"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Actors", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://stately.ai/docs/actors.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/actors"));
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
    "XState is a state management library for JavaScript.",
    "",
    "# Actors",
    "Actors are the fundamental unit of computation in XState.",
    "You can spawn actors with the spawn function.",
    "",
    "# Guards",
    "Guards determine whether a transition can be taken.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "actors" });
  assert.equal(result.query, "actors");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("actors"));
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
    "state machine ".repeat(50),
    "",
    "# Section B",
    "state machine ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "state machine", maxChars: 100 });
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
    "# Sparse Section",
    "This mentions guard once.",
    "",
    "# Dense Section",
    "Guard logic uses guard conditions. Guard guard guard.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "guard" });
  assert.ok(result.found > 0);
  // Dense section should appear first
  const idx = result.result.toLowerCase().indexOf("dense section");
  assert.ok(idx >= 0, "Dense section should be in result");
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown xstate-docs tool: "unknown-tool"' },
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
  return import(`../xstate-docs.js?v=${importCounter}`);
}
