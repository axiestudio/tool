import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeContext7LibraryId } from "../context7.js";

const BASE = "https://context7.com/api/v2";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return new Response(body, {
    status: 200,
    ...init,
    headers,
  });
}

test("normalizeContext7LibraryId normalizes direct IDs and absolute Context7 URLs", () => {
  assert.equal(normalizeContext7LibraryId("/vercel/next.js"), "/vercel/next.js");
  assert.equal(normalizeContext7LibraryId("vercel/next.js"), "/vercel/next.js");
  assert.equal(
    normalizeContext7LibraryId("https://context7.com/vercel/next.js/v15.1.8?utm_source=test"),
    "/vercel/next.js/v15.1.8",
  );
});

test("resolve-library-id returns direct Context7 IDs without hitting the search endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Search endpoint should not be called for a direct library ID");
  };

  try {
    const result = await invoke("resolve-library-id", { libraryName: "/assistant-ui/assistant-ui" });

    assert.equal(result, "/assistant-ui/assistant-ui");
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolve-library-id prefers exact official matches over the first search result", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));

    if (url.toString() === `${BASE}/libs/search?query=next.js+routing&libraryName=next.js`) {
      return createResponse(JSON.stringify({
        results: [
          {
            id: "/websites/nextjs_examples",
            title: "Next.js Examples",
            description: "Community examples and snippets.",
            trustScore: 5,
            benchmarkScore: 95,
            totalSnippets: 9000,
          },
          {
            id: "/vercel/next.js",
            title: "Next.js",
            description: "Official Next.js framework documentation.",
            trustScore: 10,
            benchmarkScore: 85,
            totalSnippets: 2200,
          },
        ],
      }));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("resolve-library-id", {
      libraryName: "next.js",
      query: "next.js routing",
    });

    assert.equal(result, "/vercel/next.js");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-library-docs normalizes library URLs and extracts readable text from JSON payloads", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));

    if (url.origin + url.pathname === `${BASE}/context`) {
      assert.equal(url.searchParams.get("libraryId"), "/vercel/next.js/v15.1.8");
      assert.equal(url.searchParams.get("query"), "routing");
      assert.equal(url.searchParams.get("tokens"), "750");

      return createResponse(JSON.stringify({
        content: [
          {
            type: "text",
            text: "### Routing\n\nUse the App Router for nested layouts and segment-based routing.",
          },
        ],
        citations: [
          {
            title: "Routing",
            source: "https://github.com/vercel/next.js/blob/canary/docs/routing.mdx",
          },
        ],
      }));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-library-docs", {
      libraryId: "https://context7.com/vercel/next.js/v15.1.8",
      topic: "routing",
      tokens: 750,
    });

    assert.match(result, /Routing/);
    assert.match(result, /App Router/);
    assert.doesNotMatch(result, /"content"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});