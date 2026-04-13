import assert from "node:assert/strict";
import test from "node:test";

import { normalizePrismaDocPath } from "../prisma-docs.js";

// ─── normalizePrismaDocPath ───────────────────────────────────────────────────

test("normalizePrismaDocPath adds leading slash when missing", () => {
  assert.equal(normalizePrismaDocPath("docs/getting-started"), "/docs/getting-started");
});

test("normalizePrismaDocPath keeps existing leading slash", () => {
  assert.equal(normalizePrismaDocPath("/docs/concepts/components/prisma-client"), "/docs/concepts/components/prisma-client");
});

test("normalizePrismaDocPath strips base URL", () => {
  assert.equal(
    normalizePrismaDocPath("https://www.prisma.io/docs/guides/database"),
    "/docs/guides/database",
  );
});

test("normalizePrismaDocPath removes .md extension", () => {
  assert.equal(normalizePrismaDocPath("/docs/reference/api-reference.md"), "/docs/reference/api-reference");
});

test("normalizePrismaDocPath removes /index.md suffix", () => {
  assert.equal(normalizePrismaDocPath("/docs/concepts/index.md"), "/docs/concepts/");
});

test("normalizePrismaDocPath handles base URL with .md", () => {
  assert.equal(
    normalizePrismaDocPath("https://www.prisma.io/docs/guides/database.md"),
    "/docs/guides/database",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Prisma Docs\n\n- [Getting Started](/docs/getting-started)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Prisma Docs"));
  assert.ok(result.index.includes("Getting Started"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Prisma Client\n\nPrisma Client is an auto-generated query builder.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/concepts/components/prisma-client" });
  assert.equal(result.path, "/docs/concepts/components/prisma-client");
  assert.ok(result.markdown.includes("Prisma Client"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Database", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://www.prisma.io/docs/guides/database.md" });
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
    "Prisma is a next-generation Node.js and TypeScript ORM.",
    "",
    "# Relations",
    "Prisma relations let you define connections between models.",
    "You can define one-to-one, one-to-many, and many-to-many relations.",
    "",
    "# Migrations",
    "Prisma Migrate generates SQL migration files.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "relations" });
  assert.equal(result.query, "relations");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("relations"));
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
    "schema ".repeat(50),
    "",
    "# Section B",
    "schema ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "schema", maxChars: 100 });
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
    { message: 'Unknown prisma-docs tool: "unknown-tool"' },
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
  return import(`../prisma-docs.js?v=${importCounter}`);
}
