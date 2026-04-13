import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeTanstackDocPath } from "../tanstack-docs.js";

const BASE = "https://tanstack.com";

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

// ─── normalizeTanstackDocPath ────────────────────────────────────

test("normalizeTanstackDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeTanstackDocPath("https://tanstack.com/query/latest/docs/overview"),
    "/query/latest/docs/overview",
  );
  assert.equal(
    normalizeTanstackDocPath("https://tanstack.com/router/latest/docs/framework/react/quick-start"),
    "/router/latest/docs/framework/react/quick-start",
  );
  assert.equal(
    normalizeTanstackDocPath("https://tanstack.com/table/latest/docs/guide/column-defs"),
    "/table/latest/docs/guide/column-defs",
  );
});

test("normalizeTanstackDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeTanstackDocPath("/query/latest/docs/overview.md"),
    "/query/latest/docs/overview",
  );
  assert.equal(
    normalizeTanstackDocPath("/form/latest/docs/index.md"),
    "/form/latest/docs",
  );
  assert.equal(
    normalizeTanstackDocPath("query/latest/docs/guides/queries.md"),
    "/query/latest/docs/guides/queries",
  );
});

test("normalizeTanstackDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeTanstackDocPath("query/latest/docs/overview"),
    "/query/latest/docs/overview",
  );
  assert.equal(
    normalizeTanstackDocPath("table/latest/docs/guide/column-defs"),
    "/table/latest/docs/guide/column-defs",
  );
});

test("normalizeTanstackDocPath strips query params and hash", () => {
  assert.equal(
    normalizeTanstackDocPath("/query/latest/docs/overview?tab=react#usage"),
    "/query/latest/docs/overview",
  );
  assert.equal(
    normalizeTanstackDocPath("https://tanstack.com/router/latest/docs/guide/routing#file-based"),
    "/router/latest/docs/guide/routing",
  );
});

test("normalizeTanstackDocPath returns empty string for empty input", () => {
  assert.equal(normalizeTanstackDocPath(""), "");
  assert.equal(normalizeTanstackDocPath(null), "");
  assert.equal(normalizeTanstackDocPath(undefined), "");
});

test("normalizeTanstackDocPath strips trailing slash", () => {
  assert.equal(
    normalizeTanstackDocPath("/query/latest/docs/overview/"),
    "/query/latest/docs/overview",
  );
});

// ─── get-index ───────────────────────────────────────────────────

test("get-index fetches TanStack llms.txt and returns index", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms.txt`) {
      return createResponse("# TanStack Docs\n- /query/latest/docs/overview\n- /router/latest/docs/overview");
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-index");
    assert.ok(result.index.includes("TanStack"));
    assert.ok(result.index.includes("/query/"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-index throws on network error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error("Network failure");
  };

  try {
    await assert.rejects(
      () => invoke("get-index"),
      { message: /Network error fetching TanStack index/ },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-index throws on 404", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not Found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-index"),
      { message: /not found \(404\)/i },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ────────────────────────────────────────────────────

test("get-page fetches a TanStack doc page as markdown", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/query/latest/docs/overview`) {
      return createResponse("# TanStack Query Overview\n\nPowerful data synchronization for React.");
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/query/latest/docs/overview" });
    assert.equal(result.path, "/query/latest/docs/overview");
    assert.ok(result.markdown.includes("TanStack Query Overview"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page tries multiple URL patterns before failing", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);
    return new Response("Not Found", { status: 404 });
  };

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/query/latest/docs/overview" }),
      { message: /TanStack page not found/ },
    );
    assert.ok(fetchedUrls.length >= 2, "Should try multiple URL candidates");
    assert.ok(fetchedUrls.includes(`${BASE}/query/latest/docs/overview`));
    assert.ok(fetchedUrls.includes(`${BASE}/query/latest/docs/overview.md`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page skips HTML responses and keeps trying", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/table/latest/docs/guide/column-defs`) {
      return createResponse("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        headers: { "content-type": "text/html" },
      });
    }
    if (url === `${BASE}/table/latest/docs/guide/column-defs.md`) {
      return createResponse("# Column Definitions\n\nDefine your columns here.");
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/table/latest/docs/guide/column-defs" });
    assert.ok(result.markdown.includes("Column Definitions"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /requires `path`/ },
  );
});

test("get-page normalizes absolute URL paths", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/form/latest/docs/overview`) {
      return createResponse("# TanStack Form\n\nType-safe form state management.");
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://tanstack.com/form/latest/docs/overview" });
    assert.equal(result.path, "/form/latest/docs/overview");
    assert.ok(result.markdown.includes("TanStack Form"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs ─────────────────────────────────────────────────

test("search-docs finds relevant sections", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# TanStack Query",
        "useQuery is the primary hook for data fetching.",
        "It provides caching, background updates, and stale data handling.",
        "",
        "# TanStack Router",
        "File-based routing with full type safety.",
        "Supports nested layouts and code splitting.",
        "",
        "# TanStack Table",
        "Headless table utilities for building powerful tables.",
        "Supports sorting, filtering, pagination, and column defs.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "useQuery" });
    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /useQuery/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Section A",
        "useQuery ".repeat(200),
        "",
        "# Section B",
        "useQuery ".repeat(200),
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "useQuery", maxChars: 100 });
    assert.ok(result.result.length <= 103, "Should respect maxChars limit (with ... suffix)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns 'No relevant sections found' for no matches", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms.txt`) {
      return createResponse("# TanStack\nSome content about data management.");
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "xyznonexistent123" });
    assert.equal(result.found, 0);
    assert.equal(result.result, "No relevant sections found.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /requires `query`/ },
  );
});

test("search-docs throws on network error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error("Connection refused");
  };

  try {
    await assert.rejects(
      () => invoke("search-docs", { query: "routing" }),
      { message: /Network error loading TanStack docs/ },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── invoke error ────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown tanstack-docs tool/ },
  );
});
