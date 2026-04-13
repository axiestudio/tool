import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNextjsDocPath } from "../nextjs-docs.js";

test("normalizeNextjsDocPath strips base URL", () => {
  assert.equal(
    normalizeNextjsDocPath("https://nextjs.org/docs/getting-started/installation"),
    "/docs/getting-started/installation",
  );
});

test("normalizeNextjsDocPath strips bare domain", () => {
  assert.equal(
    normalizeNextjsDocPath("nextjs.org/docs/app/building-your-application/routing"),
    "/docs/app/building-your-application/routing",
  );
});

test("normalizeNextjsDocPath removes .md extension", () => {
  assert.equal(
    normalizeNextjsDocPath("/docs/app/api-reference/functions/fetch.md"),
    "/docs/app/api-reference/functions/fetch",
  );
});

test("normalizeNextjsDocPath removes .mdx extension", () => {
  assert.equal(
    normalizeNextjsDocPath("/docs/getting-started/installation.mdx"),
    "/docs/getting-started/installation",
  );
});

test("normalizeNextjsDocPath adds leading slash for relative path", () => {
  assert.equal(
    normalizeNextjsDocPath("docs/pages/building-your-application/data-fetching"),
    "/docs/pages/building-your-application/data-fetching",
  );
});

test("normalizeNextjsDocPath removes trailing slash", () => {
  assert.equal(
    normalizeNextjsDocPath("/docs/app/building-your-application/routing/"),
    "/docs/app/building-your-application/routing",
  );
});

test("normalizeNextjsDocPath preserves root slash", () => {
  assert.equal(normalizeNextjsDocPath("/"), "/");
});

test("normalizeNextjsDocPath handles full URL with .md", () => {
  assert.equal(
    normalizeNextjsDocPath("https://nextjs.org/docs/app/api-reference.md"),
    "/docs/app/api-reference",
  );
});

// ─── invoke tests (mocked fetch) ─────────────────────────────────────────────

test("get-index fetches llms.txt and returns index", async () => {
  const originalFetch = globalThis.fetch;
  const sampleIndex = `# Next.js Documentation\n\n- [Installation](/docs/getting-started/installation)\n- [Routing](/docs/app/building-your-application/routing)\n`;

  globalThis.fetch = async (url) => {
    assert.equal(url, "https://nextjs.org/llms.txt");
    return { ok: true, text: async () => sampleIndex };
  };

  try {
    const { invoke } = await import("../nextjs-docs.js");
    const { index } = await invoke("get-index");
    assert.ok(index.includes("Installation"));
    assert.ok(index.includes("Routing"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page returns markdown for a valid path", async () => {
  const originalFetch = globalThis.fetch;
  const md = "# Installation\n\nInstall Next.js with `npx create-next-app`.";

  globalThis.fetch = async (url, opts) => {
    if (url === "https://nextjs.org/docs/getting-started/installation") {
      return {
        ok: true,
        headers: new Map([["content-type", "text/markdown"]]),
        text: async () => md,
      };
    }
    return { ok: false };
  };

  try {
    const { invoke } = await import("../nextjs-docs.js");
    const result = await invoke("get-page", { path: "/docs/getting-started/installation" });
    assert.equal(result.path, "/docs/getting-started/installation");
    assert.ok(result.markdown.includes("create-next-app"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws when path is missing", async () => {
  const { invoke } = await import("../nextjs-docs.js");
  await assert.rejects(() => invoke("get-page", {}), { message: /requires `path`/ });
});

test("get-page throws when page not found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });

  try {
    const { invoke } = await import("../nextjs-docs.js");
    await assert.rejects(() => invoke("get-page", { path: "/docs/nonexistent" }), {
      message: /not found/,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs finds matching sections", async () => {
  const originalFetch = globalThis.fetch;
  const docText = [
    "# Getting Started",
    "Welcome to Next.js docs.",
    "",
    "# Server Components",
    "React Server Components allow rendering on the server.",
    "Server components reduce bundle size.",
    "",
    "# Client Components",
    "Use the 'use client' directive for client components.",
  ].join("\n");

  globalThis.fetch = async () => ({
    ok: true,
    text: async () => docText,
  });

  try {
    const { invoke } = await import("../nextjs-docs.js");
    const result = await invoke("search-docs", { query: "server" });
    assert.ok(result.found > 0);
    assert.ok(result.result.includes("Server Components"));
    assert.equal(result.query, "server");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns fallback when nothing matches", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => "# Routing\nFile-based routing in Next.js.",
  });

  try {
    const { invoke } = await import("../nextjs-docs.js");
    const result = await invoke("search-docs", { query: "xyznonexistenttopic" });
    assert.equal(result.found, 0);
    assert.equal(result.result, "No relevant sections found.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs throws when query is missing", async () => {
  const { invoke } = await import("../nextjs-docs.js");
  await assert.rejects(() => invoke("search-docs", {}), { message: /requires `query`/ });
});

test("invoke throws for unknown tool", async () => {
  const { invoke } = await import("../nextjs-docs.js");
  await assert.rejects(() => invoke("bad-tool"), { message: /Unknown nextjs-docs tool/ });
});

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;
  const longDoc = Array.from({ length: 50 }, (_, i) =>
    `# Section ${i}\nThis section talks about routing and routing details for routing configuration.`,
  ).join("\n\n");

  globalThis.fetch = async () => ({
    ok: true,
    text: async () => longDoc,
  });

  try {
    const { invoke } = await import("../nextjs-docs.js");
    const result = await invoke("search-docs", { query: "routing", maxChars: 200 });
    assert.ok(result.result.length <= 200);
    assert.ok(result.found > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
