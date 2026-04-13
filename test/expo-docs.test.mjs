import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeExpoDocPath, tools } from "../expo-docs.js";

const BASE = "https://docs.expo.dev";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/markdown");
  }
  return new Response(body, { status: 200, ...init, headers });
}

// ─── tools export ───────────────────────────────────────────────────────────

test("tools exports exactly 3 tools", () => {
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

// ─── normalizeExpoDocPath ───────────────────────────────────────────────────

test("normalizeExpoDocPath strips absolute URL prefix", () => {
  assert.equal(
    normalizeExpoDocPath("https://docs.expo.dev/guides/routing"),
    "/guides/routing",
  );
  assert.equal(
    normalizeExpoDocPath("https://docs.expo.dev/develop/development-builds/introduction"),
    "/develop/development-builds/introduction",
  );
});

test("normalizeExpoDocPath strips .md extension", () => {
  assert.equal(
    normalizeExpoDocPath("/guides/routing.md"),
    "/guides/routing",
  );
  assert.equal(
    normalizeExpoDocPath("guides/permissions.md"),
    "/guides/permissions",
  );
});

test("normalizeExpoDocPath strips /index.md suffix", () => {
  assert.equal(
    normalizeExpoDocPath("/guides/index.md"),
    "/guides",
  );
  assert.equal(
    normalizeExpoDocPath("develop/index.md"),
    "/develop",
  );
});

test("normalizeExpoDocPath ensures leading slash", () => {
  assert.equal(
    normalizeExpoDocPath("guides/routing"),
    "/guides/routing",
  );
  assert.equal(
    normalizeExpoDocPath("deploy/submit-to-app-stores"),
    "/deploy/submit-to-app-stores",
  );
});

test("normalizeExpoDocPath handles empty input", () => {
  assert.equal(normalizeExpoDocPath(""), "/");
  assert.equal(normalizeExpoDocPath(null), "/");
  assert.equal(normalizeExpoDocPath(undefined), "/");
});

test("normalizeExpoDocPath strips query params and hash from non-URL paths", () => {
  assert.equal(
    normalizeExpoDocPath("/guides/routing?tab=bare#setup"),
    "/guides/routing",
  );
});

// ─── invoke error handling ──────────────────────────────────────────────────

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: /Unknown expo-docs tool/ },
  );
});

// ─── search-docs multi-term scoring ─────────────────────────────────────────

test("search-docs ranks sections matching more terms higher", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Push Notifications Overview",
        "This section covers push notifications in Expo.",
        "",
        "# Expo Push API Configuration",
        "Configure the push notification API and handle push tokens for notifications.",
        "",
        "# Camera Permissions",
        "Request camera permissions in your Expo app.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "push notifications API", maxChars: 50000 });

    assert.ok(result.found >= 2, `Expected at least 2 matches, got ${result.found}`);
    // The section matching ALL terms (push + notification + api) should rank first
    assert.ok(
      result.result.indexOf("Push API Configuration") < result.result.indexOf("Push Notifications Overview"),
      "Section matching all terms should appear before section matching fewer terms",
    );
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
        "# EAS Build",
        "Build your Expo app with EAS for production.",
        "",
        "# Unrelated Weather",
        "The weather is nice today.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "the build for" });
    assert.ok(result.found >= 1);
    assert.ok(result.result.includes("EAS Build"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs handles HR section boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "Section about navigation and routing.",
        "Navigation handles screen transitions.",
        "---",
        "Section about assets only.",
        "Assets include images and fonts.",
        "---",
        "Another section about navigation and assets.",
        "Navigation with asset preloading is managed automatically.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "navigation assets" });
    assert.ok(result.found >= 1);
    assert.ok(result.result.includes("managed automatically"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs applies heading boost", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Expo Router",
        "File-based routing for React Native.",
        "",
        "# Getting Started",
        "This guide mentions expo router briefly in passing.",
        "It covers many other topics too like setup and init.",
        "Also mentions expo router once more.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "expo router" });
    assert.ok(result.found >= 1);
    // Section with "expo router" in the heading should rank higher
    assert.ok(
      result.result.indexOf("File-based routing") < result.result.indexOf("Getting Started"),
      "Section with term in heading should rank higher",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ───────────────────────────────────────────────────────────────

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/guides/routing`) {
      return createResponse("# Expo Router\n\nFile-based routing for React Native.");
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://docs.expo.dev/guides/routing" });
    assert.ok(result.markdown.includes("Expo Router"));
    assert.equal(result.path, "/guides/routing");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/nonexistent/page" }),
      { message: /Expo page not found/ },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
