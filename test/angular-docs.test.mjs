import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAngularDocPath } from "../angular-docs.js";

// ─── normalizeAngularDocPath ──────────────────────────────────────────────────

test("normalizeAngularDocPath adds leading slash when missing", () => {
  assert.equal(normalizeAngularDocPath("guide/components"), "/guide/components");
});

test("normalizeAngularDocPath keeps existing leading slash", () => {
  assert.equal(normalizeAngularDocPath("/guide/signals"), "/guide/signals");
});

test("normalizeAngularDocPath strips base URL", () => {
  assert.equal(
    normalizeAngularDocPath("https://angular.dev/guide/di"),
    "/guide/di",
  );
});

test("normalizeAngularDocPath removes .md extension", () => {
  assert.equal(normalizeAngularDocPath("/guide/routing.md"), "/guide/routing");
});

test("normalizeAngularDocPath removes /index.md suffix", () => {
  assert.equal(normalizeAngularDocPath("/guide/forms/index.md"), "/guide/forms/");
});

test("normalizeAngularDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeAngularDocPath("https://angular.dev/guide/signals.md"),
    "/guide/signals",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Angular Docs\n\n- [Components](/guide/components)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Angular Docs"));
  assert.ok(result.index.includes("Components"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Components\n\nAngular components are the building blocks.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/guide/components" });
  assert.equal(result.path, "/guide/components");
  assert.ok(result.markdown.includes("Components"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Signals", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://angular.dev/guide/signals.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/guide/signals"));
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
    "Angular is a web application framework.",
    "",
    "# Signals",
    "Angular signals provide reactive state management.",
    "You can create signals with signal() and computed().",
    "",
    "# Routing",
    "The Angular router enables navigation between views.",
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
    "signals ".repeat(50),
    "",
    "# Section B",
    "signals ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "signals", maxChars: 100 });
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
    { message: 'Unknown angular-docs tool: "unknown-tool"' },
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
  return import(`../angular-docs.js?v=${importCounter}`);
}
