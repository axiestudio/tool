import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTursoDocPath } from "../turso-docs.js";

// ─── normalizeTursoDocPath ────────────────────────────────────────────────────

test("normalizeTursoDocPath adds leading slash when missing", () => {
  assert.equal(normalizeTursoDocPath("sdk/ts"), "/sdk/ts");
});

test("normalizeTursoDocPath keeps existing leading slash", () => {
  assert.equal(normalizeTursoDocPath("/cli"), "/cli");
});

test("normalizeTursoDocPath strips base URL", () => {
  assert.equal(
    normalizeTursoDocPath("https://docs.turso.tech/sdk/go"),
    "/sdk/go",
  );
});

test("normalizeTursoDocPath removes .md extension", () => {
  assert.equal(normalizeTursoDocPath("/reference/sql.md"), "/reference/sql");
});

test("normalizeTursoDocPath removes /index.md suffix", () => {
  assert.equal(normalizeTursoDocPath("/cloud/index.md"), "/cloud/");
});

test("normalizeTursoDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeTursoDocPath("https://docs.turso.tech/sdk/ts.md"),
    "/sdk/ts",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Turso Docs\n\n- [CLI](/cli)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Turso Docs"));
  assert.ok(result.index.includes("CLI"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# TypeScript SDK\n\nTurso works with libSQL.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/sdk/ts" });
  assert.equal(result.path, "/sdk/ts");
  assert.ok(result.markdown.includes("TypeScript SDK"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# CLI", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://docs.turso.tech/cli.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/cli"));
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
    "Turso is SQLite for production.",
    "",
    "# Embedded Replicas",
    "Turso embedded replicas run SQLite locally.",
    "You can sync data from the edge with libSQL.",
    "",
    "# CLI",
    "The Turso CLI manages databases and groups.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "embedded replicas" });
  assert.equal(result.query, "embedded replicas");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("embedded replicas"));
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
    "embedded replicas ".repeat(50),
    "",
    "# Section B",
    "embedded replicas ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "embedded replicas", maxChars: 100 });
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
    { message: 'Unknown turso-docs tool: "unknown-tool"' },
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
  return import(`../turso-docs.js?v=${importCounter}`);
}
