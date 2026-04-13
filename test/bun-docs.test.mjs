import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBunDocPath } from "../bun-docs.js";

// ─── normalizeBunDocPath ──────────────────────────────────────────────────────

test("normalizeBunDocPath strips bun.sh base URL", () => {
  assert.equal(normalizeBunDocPath("https://bun.sh/docs/installation"), "/docs/installation");
  assert.equal(normalizeBunDocPath("https://bun.sh/docs/api/file-io"), "/docs/api/file-io");
});

test("normalizeBunDocPath strips bun.com base URL", () => {
  assert.equal(normalizeBunDocPath("https://bun.com/docs/runtime/modules"), "/docs/runtime/modules");
  assert.equal(normalizeBunDocPath("https://bun.com/docs/bundler"), "/docs/bundler");
});

test("normalizeBunDocPath strips .md suffix", () => {
  assert.equal(normalizeBunDocPath("/docs/installation.md"), "/docs/installation");
  assert.equal(normalizeBunDocPath("https://bun.sh/docs/test/writing.md"), "/docs/test/writing");
});

test("normalizeBunDocPath adds leading slash", () => {
  assert.equal(normalizeBunDocPath("docs/cli/run"), "/docs/cli/run");
});

test("normalizeBunDocPath leaves clean paths unchanged", () => {
  assert.equal(normalizeBunDocPath("/docs/installation"), "/docs/installation");
});

// ─── invoke (mocked fetch) ────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function mockFetch(handler) {
  globalThis.fetch = async (url, opts) => handler(url.toString(), opts);
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("get-index fetches bun.sh/llms.txt", async () => {
  mockFetch((url) => {
    assert.ok(url.includes("bun.sh/llms.txt"));
    return {
      ok: true,
      text: async () => "# Bun Docs\n- /docs/installation\n- /docs/runtime/modules",
    };
  });

  const { invoke } = await import("../bun-docs.js");
  const { index } = await invoke("get-index");
  assert.ok(index.includes("# Bun Docs"));
  assert.ok(index.includes("/docs/installation"));
});

test("get-page returns markdown for a valid path", async () => {
  mockFetch((url) => {
    if (url.endsWith(".md")) {
      return {
        ok: true,
        headers: { get: () => "text/markdown" },
        text: async () => "# Installation\n\nInstall Bun with `curl`.",
      };
    }
    return { ok: false };
  });

  const { invoke } = await import("../bun-docs.js");
  const { path, markdown } = await invoke("get-page", { path: "/docs/installation" });
  assert.equal(path, "/docs/installation");
  assert.ok(markdown.includes("# Installation"));
});

test("get-page falls back to second URL when .md returns 404", async () => {
  let callCount = 0;
  mockFetch((url) => {
    callCount++;
    if (callCount === 1) return { ok: false };
    return {
      ok: true,
      headers: { get: () => "text/markdown" },
      text: async () => "# Bundler\n\nBun includes a bundler.",
    };
  });

  const { invoke } = await import("../bun-docs.js");
  const { markdown } = await invoke("get-page", { path: "/docs/bundler" });
  assert.ok(markdown.includes("# Bundler"));
  assert.equal(callCount, 2);
});

test("get-page throws when page not found", async () => {
  mockFetch(() => ({ ok: false }));

  const { invoke } = await import("../bun-docs.js");
  await assert.rejects(
    () => invoke("get-page", { path: "/docs/nonexistent" }),
    { message: /Bun page not found/ },
  );
});

test("get-page throws when path is missing", async () => {
  const { invoke } = await import("../bun-docs.js");
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /get-page requires `path`/ },
  );
});

test("search-docs returns matching sections", async () => {
  mockFetch((url) => {
    assert.ok(url.includes("bun.sh/llms.txt"));
    return {
      ok: true,
      text: async () => [
        "# Getting Started",
        "Bun is a fast JavaScript runtime.",
        "# File I/O",
        "Bun provides fast file I/O APIs.",
        "Use Bun.file() to read files.",
        "# Testing",
        "Bun includes a test runner.",
      ].join("\n"),
    };
  });

  const { invoke } = await import("../bun-docs.js");
  const { query, found, result } = await invoke("search-docs", { query: "file" });
  assert.equal(query, "file");
  assert.ok(found > 0);
  assert.ok(result.includes("File I/O"));
});

test("search-docs returns fallback when nothing matches", async () => {
  mockFetch(() => ({
    ok: true,
    text: async () => "# Bun Docs\nSome content here.",
  }));

  const { invoke } = await import("../bun-docs.js");
  const { result } = await invoke("search-docs", { query: "zzzznonexistentzzzz" });
  assert.equal(result, "No relevant sections found.");
});

test("search-docs throws when query is missing", async () => {
  const { invoke } = await import("../bun-docs.js");
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /search-docs requires `query`/ },
  );
});

test("search-docs respects maxChars", async () => {
  mockFetch(() => ({
    ok: true,
    text: async () => [
      "# Section A",
      "bun bun bun bun bun bun bun bun bun bun",
      "# Section B",
      "bun bun bun bun bun bun bun bun bun bun",
    ].join("\n"),
  }));

  const { invoke } = await import("../bun-docs.js");
  const { result } = await invoke("search-docs", { query: "bun", maxChars: 50 });
  assert.ok(result.length <= 50);
});

test("invoke throws on unknown tool", async () => {
  const { invoke } = await import("../bun-docs.js");
  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: /Unknown bun-docs tool/ },
  );
});
