import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeNeonDocPath } from "../neon-docs.js";

const BASE = "https://neon.com";

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

// ─── normalizeNeonDocPath ────────────────────────────────────────

test("normalizeNeonDocPath converts neon.com absolute URLs to clean paths", () => {
  assert.equal(
    normalizeNeonDocPath("https://neon.com/docs/introduction"),
    "/docs/introduction",
  );
  assert.equal(
    normalizeNeonDocPath("https://neon.com/docs/connect/connect-intro"),
    "/docs/connect/connect-intro",
  );
  assert.equal(
    normalizeNeonDocPath("https://neon.com/docs/guides/branching-intro"),
    "/docs/guides/branching-intro",
  );
});

test("normalizeNeonDocPath converts neon.tech absolute URLs to clean paths", () => {
  assert.equal(
    normalizeNeonDocPath("https://neon.tech/docs/introduction"),
    "/docs/introduction",
  );
  assert.equal(
    normalizeNeonDocPath("https://neon.tech/docs/serverless/serverless-driver"),
    "/docs/serverless/serverless-driver",
  );
});

test("normalizeNeonDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeNeonDocPath("/docs/introduction.md"),
    "/docs/introduction",
  );
  assert.equal(
    normalizeNeonDocPath("/docs/guides/index.md"),
    "/docs/guides",
  );
  assert.equal(
    normalizeNeonDocPath("docs/connect/connect-intro.md"),
    "/docs/connect/connect-intro",
  );
});

test("normalizeNeonDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeNeonDocPath("docs/introduction"),
    "/docs/introduction",
  );
  assert.equal(
    normalizeNeonDocPath("docs/reference/api-reference"),
    "/docs/reference/api-reference",
  );
});

test("normalizeNeonDocPath strips query params and hash", () => {
  assert.equal(
    normalizeNeonDocPath("/docs/introduction?tab=get-started#overview"),
    "/docs/introduction",
  );
  assert.equal(
    normalizeNeonDocPath("https://neon.tech/docs/guides/branching-intro#create-branch"),
    "/docs/guides/branching-intro",
  );
});

test("normalizeNeonDocPath returns empty string for empty input", () => {
  assert.equal(normalizeNeonDocPath(""), "");
  assert.equal(normalizeNeonDocPath(null), "");
  assert.equal(normalizeNeonDocPath(undefined), "");
});

test("normalizeNeonDocPath strips trailing slash", () => {
  assert.equal(
    normalizeNeonDocPath("/docs/introduction/"),
    "/docs/introduction",
  );
});

// ─── get-index ───────────────────────────────────────────────────

test("get-index fetches and returns the Neon llms.txt index", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse("# Neon Documentation\n\n- [Introduction](/docs/introduction)\n- [Connect](/docs/connect/connect-intro)");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-index");

    assert.ok(result.index.includes("Neon Documentation"));
    assert.ok(result.index.includes("/docs/introduction"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ────────────────────────────────────────────────────

test("get-page fetches a Neon doc page as markdown", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/introduction.md`) {
      return createResponse("# Introduction\n\nNeon is a serverless Postgres platform.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/introduction" });

    assert.equal(result.path, "/docs/introduction");
    assert.match(result.markdown, /serverless postgres/i);
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

    if (url === `${BASE}/docs/guides/branching-intro`) {
      return createResponse("# Branching\n\nCreate database branches for development.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/guides/branching-intro" });

    assert.equal(result.path, "/docs/guides/branching-intro");
    assert.match(result.markdown, /branching/i);
    assert.ok(fetchedUrls.includes(`${BASE}/docs/guides/branching-intro.md`), "Should try .md extension first");
    assert.ok(fetchedUrls.includes(`${BASE}/docs/guides/branching-intro`), "Should try bare path as fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/serverless/serverless-driver.md`) {
      return createResponse("# Serverless Driver\n\nConnect from serverless environments.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://neon.tech/docs/serverless/serverless-driver" });

    assert.equal(result.path, "/docs/serverless/serverless-driver");
    assert.match(result.markdown, /serverless/i);
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

test("get-page skips responses that are actually HTML", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/import/import-from-postgres.md`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${BASE}/docs/import/import-from-postgres/index.md`) {
      return createResponse("# Import from Postgres\n\nMigrate your existing database to Neon.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/import/import-from-postgres" });

    assert.equal(result.path, "/docs/import/import-from-postgres");
    assert.match(result.markdown, /import/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

// ─── search-docs ─────────────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Connection pooling",
        "Neon uses PgBouncer for connection pooling.",
        "Configure pooling settings in your project dashboard.",
        "",
        "# Branching and environments",
        "Create branches for development and testing environments.",
        "Use branching with your CI/CD pipeline for isolated testing.",
        "Branches are lightweight copies of your database.",
        "",
        "# Autoscaling",
        "Neon automatically scales compute resources up and down.",
        "Configure autoscaling limits in project settings.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "branching testing environments" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /branch/i, "Top result should contain branching terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /branch/i, "First section should be the best match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs filters stop words from query", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Autoscaling",
        "Neon automatically scales compute up and down.",
        "Configure autoscaling limits for your project.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the autoscaling in neon" });

    assert.ok(result.found > 0, "Should find autoscaling section despite stop words");
    assert.match(result.result, /autoscal/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Section A",
        "Content about branching and point-in-time restore.",
        "---",
        "Content about branching workflows in CI/CD.",
        "---",
        "# Section B",
        "More about branching and database copies.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "branching" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns no results message when nothing matches", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse("# Introduction\n\nNeon is a serverless Postgres platform.\n");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "xyznonexistent" });

    assert.equal(result.found, 0);
    assert.match(result.result, /no relevant/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.match(err.message, /unknown neon-docs tool/i);
      return true;
    },
  );
});
