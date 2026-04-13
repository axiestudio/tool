import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeWxtDocPath } from "../wxt-docs.js";

const BASE = "https://wxt.dev";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/markdown");
  }

  return new Response(body, {
    status: 200,
    ...init,
    headers,
  });
}

// ─── normalizeWxtDocPath ─────────────────────────────────────────

test("normalizeWxtDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeWxtDocPath("https://wxt.dev/guide/essentials/config"),
    "/guide/essentials/config",
  );
  assert.equal(
    normalizeWxtDocPath("https://wxt.dev/api/reference/wxt/client"),
    "/api/reference/wxt/client",
  );
});

test("normalizeWxtDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeWxtDocPath("/guide/essentials/config.md"),
    "/guide/essentials/config",
  );
  assert.equal(
    normalizeWxtDocPath("/guide/essentials/index.md"),
    "/guide/essentials",
  );
  assert.equal(
    normalizeWxtDocPath("guide/content-scripts.md"),
    "/guide/content-scripts",
  );
});

test("normalizeWxtDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeWxtDocPath("guide/essentials/config"),
    "/guide/essentials/config",
  );
  assert.equal(
    normalizeWxtDocPath("api/reference"),
    "/api/reference",
  );
});

test("normalizeWxtDocPath strips query params and hash", () => {
  assert.equal(
    normalizeWxtDocPath("/guide/essentials/config?tab=vite#options"),
    "/guide/essentials/config",
  );
  assert.equal(
    normalizeWxtDocPath("https://wxt.dev/guide/directory-structure#entrypoints"),
    "/guide/directory-structure",
  );
});

test("normalizeWxtDocPath returns empty string for empty input", () => {
  assert.equal(normalizeWxtDocPath(""), "");
  assert.equal(normalizeWxtDocPath(null), "");
  assert.equal(normalizeWxtDocPath(undefined), "");
});

test("normalizeWxtDocPath strips trailing slash", () => {
  assert.equal(
    normalizeWxtDocPath("/guide/essentials/config/"),
    "/guide/essentials/config",
  );
});

// ─── search-docs multi-term scoring ──────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Content Scripts",
        "Content scripts run in the context of web pages.",
        "They can read and modify the DOM of visited pages.",
        "",
        "# Background Scripts",
        "The background script handles browser events.",
        "Use the background entrypoint for persistent logic.",
        "",
        "# Content Script and Background Communication",
        "Content scripts can message the background script.",
        "Use messaging APIs for content-background communication.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "content scripts background messaging" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /content|background|messag/i, "Top result should contain relevant terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /content|background/i, "First section should be the best match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs filters stop words from query", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Manifest Configuration",
        "WXT generates the manifest.json automatically.",
        "Configure permissions and content security policy in wxt.config.ts.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to configure the manifest in wxt" });

    assert.ok(result.found > 0, "Should find manifest section despite stop words");
    assert.match(result.result, /manifest/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs section boundary detection ──────────────────────

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Section A",
        "Content about storage API and local storage.",
        "---",
        "Content about popup entrypoints and UI.",
        "---",
        "# Section B",
        "More about storage and session storage.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "storage" });

    assert.ok(result.found >= 2, "Should find at least 2 sections mentioning storage");
    assert.match(result.result, /storage/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs heading boost ───────────────────────────────────

test("search-docs boosts sections where query terms appear in headings", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Installation",
        "Run npm create wxt@latest to scaffold a new project.",
        "WXT requires Node.js 18 or later.",
        "",
        "# Advanced Configuration",
        "You can customize the build process.",
        "Installation of plugins is handled via wxt.config.ts.",
        "",
        "# Getting Started",
        "The installation process is straightforward.",
        "Follow these steps to install WXT in your project.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "installation" });

    assert.ok(result.found > 0, "Should find installation sections");
    const firstSection = result.result.split("---")[0];
    assert.match(firstSection, /# Installation/i, "Section with heading match should rank first");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs maxChars truncation ─────────────────────────────

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# WXT Overview",
        "WXT is a framework for building web extensions. ".repeat(20),
        "",
        "# WXT Details",
        "WXT supports Chrome, Firefox, Safari, and Edge. ".repeat(20),
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "wxt", maxChars: 200 });

    assert.ok(result.result.length <= 200, `Result should be at most 200 chars, got ${result.result.length}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── invoke error cases ──────────────────────────────────────────

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown wxt-docs tool/ },
  );
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /requires `query`/ },
  );
});
