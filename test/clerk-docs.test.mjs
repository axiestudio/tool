import assert from "node:assert/strict";
import test from "node:test";

import { normalizeClerkDocPath } from "../clerk-docs.js";

// ─── normalizeClerkDocPath ────────────────────────────────────────────────────

test("normalizeClerkDocPath adds leading slash when missing", () => {
  assert.equal(normalizeClerkDocPath("docs/quickstarts/nextjs"), "/docs/quickstarts/nextjs");
});

test("normalizeClerkDocPath keeps existing leading slash", () => {
  assert.equal(normalizeClerkDocPath("/docs/authentication/overview"), "/docs/authentication/overview");
});

test("normalizeClerkDocPath strips base URL", () => {
  assert.equal(
    normalizeClerkDocPath("https://clerk.com/docs/organizations/overview"),
    "/docs/organizations/overview",
  );
});

test("normalizeClerkDocPath removes .md extension", () => {
  assert.equal(normalizeClerkDocPath("/docs/references/javascript/overview.md"), "/docs/references/javascript/overview");
});

test("normalizeClerkDocPath removes /index.md suffix", () => {
  assert.equal(normalizeClerkDocPath("/docs/quickstarts/index.md"), "/docs/quickstarts/");
});

test("normalizeClerkDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeClerkDocPath("https://clerk.com/docs/authentication/overview.md"),
    "/docs/authentication/overview",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Clerk Docs\n\n- [Next.js Quickstart](/docs/quickstarts/nextjs)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Clerk Docs"));
  assert.ok(result.index.includes("Next.js Quickstart"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Organizations\n\nClerk provides multi-tenant organization support.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/organizations/overview" });
  assert.equal(result.path, "/docs/organizations/overview");
  assert.ok(result.markdown.includes("Organizations"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Authentication", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://clerk.com/docs/authentication/overview.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/authentication/overview"));
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
    "Clerk is a complete authentication and user management platform.",
    "",
    "# Webhooks",
    "Clerk webhooks let you receive real-time notifications.",
    "You can configure webhooks in the Clerk Dashboard.",
    "",
    "# Session Management",
    "Sessions are managed automatically by Clerk.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "webhooks" });
  assert.equal(result.query, "webhooks");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("webhooks"));
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
    "authentication ".repeat(50),
    "",
    "# Section B",
    "authentication ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "authentication", maxChars: 100 });
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
    { message: 'Unknown clerk-docs tool: "unknown-tool"' },
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
  return import(`../clerk-docs.js?v=${importCounter}`);
}
