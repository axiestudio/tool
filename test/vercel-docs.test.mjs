import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeVercelDocPath, tools } from "../vercel-docs.js";

const BASE = "https://vercel.com";

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

test("tools array exports exactly three tools", () => {
  assert.equal(tools.length, 3);
});

test("tools have correct names and structure", () => {
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
  for (const t of tools) {
    assert.equal(typeof t.description, "string");
    assert.ok(t.description.length > 0);
    assert.equal(typeof t.parameters, "object");
  }
});

// ─── normalizeVercelDocPath ──────────────────────────────────────

test("normalizeVercelDocPath strips base URL", () => {
  assert.equal(
    normalizeVercelDocPath("https://vercel.com/docs/getting-started"),
    "/docs/getting-started",
  );
});

test("normalizeVercelDocPath adds leading slash for relative path", () => {
  assert.equal(
    normalizeVercelDocPath("docs/functions/serverless-functions"),
    "/docs/functions/serverless-functions",
  );
});

test("normalizeVercelDocPath removes .md extension", () => {
  assert.equal(
    normalizeVercelDocPath("/docs/deployments/overview.md"),
    "/docs/deployments/overview",
  );
});

test("normalizeVercelDocPath removes /index.md suffix", () => {
  assert.equal(
    normalizeVercelDocPath("/docs/functions/index.md"),
    "/docs/functions",
  );
});

test("normalizeVercelDocPath handles base URL + .md combo", () => {
  assert.equal(
    normalizeVercelDocPath("https://vercel.com/docs/edge-middleware.md"),
    "/docs/edge-middleware",
  );
});

test("normalizeVercelDocPath returns empty string for empty input", () => {
  assert.equal(normalizeVercelDocPath(""), "");
  assert.equal(normalizeVercelDocPath(null), "");
  assert.equal(normalizeVercelDocPath(undefined), "");
});

// ─── invoke unknown tool ─────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  await assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.match(err.message, /unknown vercel-docs tool/i);
      return true;
    },
  );
});

// ─── get-page throws when path missing ───────────────────────────

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    (err) => {
      assert.match(err.message, /requires.*path/i);
      return true;
    },
  );
});

// ─── search-docs throws when query missing ───────────────────────

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
        "# Edge Middleware",
        "Vercel Edge Middleware runs before a request is processed.",
        "Configure middleware in your project root.",
        "",
        "# Serverless Functions and Edge Functions",
        "Deploy serverless functions and edge functions on Vercel.",
        "Edge functions run at the edge network close to your users.",
        "Serverless functions scale automatically.",
        "",
        "# Domains",
        "Manage custom domains for your Vercel deployments.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "serverless edge functions" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /serverless|edge/i, "Top result should contain query terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /serverless|edge/i, "First section should be the best match");
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
      const longDoc = Array.from({ length: 50 }, (_, i) =>
        `# Section ${i}\nThis section talks about deployments and deployment configuration details.`,
      ).join("\n\n");
      return createResponse(longDoc);
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "deployments", maxChars: 200 });
    assert.ok(result.result.length <= 200);
    assert.ok(result.found > 0);
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
        "# Domains",
        "Configure custom domains for your Vercel project.",
        "Add and verify domains in the dashboard.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to configure the domains in vercel" });

    assert.ok(result.found > 0, "Should find domains section despite stop words");
    assert.match(result.result, /domain/i);
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
        "Content about caching and ISR strategies.",
        "---",
        "Content about caching at the edge network.",
        "---",
        "# Section B",
        "More about caching and CDN configuration.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "caching" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns no-results message when nothing matches", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse("# Introduction\n\nVercel is a cloud platform for frontend developers.\n");
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
