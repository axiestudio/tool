import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNuxtDocPath } from "../nuxt-docs.js";

// ─── normalizeNuxtDocPath ─────────────────────────────────────────────────────

test("normalizeNuxtDocPath adds leading slash when missing", () => {
  assert.equal(normalizeNuxtDocPath("docs/getting-started/introduction"), "/docs/getting-started/introduction");
});

test("normalizeNuxtDocPath keeps existing leading slash", () => {
  assert.equal(normalizeNuxtDocPath("/docs/api/composables/use-fetch"), "/docs/api/composables/use-fetch");
});

test("normalizeNuxtDocPath strips base URL", () => {
  assert.equal(
    normalizeNuxtDocPath("https://nuxt.com/docs/guide/concepts/auto-imports"),
    "/docs/guide/concepts/auto-imports",
  );
});

test("normalizeNuxtDocPath removes .md extension", () => {
  assert.equal(normalizeNuxtDocPath("/docs/guide/directory-structure/pages.md"), "/docs/guide/directory-structure/pages");
});

test("normalizeNuxtDocPath removes /index.md suffix", () => {
  assert.equal(normalizeNuxtDocPath("/docs/getting-started/index.md"), "/docs/getting-started/");
});

test("normalizeNuxtDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeNuxtDocPath("https://nuxt.com/docs/api/composables/use-fetch.md"),
    "/docs/api/composables/use-fetch",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# Nuxt Docs\n\n- [Introduction](/docs/getting-started/introduction)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("Nuxt Docs"));
  assert.ok(result.index.includes("Introduction"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Auto Imports\n\nNuxt auto-imports composables and utilities.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/docs/guide/concepts/auto-imports" });
  assert.equal(result.path, "/docs/guide/concepts/auto-imports");
  assert.ok(result.markdown.includes("Auto Imports"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Pages", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://nuxt.com/docs/guide/directory-structure/pages.md" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/docs/guide/directory-structure/pages"));
  assert.ok(!requestedUrl.includes(".md"));
});

test("get-page falls back to raw URL when Accept markdown fails", async () => {
  const urls = [];
  const original = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async (url) => {
    urls.push(url);
    callCount++;
    // First call (Accept: text/markdown) fails, second call (raw URL) succeeds
    if (callCount === 1) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("# Middleware\n\nRoute middleware.", { status: 200 });
  };

  const mod = await reimport();
  const result = await mod.invoke("get-page", { path: "/docs/guide/concepts/middleware" });
  globalThis.fetch = original;

  assert.equal(callCount, 2);
  assert.ok(urls[1].includes("/raw/docs/guide/concepts/middleware.md"));
  assert.ok(result.markdown.includes("Middleware"));
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
    "Nuxt is a Vue.js meta-framework.",
    "",
    "# Server Routes",
    "Nuxt server routes are powered by Nitro.",
    "You can define routes in server/api/ directory.",
    "",
    "# Middleware",
    "Middleware runs before rendering a page.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "server routes" });
  assert.equal(result.query, "server routes");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("server routes"));
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
    "middleware ".repeat(50),
    "",
    "# Section B",
    "middleware ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "middleware", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

test("search-docs falls back to llms.txt when llms-full.txt fails", async () => {
  const urls = [];
  const original = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async (url) => {
    urls.push(url);
    callCount++;
    // First call (llms-full.txt) fails, second call (llms.txt) succeeds
    if (callCount === 1) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("# useFetch\n\nuseFetch is a composable for data fetching.", { status: 200 });
  };

  const mod = await reimport();
  const result = await mod.invoke("search-docs", { query: "useFetch" });
  globalThis.fetch = original;

  assert.equal(callCount, 2);
  assert.ok(urls[0].includes("llms-full.txt"));
  assert.ok(urls[1].includes("llms.txt"));
  assert.ok(result.found > 0);
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
    { message: 'Unknown nuxt-docs tool: "unknown-tool"' },
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
  return import(`../nuxt-docs.js?v=${importCounter}`);
}
