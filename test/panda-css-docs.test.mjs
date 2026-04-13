import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizePandaCssDocPath, tools } from "../panda-css-docs.js";

const BASE = "https://panda-css.com";

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
});

test("tools have correct names", () => {
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has name, description, and parameters", () => {
  for (const tool of tools) {
    assert.ok(typeof tool.name === "string" && tool.name.length > 0);
    assert.ok(typeof tool.description === "string" && tool.description.length > 0);
    assert.ok(typeof tool.parameters === "object" && tool.parameters !== null);
  }
});

// ─── normalizePandaCssDocPath ────────────────────────────────────

test("normalizePandaCssDocPath strips base URL", () => {
  assert.equal(
    normalizePandaCssDocPath("https://panda-css.com/docs/concepts/writing-styles"),
    "/docs/concepts/writing-styles",
  );
  assert.equal(
    normalizePandaCssDocPath("https://panda-css.com/docs/installation/astro"),
    "/docs/installation/astro",
  );
});

test("normalizePandaCssDocPath ensures leading slash", () => {
  assert.equal(
    normalizePandaCssDocPath("docs/concepts/tokens"),
    "/docs/concepts/tokens",
  );
  assert.equal(
    normalizePandaCssDocPath("docs/overview/getting-started"),
    "/docs/overview/getting-started",
  );
});

test("normalizePandaCssDocPath removes .md suffix", () => {
  assert.equal(
    normalizePandaCssDocPath("/docs/concepts/recipes.md"),
    "/docs/concepts/recipes",
  );
  assert.equal(
    normalizePandaCssDocPath("docs/guides/dynamic-styling.md"),
    "/docs/guides/dynamic-styling",
  );
});

test("normalizePandaCssDocPath removes /index.md suffix", () => {
  assert.equal(
    normalizePandaCssDocPath("/docs/concepts/index.md"),
    "/docs/concepts",
  );
  assert.equal(
    normalizePandaCssDocPath("docs/installation/index.md"),
    "/docs/installation",
  );
});

test("normalizePandaCssDocPath handles combo: base URL + .md", () => {
  assert.equal(
    normalizePandaCssDocPath("https://panda-css.com/docs/concepts/patterns.md"),
    "/docs/concepts/patterns",
  );
  assert.equal(
    normalizePandaCssDocPath("https://panda-css.com/docs/overview/index.md"),
    "/docs/overview",
  );
});

test("normalizePandaCssDocPath returns empty string for empty input", () => {
  assert.equal(normalizePandaCssDocPath(""), "");
  assert.equal(normalizePandaCssDocPath(null), "");
  assert.equal(normalizePandaCssDocPath(undefined), "");
});

// ─── invoke error handling ───────────────────────────────────────

test("invoke throws on unknown tool name", () => {
  assert.rejects(
    () => invoke("nonexistent-tool"),
    (err) => {
      assert.match(err.message, /unknown panda-css-docs tool/i);
      return true;
    },
  );
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    (err) => {
      assert.match(err.message, /requires.*path/i);
      return true;
    },
  );
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    (err) => {
      assert.match(err.message, /requires.*query/i);
      return true;
    },
  );
});

// ─── search-docs scoring ─────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Writing Styles",
        "Panda CSS provides a css function for writing styles.",
        "You can use tokens and conditions in your styles.",
        "",
        "# Recipes and Patterns",
        "Recipes let you define multi-variant styles with recipes.",
        "Patterns are layout compositions like stack, flex, grid.",
        "Use recipes for component variants.",
        "",
        "# Installation",
        "Install Panda CSS with your package manager.",
        "Run the init command to set up your project.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "recipes component variants" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /recipe|variant/i, "Top result should contain recipe/variant terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /recipe|variant/i, "First section should be the best match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Tokens",
        "Design tokens are the foundation. ".repeat(50),
        "---",
        "# More Tokens",
        "Token aliases and semantic tokens. ".repeat(50),
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "tokens", maxChars: 200 });

    assert.ok(result.result.length <= 200, `Result should be <= 200 chars, got ${result.result.length}`);
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
        "# Responsive Design",
        "Panda CSS supports responsive breakpoints and conditions.",
        "Use responsive arrays or object syntax for responsive styles.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the responsive design in panda" });

    assert.ok(result.found > 0, "Should find section despite stop words");
    assert.match(result.result, /responsive/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Section A",
        "Content about tokens and design tokens.",
        "---",
        "Content about semantic tokens.",
        "---",
        "# Section B",
        "More about tokens and token aliases.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "tokens" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs applies heading boost to sections starting with #", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# CSS Function",
        "The css function is the main API.",
        "---",
        "You can also use the css function inline.",
        "The css function accepts style objects.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "css function" });

    assert.ok(result.found >= 1, "Should find matching sections");
    const sections = result.result.split("---").map((s) => s.trim());
    if (sections.length >= 2) {
      assert.match(sections[0], /^#/m, "Heading section should rank first due to 1.5x boost");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
