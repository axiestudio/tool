import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeBetterAuthDocPath } from "../better-auth-docs.js";

const BASE = "https://www.better-auth.com";

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

test("normalizeBetterAuthDocPath rewrites llms markdown paths into docs paths", () => {
  assert.equal(normalizeBetterAuthDocPath("/llms.txt/docs/plugins/stripe.md"), "/docs/plugins/stripe");
  assert.equal(normalizeBetterAuthDocPath("docs/concepts/session-management"), "/docs/concepts/session-management");
  assert.equal(normalizeBetterAuthDocPath("/docs/plugins/api-key/advanced.md"), "/docs/plugins/api-key/advanced");
});

test("get-page resolves Better Auth docs through llms markdown endpoints", async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === `${BASE}/llms.txt/docs/concepts/session-management.md`) {
      return createResponse("# Session Management\n\nStateless sessions are supported.");
    }

    if (url === `${BASE}/docs/concepts/session-management.md`) {
      return createResponse("Not found", {
        status: 404,
        headers: { "content-type": "text/plain" },
      });
    }

    if (url === `${BASE}/docs/concepts/session-management`) {
      return createResponse("<!DOCTYPE html><html><body><article id=\"nd-page\">Session docs</article></body></html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const page = await invoke("get-page", { path: "/docs/concepts/session-management" });

    assert.equal(page.path, "/docs/concepts/session-management");
    assert.match(page.markdown, /Session Management/);
    assert.doesNotMatch(page.markdown, /<!DOCTYPE html>/i);
    assert.ok(fetchCalls.includes(`${BASE}/llms.txt/docs/concepts/session-management.md`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs fetches relevant Better Auth markdown pages instead of only scanning the index", async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse("# Better Auth\n\n### Installation\n- [Installation](/llms.txt/docs/installation.md): Learn how to configure Better Auth in your project.");
    }

    if (url === `${BASE}/llms.txt`) {
      return createResponse(`
# Better Auth

### Concepts
- [Session Management](/llms.txt/docs/concepts/session-management.md): Learn about session expiration and cookie caching strategies.
- [Client](/llms.txt/docs/concepts/client.md): Learn how to set up the Better Auth client.

### Plugins
- [Organization](/llms.txt/docs/plugins/organization.md): The organization plugin allows you to manage your organization's members and teams.
      `.trim());
    }

    if (url === `${BASE}/llms.txt/docs/concepts/session-management.md`) {
      return createResponse("# Session Management\n\nBetter Auth supports stateless sessions, secondary storage, and cookie caching strategies.");
    }

    if (url === `${BASE}/llms.txt/docs/concepts/client.md`) {
      return createResponse("# Client\n\nUse the Better Auth client in React, Vue, and Svelte.");
    }

    if (url === `${BASE}/llms.txt/docs/plugins/organization.md`) {
      return createResponse("# Organization\n\nManage members and teams.");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "stateless sessions" });

    assert.ok(result.found > 0);
    assert.match(result.result, /stateless sessions/i);
    assert.ok(fetchCalls.includes(`${BASE}/llms.txt/docs/concepts/session-management.md`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});