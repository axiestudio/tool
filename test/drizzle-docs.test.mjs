import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeDrizzleDocPath } from "../drizzle-docs.js";

const BASE = "https://orm.drizzle.team";

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

// ─── normalizeDrizzleDocPath ─────────────────────────────────────

test("normalizeDrizzleDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeDrizzleDocPath("https://orm.drizzle.team/docs/select"),
    "/docs/select",
  );
  assert.equal(
    normalizeDrizzleDocPath("https://orm.drizzle.team/docs/relations"),
    "/docs/relations",
  );
  assert.equal(
    normalizeDrizzleDocPath("https://orm.drizzle.team/docs/column-types/pg"),
    "/docs/column-types/pg",
  );
});

test("normalizeDrizzleDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeDrizzleDocPath("/docs/select.md"),
    "/docs/select",
  );
  assert.equal(
    normalizeDrizzleDocPath("/docs/migrations/index.md"),
    "/docs/migrations",
  );
  assert.equal(
    normalizeDrizzleDocPath("docs/relations.md"),
    "/docs/relations",
  );
});

test("normalizeDrizzleDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeDrizzleDocPath("docs/joins"),
    "/docs/joins",
  );
  assert.equal(
    normalizeDrizzleDocPath("docs/rls"),
    "/docs/rls",
  );
});

test("normalizeDrizzleDocPath strips query params and hash", () => {
  assert.equal(
    normalizeDrizzleDocPath("/docs/select?tab=pg#usage"),
    "/docs/select",
  );
  assert.equal(
    normalizeDrizzleDocPath("https://orm.drizzle.team/docs/insert#returning"),
    "/docs/insert",
  );
});

test("normalizeDrizzleDocPath returns empty string for empty input", () => {
  assert.equal(normalizeDrizzleDocPath(""), "");
  assert.equal(normalizeDrizzleDocPath(null), "");
  assert.equal(normalizeDrizzleDocPath(undefined), "");
});

test("normalizeDrizzleDocPath strips trailing slash", () => {
  assert.equal(
    normalizeDrizzleDocPath("/docs/select/"),
    "/docs/select",
  );
});

// ─── search-docs multi-term scoring ──────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# SELECT queries",
        "Use db.select() to run SELECT queries against your database.",
        "You can filter results with .where() clauses.",
        "",
        "# Relations and joins",
        "Drizzle supports relational queries with relations.",
        "Use joins for complex relational queries across tables.",
        "Relations are powerful for nested data.",
        "",
        "# Migrations",
        "Run migrations with drizzle-kit to update your schema.",
        "Migrations keep your database in sync.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "relational queries joins" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /relations|joins/i, "Top result should contain relations/joins terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /relations|joins/i, "First section should be the best match");
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
        "# Row-level security",
        "RLS policies restrict row access in PostgreSQL.",
        "Configure RLS with Drizzle for multi-tenant apps.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the rls in drizzle" });

    assert.ok(result.found > 0, "Should find RLS section despite stop words");
    assert.match(result.result, /rls/i);
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
        "Content about transactions and rollback.",
        "---",
        "Content about indexes in PostgreSQL.",
        "---",
        "# Section B",
        "More about transactions and savepoints.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "transactions" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page fallback chain ─────────────────────────────────────

test("get-page tries multiple URL patterns before failing", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    if (url === `${BASE}/docs/relations`) {
      return createResponse("# Relations\n\nDrizzle relational queries.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/relations" });

    assert.equal(result.path, "/docs/relations");
    assert.match(result.markdown, /relational queries/i);
    assert.ok(fetchedUrls.includes(`${BASE}/docs/relations.md`), "Should try .md extension first");
    assert.ok(fetchedUrls.includes(`${BASE}/docs/relations`), "Should try bare path as fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/select.md`) {
      return createResponse("# SELECT\n\nBuild select queries.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://orm.drizzle.team/docs/select" });

    assert.equal(result.path, "/docs/select");
    assert.match(result.markdown, /select/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/docs/nonexistent" }),
      (err) => {
        assert.match(err.message, /not found/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page skips HTML responses ───────────────────────────────

test("get-page skips responses that are actually HTML", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/insert.md`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${BASE}/docs/insert/index.md`) {
      return createResponse("# INSERT\n\nInsert rows into tables.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/insert" });

    assert.equal(result.path, "/docs/insert");
    assert.match(result.markdown, /insert/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── error handling ──────────────────────────────────────────────

test("search-docs returns human-readable error on 404", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("search-docs", { query: "anything" }),
      (err) => {
        assert.match(err.message, /not found.*404/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-index returns human-readable error on network failure", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => { throw new Error("ECONNRESET"); };

  try {
    await assert.rejects(
      () => invoke("get-index"),
      (err) => {
        assert.match(err.message, /network error/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
