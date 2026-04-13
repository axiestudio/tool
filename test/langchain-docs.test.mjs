import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeLangchainDocPath, tools } from "../langchain-docs.js";

const BASE = "https://js.langchain.com";

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

// ─── tools array ─────────────────────────────────────────────────

test("tools exports exactly 3 tools", () => {
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has name, description, and parameters", () => {
  for (const tool of tools) {
    assert.ok(tool.name, "tool must have a name");
    assert.ok(tool.description, "tool must have a description");
    assert.ok("parameters" in tool, "tool must have parameters");
  }
});

// ─── invoke throws on unknown tool ──────────────────────────────

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown langchain-docs tool/ },
  );
});

// ─── get-page requires path ─────────────────────────────────────

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /get-page requires `path`/ },
  );
});

// ─── search-docs requires query ─────────────────────────────────

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /search-docs requires `query`/ },
  );
});

// ─── normalizeLangchainDocPath ──────────────────────────────────

test("normalizeLangchainDocPath strips absolute URL prefix", () => {
  assert.equal(
    normalizeLangchainDocPath("https://js.langchain.com/docs/concepts/agents"),
    "/docs/concepts/agents",
  );
  assert.equal(
    normalizeLangchainDocPath("https://js.langchain.com/docs/how_to/tool_calling"),
    "/docs/how_to/tool_calling",
  );
});

test("normalizeLangchainDocPath ensures leading slash", () => {
  assert.equal(
    normalizeLangchainDocPath("docs/tutorials/rag"),
    "/docs/tutorials/rag",
  );
});

test("normalizeLangchainDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeLangchainDocPath("/docs/introduction.md"),
    "/docs/introduction",
  );
  assert.equal(
    normalizeLangchainDocPath("/docs/concepts/index.md"),
    "/docs/concepts",
  );
});

test("normalizeLangchainDocPath strips trailing slash", () => {
  assert.equal(
    normalizeLangchainDocPath("/docs/concepts/agents/"),
    "/docs/concepts/agents",
  );
});

test("normalizeLangchainDocPath returns empty string for empty input", () => {
  assert.equal(normalizeLangchainDocPath(""), "");
  assert.equal(normalizeLangchainDocPath(null), "");
  assert.equal(normalizeLangchainDocPath(undefined), "");
});

// ─── search-docs multi-term scoring ─────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Tool calling",
        "LangChain supports tool calling with chat models.",
        "Bind tools to a model and invoke them in a chain.",
        "",
        "# Retrieval-augmented generation",
        "RAG combines retrieval with generation.",
        "Use a vector store for document retrieval.",
        "",
        "# Agents",
        "Agents use tool calling to decide actions.",
        "An agent selects tools dynamically based on the query.",
        "Tool calling is central to agentic workflows.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "tool calling agents" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /tool calling|agent/i, "Top result should match query terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /tool calling|agent/i, "First section should be the best match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs maxChars ───────────────────────────────────────

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      const longSection = "# Streaming\n" + "Streaming allows token-by-token output. ".repeat(100);
      return createResponse(longSection);
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "streaming", maxChars: 200 });

    assert.ok(result.result.length <= 200, `Result should be at most 200 chars, got ${result.result.length}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs stop words ─────────────────────────────────────

test("search-docs filters stop words from query", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# LCEL",
        "LangChain Expression Language composes chains declaratively.",
        "LCEL enables piping runnables together.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the LCEL in a chain" });

    assert.ok(result.found > 0, "Should find LCEL section despite stop words");
    assert.match(result.result, /lcel/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs splits on headings and HR ──────────────────────

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Chat models",
        "Chat models accept messages and return messages.",
        "---",
        "Embeddings convert text to vectors for retrieval.",
        "---",
        "# Chains",
        "Chains compose multiple steps with chat models.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "chat models" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs heading boost ──────────────────────────────────

test("search-docs boosts score when query term appears in heading", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Vector stores",
        "Vector stores hold embeddings for similarity search.",
        "",
        "# Document loaders",
        "Loaders bring data in. Some loaders convert to vector stores.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "vector stores" });

    assert.ok(result.found > 0, "Should find sections");
    const firstSection = result.result.split("---")[0];
    assert.match(firstSection, /# Vector stores/i, "Section with heading match should rank first");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
