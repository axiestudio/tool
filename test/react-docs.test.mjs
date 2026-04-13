import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeReactDocPath, tools } from "../react-docs.js";

// ─── normalizeReactDocPath ────────────────────────────────────────────────────

test("normalizeReactDocPath strips base URL", () => {
  assert.equal(normalizeReactDocPath("https://react.dev/reference/react/useState"), "/reference/react/useState");
});

test("normalizeReactDocPath ensures leading slash", () => {
  assert.equal(normalizeReactDocPath("reference/react/useState"), "/reference/react/useState");
});

test("normalizeReactDocPath removes .md extension", () => {
  assert.equal(normalizeReactDocPath("/learn/thinking-in-react.md"), "/learn/thinking-in-react");
});

test("normalizeReactDocPath handles base URL with .md", () => {
  assert.equal(normalizeReactDocPath("https://react.dev/reference/react/useEffect.md"), "/reference/react/useEffect");
});

test("normalizeReactDocPath preserves already-clean paths", () => {
  assert.equal(normalizeReactDocPath("/learn/tutorial-tic-tac-toe"), "/learn/tutorial-tic-tac-toe");
});

// ─── tools array ──────────────────────────────────────────────────────────────

test("tools array exports 3 tools", () => {
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

// ─── get-index ────────────────────────────────────────────────────────────────

test("get-index fetches llms.txt and returns index", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://react.dev/llms.txt");
    return { ok: true, text: async () => "# React Docs\n- /reference/react/useState\n- /learn/thinking-in-react" };
  };

  try {
    const { index } = await invoke("get-index");
    assert.ok(index.includes("/reference/react/useState"));
    assert.ok(index.includes("/learn/thinking-in-react"));
  } finally {
    globalThis.fetch = original;
  }
});

test("get-index throws on fetch failure", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });

  try {
    await assert.rejects(() => invoke("get-index"), /Failed to fetch React llms\.txt: 503/);
  } finally {
    globalThis.fetch = original;
  }
});

// ─── get-page ─────────────────────────────────────────────────────────────────

test("get-page fetches markdown for a React doc page", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url === "https://react.dev/reference/react/useState.md") {
      return { ok: true, text: async () => "# useState\n\n`useState` is a React Hook." };
    }
    return { ok: false };
  };

  try {
    const { path, markdown } = await invoke("get-page", { path: "/reference/react/useState" });
    assert.equal(path, "/reference/react/useState");
    assert.ok(markdown.includes("useState"));
  } finally {
    globalThis.fetch = original;
  }
});

test("get-page falls back to non-.md URL", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url === "https://react.dev/learn/thinking-in-react.md") {
      return { ok: false };
    }
    if (url === "https://react.dev/learn/thinking-in-react") {
      return { ok: true, text: async () => "# Thinking in React\n\nStep by step guide." };
    }
    return { ok: false };
  };

  try {
    const { path, markdown } = await invoke("get-page", { path: "/learn/thinking-in-react" });
    assert.equal(path, "/learn/thinking-in-react");
    assert.ok(markdown.includes("Thinking in React"));
  } finally {
    globalThis.fetch = original;
  }
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(() => invoke("get-page", {}), /get-page requires `path`/);
});

test("get-page throws when page not found", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });

  try {
    await assert.rejects(() => invoke("get-page", { path: "/nonexistent" }), /React page not found/);
  } finally {
    globalThis.fetch = original;
  }
});

// ─── search-docs ──────────────────────────────────────────────────────────────

test("search-docs scores heading-based sections", async () => {
  const original = globalThis.fetch;
  const mockDocs = [
    "# useState",
    "useState is a Hook that lets you add state.",
    "useState returns an array with exactly two values.",
    "# useEffect",
    "useEffect is a Hook that lets you synchronize.",
    "# useContext",
    "useContext reads context values.",
  ].join("\n");

  globalThis.fetch = async () => ({ ok: true, text: async () => mockDocs });

  try {
    const { query, found, result } = await invoke("search-docs", { query: "useState" });
    assert.equal(query, "useState");
    assert.ok(found > 0);
    assert.ok(result.includes("useState"));
  } finally {
    globalThis.fetch = original;
  }
});

test("search-docs respects maxChars", async () => {
  const original = globalThis.fetch;
  const mockDocs = "# Hooks\n" + "useState is great. ".repeat(500);
  globalThis.fetch = async () => ({ ok: true, text: async () => mockDocs });

  try {
    const { result } = await invoke("search-docs", { query: "useState", maxChars: 100 });
    assert.ok(result.length <= 100);
  } finally {
    globalThis.fetch = original;
  }
});

test("search-docs returns fallback when no matches", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => "# React docs\nNothing relevant here." });

  try {
    const { result } = await invoke("search-docs", { query: "xyznonexistent" });
    assert.equal(result, "No relevant sections found.");
  } finally {
    globalThis.fetch = original;
  }
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(() => invoke("search-docs", {}), /search-docs requires `query`/);
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  await assert.rejects(() => invoke("bogus-tool"), /Unknown react-docs tool: "bogus-tool"/);
});
