import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeTauriDocPath, tools } from "../tauri-docs.js";

const BASE = "https://v2.tauri.app";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/markdown");
  }
  return new Response(body, { status: 200, ...init, headers });
}

// ─── tools array ─────────────────────────────────────────────────

test("tools array contains exactly 3 tools", () => {
  assert.equal(tools.length, 3);
});

test("tools have correct names", () => {
  const names = tools.map(t => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has name, description, and parameters", () => {
  for (const tool of tools) {
    assert.ok(typeof tool.name === "string" && tool.name.length > 0);
    assert.ok(typeof tool.description === "string" && tool.description.length > 0);
    assert.ok(typeof tool.parameters === "object");
  }
});

// ─── normalizeTauriDocPath ───────────────────────────────────────

test("normalizeTauriDocPath strips base URL prefix", () => {
  assert.equal(normalizeTauriDocPath("https://v2.tauri.app/start/create-project/"), "/start/create-project/");
  assert.equal(normalizeTauriDocPath("https://v2.tauri.app/develop/"), "/develop/");
});

test("normalizeTauriDocPath ensures leading slash", () => {
  assert.equal(normalizeTauriDocPath("start/create-project"), "/start/create-project");
  assert.equal(normalizeTauriDocPath("plugin/barcode-scanner"), "/plugin/barcode-scanner");
});

test("normalizeTauriDocPath removes .md extension", () => {
  assert.equal(normalizeTauriDocPath("/start/create-project.md"), "/start/create-project");
  assert.equal(normalizeTauriDocPath("develop/calling-rust.md"), "/develop/calling-rust");
});

test("normalizeTauriDocPath removes /index.md suffix", () => {
  assert.equal(normalizeTauriDocPath("/start/index.md"), "/start/");
  assert.equal(normalizeTauriDocPath("/develop/index.md"), "/develop/");
});

test("normalizeTauriDocPath handles base URL + .md combo", () => {
  assert.equal(normalizeTauriDocPath("https://v2.tauri.app/start/create-project.md"), "/start/create-project");
  assert.equal(normalizeTauriDocPath("https://v2.tauri.app/develop/index.md"), "/develop/");
});

test("normalizeTauriDocPath returns empty string for empty input", () => {
  assert.equal(normalizeTauriDocPath(""), "");
  assert.equal(normalizeTauriDocPath(null), "");
  assert.equal(normalizeTauriDocPath(undefined), "");
});

// ─── invoke errors ───────────────────────────────────────────────

test("invoke throws for unknown tool", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown tauri-docs tool/ },
  );
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /get-page requires `path`/ },
  );
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /search-docs requires `query`/ },
  );
});

// ─── search-docs scoring via mock fetch ──────────────────────────

test("search-docs scores heading sections higher than plain text", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# IPC Commands and Events",
        "Tauri provides a powerful IPC system for communication.",
        "IPC is a core feature of Tauri v2.",
        "",
        "This plain paragraph mentions ipc once without a heading.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "IPC" });
    assert.ok(result.found > 0, "Should find matching sections");
    assert.ok(
      result.result.startsWith("# IPC"),
      "Heading section should appear first due to 1.5x heading boost",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs applies multi-term bonus when multiple terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Window Management",
        "Create and manage windows in Tauri.",
        "",
        "---",
        "",
        "# Plugin System",
        "Tauri plugins extend window capabilities with custom commands.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "window plugin commands" });
    assert.ok(result.found >= 1, "Should find matching sections");
    // The section mentioning both "window" + "plugin" + "commands" should rank higher
    assert.ok(result.result.includes("Plugin System"), "Multi-term section should be included");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
