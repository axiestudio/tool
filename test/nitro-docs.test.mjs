import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNitroDocPath } from "../nitro-docs.js";

const BASE = "https://nitro.build";

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array exports three tools", async () => {
  const { tools } = await reimport();
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("get-index"));
  assert.ok(names.includes("get-page"));
  assert.ok(names.includes("search-docs"));
});

test("tools descriptions mention Nitro", async () => {
  const { tools } = await reimport();
  for (const t of tools) {
    assert.ok(
      t.description.toLowerCase().includes("nitro"),
      `Tool "${t.name}" description should mention Nitro`,
    );
  }
});

// ─── normalizeNitroDocPath ────────────────────────────────────────────────────

test("normalizeNitroDocPath adds leading slash when missing", () => {
  assert.equal(normalizeNitroDocPath("docs/guide/routing"), "/docs/guide/routing");
});

test("normalizeNitroDocPath keeps existing leading slash", () => {
  assert.equal(normalizeNitroDocPath("/docs/guide/cache"), "/docs/guide/cache");
});

test("normalizeNitroDocPath strips base URL", () => {
  assert.equal(
    normalizeNitroDocPath("https://nitro.build/docs/guide/routing"),
    "/docs/guide/routing",
  );
});

test("normalizeNitroDocPath removes .md extension", () => {
  assert.equal(normalizeNitroDocPath("/docs/guide/storage.md"), "/docs/guide/storage");
});

test("normalizeNitroDocPath removes /index.md suffix", () => {
  assert.equal(normalizeNitroDocPath("/docs/guide/index.md"), "/docs/guide");
});

test("normalizeNitroDocPath handles base URL with .md", () => {
  assert.equal(
    normalizeNitroDocPath("https://nitro.build/docs/guide/cache.md"),
    "/docs/guide/cache",
  );
});

// ─── invoke throws for unknown tool ───────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown nitro-docs tool: "unknown-tool"' },
  );
});

// ─── get-page requires path ───────────────────────────────────────────────────

test("get-page throws when path is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("get-page", {}),
    { message: "get-page requires `path`" },
  );
});

// ─── search-docs requires query ───────────────────────────────────────────────

test("search-docs throws when query is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: "search-docs requires `query`" },
  );
});

// ─── search-docs scoring ─────────────────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return new Response([
        "# Storage",
        "Nitro uses storage for persisting data.",
        "You can configure storage drivers.",
        "",
        "# Cache and Storage",
        "Nitro cache uses storage drivers under the hood.",
        "Cache and storage work together for optimal performance.",
        "Storage drivers can be configured for cache backends.",
        "",
        "# Getting Started",
        "Nitro is a next-generation server toolkit.",
      ].join("\n"), { status: 200 });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const mod = await reimport();
    const result = await mod.invoke("search-docs", { query: "cache storage drivers" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /cache|storage/i, "Top result should contain cache/storage terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /cache.*storage|storage.*cache/i, "First section should be the best multi-term match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs prefers sections with more matches", async () => {
  const docs = [
    "# Low match",
    "This section mentions routing once.",
    "",
    "# High match",
    "Routing routing routing — this section mentions routing many times.",
    "Routing is powerful. Routing is flexible.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "routing" });
  assert.ok(result.found > 0);
  const firstLine = result.result.split("\n")[0];
  assert.ok(
    firstLine.includes("High match") || result.result.indexOf("High match") < result.result.indexOf("Low match"),
    "Higher-scoring section should come first",
  );
});

// ─── search-docs maxChars ─────────────────────────────────────────────────────

test("search-docs respects maxChars", async () => {
  const docs = [
    "# Section A",
    "routing ".repeat(50),
    "",
    "# Section B",
    "routing ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "routing", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

// ─── search-docs stop words ──────────────────────────────────────────────────

test("search-docs filters stop words from query", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return new Response([
        "# Cache Layer",
        "The cache layer in Nitro provides edge caching for routes.",
        "Configure cache with defineCache() for optimal performance.",
      ].join("\n"), { status: 200 });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const mod = await reimport();
    const result = await mod.invoke("search-docs", { query: "how to use the cache in nitro" });

    assert.ok(result.found > 0, "Should find cache section despite stop words");
    assert.match(result.result, /cache/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs splitting ───────────────────────────────────────────────────

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return new Response([
        "# Section A",
        "Content about deployment and hosting.",
        "---",
        "Content about deployment to Cloudflare.",
        "---",
        "# Section B",
        "More about deployment and providers.",
      ].join("\n"), { status: 200 });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const mod = await reimport();
    const result = await mod.invoke("search-docs", { query: "deployment" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns fallback message when nothing matches", async () => {
  const docs = "# Introduction\n\nSome unrelated content here.";
  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "xyznonexistent" });
  assert.equal(result.found, 0);
  assert.equal(result.result, "No relevant sections found.");
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
  return import(`../nitro-docs.js?v=${importCounter}`);
}
