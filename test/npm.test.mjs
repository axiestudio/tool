import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeNpmPackageName } from "../npm.js";

// ─── normalizeNpmPackageName ──────────────────────────────────────────────────

test("normalizeNpmPackageName handles plain package names", () => {
  assert.equal(normalizeNpmPackageName("hono"), "hono");
  assert.equal(normalizeNpmPackageName("drizzle-orm"), "drizzle-orm");
});

test("normalizeNpmPackageName trims whitespace and lowercases", () => {
  assert.equal(normalizeNpmPackageName("  Hono  "), "hono");
  assert.equal(normalizeNpmPackageName("Drizzle-ORM"), "drizzle-orm");
});

test("normalizeNpmPackageName extracts name from npm URLs", () => {
  assert.equal(
    normalizeNpmPackageName("https://www.npmjs.com/package/hono"),
    "hono",
  );
  assert.equal(
    normalizeNpmPackageName("https://npmjs.com/package/hono"),
    "hono",
  );
});

test("normalizeNpmPackageName extracts scoped packages from npm URLs", () => {
  assert.equal(
    normalizeNpmPackageName("https://www.npmjs.com/package/@ai-sdk/openai"),
    "@ai-sdk/openai",
  );
  assert.equal(
    normalizeNpmPackageName("https://www.npmjs.com/package/@tanstack/react-query"),
    "@tanstack/react-query",
  );
});

test("normalizeNpmPackageName strips query params and trailing slashes from URLs", () => {
  assert.equal(
    normalizeNpmPackageName("https://www.npmjs.com/package/hono?activeTab=versions"),
    "hono",
  );
});

test("normalizeNpmPackageName handles GitHub shorthand (owner/repo)", () => {
  assert.equal(normalizeNpmPackageName("honojs/hono"), "hono");
  assert.equal(normalizeNpmPackageName("drizzle-team/drizzle-orm"), "drizzle-orm");
});

test("normalizeNpmPackageName preserves scoped packages (not treated as GitHub shorthand)", () => {
  assert.equal(normalizeNpmPackageName("@ai-sdk/openai"), "@ai-sdk/openai");
  assert.equal(normalizeNpmPackageName("@tanstack/react-router"), "@tanstack/react-router");
});

test("normalizeNpmPackageName returns falsy input as-is", () => {
  assert.equal(normalizeNpmPackageName(""), "");
  assert.equal(normalizeNpmPackageName(null), null);
  assert.equal(normalizeNpmPackageName(undefined), undefined);
});

// ─── get-downloads (mocked) ──────────────────────────────────────────────────

test("get-downloads returns weekly and monthly stats", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("last-week")) {
      return new Response(JSON.stringify({ downloads: 50000, package: "hono" }), { status: 200 });
    }
    if (url.includes("last-month")) {
      return new Response(JSON.stringify({ downloads: 200000, package: "hono" }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await invoke("get-downloads", { packageName: "hono" });
    assert.equal(result.package, "hono");
    assert.equal(result.weekly, 50000);
    assert.equal(result.monthly, 200000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-downloads normalizes package name", async () => {
  const originalFetch = globalThis.fetch;
  const fetchedUrls = [];

  globalThis.fetch = async (input) => {
    fetchedUrls.push(String(input));
    return new Response(JSON.stringify({ downloads: 100, package: "hono" }), { status: 200 });
  };

  try {
    await invoke("get-downloads", { packageName: "https://www.npmjs.com/package/hono" });
    assert.ok(fetchedUrls.some((u) => u.includes("last-week/hono")));
    assert.ok(fetchedUrls.some((u) => u.includes("last-month/hono")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-downloads throws when packageName is missing", async () => {
  await assert.rejects(() => invoke("get-downloads", {}), /requires/);
});

// ─── get-dependencies (mocked) ───────────────────────────────────────────────

test("get-dependencies returns flattened dependency info", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      name: "hono",
      version: "4.0.0",
      dependencies: { "tiny-dep": "^1.0.0" },
      devDependencies: { vitest: "^1.0.0", typescript: "^5.0.0" },
      peerDependencies: { react: "^18.0.0" },
      optionalDependencies: {},
    }), { status: 200 });

  try {
    const result = await invoke("get-dependencies", { packageName: "hono" });
    assert.equal(result.name, "hono");
    assert.equal(result.version, "4.0.0");
    assert.deepEqual(result.dependencies, { "tiny-dep": "^1.0.0" });
    assert.deepEqual(result.devDependencies, { vitest: "^1.0.0", typescript: "^5.0.0" });
    assert.deepEqual(result.peerDependencies, { react: "^18.0.0" });
    assert.equal(result.totalDeps, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-dependencies throws when packageName is missing", async () => {
  await assert.rejects(() => invoke("get-dependencies", {}), /requires/);
});

// ─── get-package-info returns new fields ──────────────────────────────────────

test("get-package-info includes bin, scripts, type, and files fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      name: "wrangler",
      version: "3.0.0",
      description: "CLI tool",
      bin: { wrangler: "bin/wrangler.js" },
      scripts: { build: "tsc" },
      type: "module",
      files: ["dist", "bin"],
    }), { status: 200 });

  try {
    const result = await invoke("get-package-info", { packageName: "wrangler" });
    assert.deepEqual(result.bin, { wrangler: "bin/wrangler.js" });
    assert.deepEqual(result.scripts, { build: "tsc" });
    assert.equal(result.type, "module");
    assert.deepEqual(result.files, ["dist", "bin"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search sorts by relevance ───────────────────────────────────────────────

test("search results are sorted by relevance score descending", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      total: 3,
      objects: [
        { package: { name: "low", version: "1.0.0", links: {} }, score: { final: 0.1 } },
        { package: { name: "high", version: "1.0.0", links: {} }, score: { final: 0.9 } },
        { package: { name: "mid", version: "1.0.0", links: {} }, score: { final: 0.5 } },
      ],
    }), { status: 200 });

  try {
    const result = await invoke("search", { query: "test" });
    assert.equal(result.packages[0].name, "high");
    assert.equal(result.packages[1].name, "mid");
    assert.equal(result.packages[2].name, "low");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── tools array completeness ────────────────────────────────────────────────

test("tools array includes all 6 tools", async () => {
  const { tools } = await import("../npm.js");
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("search"));
  assert.ok(names.includes("get-readme"));
  assert.ok(names.includes("get-package-info"));
  assert.ok(names.includes("get-versions"));
  assert.ok(names.includes("get-downloads"));
  assert.ok(names.includes("get-dependencies"));
  assert.equal(names.length, 6);
});
