import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeResendDocPath, tools } from "../resend-docs.js";

const BASE = "https://resend.com";

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

test("tools exports exactly 3 tool definitions", () => {
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has name, description, and parameters", () => {
  for (const tool of tools) {
    assert.ok(tool.name, "tool must have a name");
    assert.ok(tool.description, "tool must have a description");
    assert.ok(typeof tool.parameters === "object", "tool must have parameters object");
  }
});

// ─── invoke unknown tool ─────────────────────────────────────────

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    { message: /Unknown resend-docs tool/ },
  );
});

// ─── get-page requires path ──────────────────────────────────────

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    { message: /get-page requires `path`/ },
  );
});

// ─── search-docs requires query ──────────────────────────────────

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: /search-docs requires `query`/ },
  );
});

// ─── normalizeResendDocPath ──────────────────────────────────────

test("normalizeResendDocPath strips absolute URL prefix", () => {
  assert.equal(
    normalizeResendDocPath("https://resend.com/docs/send-with-nodejs"),
    "/docs/send-with-nodejs",
  );
  assert.equal(
    normalizeResendDocPath("https://resend.com/docs/api-reference/emails/send-email"),
    "/docs/api-reference/emails/send-email",
  );
});

test("normalizeResendDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeResendDocPath("/docs/send-with-nodejs.md"),
    "/docs/send-with-nodejs",
  );
  assert.equal(
    normalizeResendDocPath("/docs/dashboard/index.md"),
    "/docs/dashboard",
  );
  assert.equal(
    normalizeResendDocPath("docs/webhooks.md"),
    "/docs/webhooks",
  );
});

test("normalizeResendDocPath ensures leading slash", () => {
  assert.equal(
    normalizeResendDocPath("docs/api-reference/emails/send-email"),
    "/docs/api-reference/emails/send-email",
  );
});

test("normalizeResendDocPath strips query params and hash", () => {
  assert.equal(
    normalizeResendDocPath("/docs/send-with-nodejs?tab=bun#usage"),
    "/docs/send-with-nodejs",
  );
  assert.equal(
    normalizeResendDocPath("https://resend.com/docs/webhooks#events"),
    "/docs/webhooks",
  );
});

test("normalizeResendDocPath returns empty string for empty input", () => {
  assert.equal(normalizeResendDocPath(""), "");
  assert.equal(normalizeResendDocPath(null), "");
  assert.equal(normalizeResendDocPath(undefined), "");
});

test("normalizeResendDocPath strips trailing slash", () => {
  assert.equal(
    normalizeResendDocPath("/docs/domains/"),
    "/docs/domains",
  );
});

// ─── search-docs scoring ─────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Send Email",
        "Use the Resend API to send transactional emails.",
        "Supports HTML and React Email templates.",
        "",
        "# React Email Templates",
        "Build email templates with React Email components.",
        "Use JSX to create responsive email layouts with React.",
        "",
        "# Domains",
        "Configure custom domains for your Resend account.",
        "DNS records and verification steps.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "react email templates" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /react|email|template/i, "Top result should contain query terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /React Email Templates/i, "First section should be the best match");
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
        "# Webhooks",
        "Resend webhooks notify your application of email events.",
        "Configure webhook endpoints in your dashboard.",
        "",
        "# Unrelated Section",
        "This section has nothing relevant.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    // "how", "to", "the", "in" are stop words — only "webhook" should matter
    const result = await invoke("search-docs", { query: "how to use the webhooks in resend" });

    assert.ok(result.found >= 1, "Should find webhook section despite stop words");
    assert.match(result.result, /webhook/i);
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
        "Content about API keys and authentication.",
        "---",
        "Content about domain verification and DNS.",
        "---",
        "# Section B",
        "More about API keys and rate limiting.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "API keys" });

    assert.ok(result.found >= 2, `Should find at least 2 sections split by headings and HRs, got ${result.found}`);
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
        "# Email Sending",
        "Send emails via the Resend API. " + "x".repeat(200),
        "",
        "# More Email Info",
        "Additional email sending details. " + "y".repeat(200),
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "email", maxChars: 100 });

    assert.ok(result.result.length <= 103, `Result should respect maxChars, got ${result.result.length}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs uses llms.txt not llms-full.txt", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    if (url === `${BASE}/llms.txt`) {
      return createResponse("# Emails\nSend transactional emails.");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    await invoke("search-docs", { query: "emails" });

    assert.ok(
      fetchedUrls.includes(`${BASE}/llms.txt`),
      "Should fetch llms.txt",
    );
    assert.ok(
      !fetchedUrls.includes(`${BASE}/llms-full.txt`),
      "Should NOT fetch llms-full.txt",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs heading boost ranks heading matches higher", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# General Overview",
        "This overview mentions domains once in passing about domains.",
        "",
        "# Domains",
        "Configure and verify your sending domains.",
        "Add DNS records for domain authentication.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "domains" });

    assert.ok(result.found >= 2, "Should find at least 2 sections");
    // The section with "Domains" in the heading should rank first
    const firstSection = result.result.split("---")[0];
    assert.match(firstSection, /^# Domains/m, "Section with heading match should appear first");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
