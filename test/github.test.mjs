import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeGitHubUrl, parseGitHubRateLimit, tools } from "../github.js";

// ─── normalizeGitHubUrl ──────────────────────────────────────────

test("normalizeGitHubUrl parses full GitHub blob URL", () => {
  const result = normalizeGitHubUrl("https://github.com/honojs/hono/blob/main/src/index.ts");
  assert.equal(result.owner, "honojs");
  assert.equal(result.repo, "hono");
  assert.equal(result.ref, "main");
  assert.equal(result.path, "src/index.ts");
});

test("normalizeGitHubUrl parses full GitHub tree URL", () => {
  const result = normalizeGitHubUrl("https://github.com/vercel/ai/tree/canary/packages");
  assert.equal(result.owner, "vercel");
  assert.equal(result.repo, "ai");
  assert.equal(result.ref, "canary");
  assert.equal(result.path, "packages");
});

test("normalizeGitHubUrl parses raw.githubusercontent.com URL", () => {
  const result = normalizeGitHubUrl("https://raw.githubusercontent.com/honojs/hono/main/README.md");
  assert.equal(result.owner, "honojs");
  assert.equal(result.repo, "hono");
  assert.equal(result.ref, "main");
  assert.equal(result.path, "README.md");
});

test("normalizeGitHubUrl parses raw URL without path", () => {
  const result = normalizeGitHubUrl("https://raw.githubusercontent.com/honojs/hono/main");
  assert.equal(result.owner, "honojs");
  assert.equal(result.repo, "hono");
  assert.equal(result.ref, "main");
  assert.equal(result.path, undefined);
});

test("normalizeGitHubUrl parses simple owner/repo string", () => {
  const result = normalizeGitHubUrl("honojs/hono");
  assert.equal(result.owner, "honojs");
  assert.equal(result.repo, "hono");
  assert.equal(result.path, undefined);
});

test("normalizeGitHubUrl parses owner/repo/path string", () => {
  const result = normalizeGitHubUrl("honojs/hono/src/index.ts");
  assert.equal(result.owner, "honojs");
  assert.equal(result.repo, "hono");
  assert.equal(result.path, "src/index.ts");
});

test("normalizeGitHubUrl parses repo-only GitHub URL without path", () => {
  const result = normalizeGitHubUrl("https://github.com/drizzle-team/drizzle-orm");
  assert.equal(result.owner, "drizzle-team");
  assert.equal(result.repo, "drizzle-orm");
  assert.equal(result.ref, undefined);
  assert.equal(result.path, undefined);
});

test("normalizeGitHubUrl strips .git suffix", () => {
  const result = normalizeGitHubUrl("https://github.com/honojs/hono.git");
  assert.equal(result.owner, "honojs");
  assert.equal(result.repo, "hono");
});

test("normalizeGitHubUrl throws on empty input", () => {
  assert.throws(() => normalizeGitHubUrl(""), /non-empty string/);
  assert.throws(() => normalizeGitHubUrl(null), /non-empty string/);
});

test("normalizeGitHubUrl throws on single segment", () => {
  assert.throws(() => normalizeGitHubUrl("honojs"), /Cannot parse/);
});

// ─── parseGitHubRateLimit ────────────────────────────────────────

test("parseGitHubRateLimit extracts rate limit info from headers", () => {
  const mockResponse = {
    headers: new Map([
      ["x-ratelimit-remaining", "42"],
      ["x-ratelimit-limit", "60"],
      ["x-ratelimit-reset", "1700000000"],
    ]),
  };
  // Map has .get() so it works as a Headers-like object
  const info = parseGitHubRateLimit(mockResponse);
  assert.equal(info.remaining, 42);
  assert.equal(info.limit, 60);
  assert.ok(info.resetAt);
  assert.ok(info.message.includes("42/60"));
});

test("parseGitHubRateLimit returns exhausted message when remaining is 0", () => {
  const mockResponse = {
    headers: new Map([
      ["x-ratelimit-remaining", "0"],
      ["x-ratelimit-limit", "60"],
      ["x-ratelimit-reset", "1700000000"],
    ]),
  };
  const info = parseGitHubRateLimit(mockResponse);
  assert.equal(info.remaining, 0);
  assert.ok(info.message.includes("exhausted"));
  assert.ok(info.message.includes("GITHUB_TOKEN"));
});

test("parseGitHubRateLimit returns null for missing headers", () => {
  assert.equal(parseGitHubRateLimit(null), null);
  assert.equal(parseGitHubRateLimit({}), null);
  assert.equal(parseGitHubRateLimit({ headers: new Map() }), null);
});

// ─── tools array ─────────────────────────────────────────────────

test("tools array includes compare-tags", () => {
  assert.ok(tools.some((t) => t.name === "compare-tags"));
});

test("tools array includes all six tools", () => {
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("get-file"));
  assert.ok(names.includes("list-dir"));
  assert.ok(names.includes("search-code"));
  assert.ok(names.includes("get-releases"));
  assert.ok(names.includes("get-repo-info"));
  assert.ok(names.includes("compare-tags"));
});

test("search-code tool definition includes language parameter", () => {
  const searchTool = tools.find((t) => t.name === "search-code");
  assert.ok(searchTool.parameters.language);
});

// ─── binary file detection in get-file ───────────────────────────

test("get-file returns warning for binary file extensions", async () => {
  const result = await invoke("get-file", { owner: "honojs", repo: "hono", path: "logo.png" });
  assert.equal(result.binary, true);
  assert.equal(result.content, null);
  assert.ok(result.warning.includes("binary"));
});

test("get-file returns warning for .wasm files", async () => {
  const result = await invoke("get-file", { owner: "test", repo: "test", path: "module.wasm" });
  assert.equal(result.binary, true);
});

test("get-file returns warning for .zip files", async () => {
  const result = await invoke("get-file", { owner: "test", repo: "test", path: "archive.zip" });
  assert.equal(result.binary, true);
  assert.ok(result.warning.includes("archive.zip"));
});

// ─── compare-tags ────────────────────────────────────────────────

test("compare-tags throws on missing arguments", async () => {
  await assert.rejects(
    () => invoke("compare-tags", { owner: "honojs", repo: "hono" }),
    /requires/,
  );
});

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool", {}),
    /Unknown github tool/,
  );
});
