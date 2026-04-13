import assert from "node:assert/strict";
import test from "node:test";

import { normalizeElevenlabsDocPath } from "../elevenlabs-docs.js";

// ─── normalizeElevenlabsDocPath ───────────────────────────────────────────────

test("normalizeElevenlabsDocPath adds leading slash when missing", () => {
  assert.equal(normalizeElevenlabsDocPath("overview/intro"), "/overview/intro");
});

test("normalizeElevenlabsDocPath keeps existing leading slash", () => {
  assert.equal(normalizeElevenlabsDocPath("/eleven-agents/overview"), "/eleven-agents/overview");
});

test("normalizeElevenlabsDocPath strips base URL", () => {
  assert.equal(
    normalizeElevenlabsDocPath("https://elevenlabs.io/docs/api-reference/introduction"),
    "/api-reference/introduction",
  );
});

test("normalizeElevenlabsDocPath removes .mdx extension", () => {
  assert.equal(normalizeElevenlabsDocPath("/eleven-api/quickstart.mdx"), "/eleven-api/quickstart");
});

test("normalizeElevenlabsDocPath removes /index.mdx suffix", () => {
  assert.equal(normalizeElevenlabsDocPath("/eleven-agents/index.mdx"), "/eleven-agents/");
});

test("normalizeElevenlabsDocPath handles base URL with .mdx", () => {
  assert.equal(
    normalizeElevenlabsDocPath("https://elevenlabs.io/docs/overview/intro.mdx"),
    "/overview/intro",
  );
});

// ─── invoke get-index ─────────────────────────────────────────────────────────

test("get-index returns the llms.txt index", async () => {
  const { invoke } = await loadWithMockedFetch("# ElevenLabs Docs\n\n- [Introduction](/overview/intro)");

  const result = await invoke("get-index");
  assert.ok(result.index.includes("ElevenLabs Docs"));
  assert.ok(result.index.includes("Introduction"));
});

// ─── invoke get-page ──────────────────────────────────────────────────────────

test("get-page fetches and returns markdown for a doc path", async () => {
  const md = "# Text to Speech\n\nElevenLabs provides state-of-the-art text to speech.";
  const { invoke } = await loadWithMockedFetch(md);

  const result = await invoke("get-page", { path: "/eleven-api/quickstart" });
  assert.equal(result.path, "/eleven-api/quickstart");
  assert.ok(result.markdown.includes("Text to Speech"));
});

test("get-page normalizes the path before fetching", async () => {
  let requestedUrl = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response("# Voice Cloning", { status: 200 });
  };

  const mod = await reimport();
  await mod.invoke("get-page", { path: "https://elevenlabs.io/docs/overview/intro.mdx" });
  globalThis.fetch = original;

  assert.ok(requestedUrl.includes("/overview/intro"));
  assert.ok(!requestedUrl.includes(".mdx"));
});

test("get-page throws when path is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("get-page", {}),
    { message: "get-page requires `path`" },
  );
});

// ─── invoke search-docs ───────────────────────────────────────────────────────

test("search-docs finds matching sections", async () => {
  const docs = [
    "# Introduction",
    "ElevenLabs is an AI voice and audio platform.",
    "",
    "# Text to Speech",
    "Convert text to natural-sounding speech with voice cloning.",
    "You can use the API or the web interface.",
    "",
    "# Agents",
    "Build conversational AI agents with ElevenLabs.",
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "voice cloning" });
  assert.equal(result.query, "voice cloning");
  assert.ok(result.found > 0);
  assert.ok(result.result.toLowerCase().includes("voice cloning"));
});

test("search-docs returns fallback message when nothing matches", async () => {
  const docs = "# Introduction\n\nSome unrelated content here.";
  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "xyznonexistent" });
  assert.equal(result.found, 0);
  assert.equal(result.result, "No relevant sections found.");
});

test("search-docs respects maxChars", async () => {
  const docs = [
    "# Section A",
    "voice cloning ".repeat(50),
    "",
    "# Section B",
    "voice cloning ".repeat(50),
  ].join("\n");

  const { invoke } = await loadWithMockedFetch(docs);

  const result = await invoke("search-docs", { query: "voice cloning", maxChars: 100 });
  assert.ok(result.result.length <= 100);
});

test("search-docs throws when query is missing", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("search-docs", {}),
    { message: "search-docs requires `query`" },
  );
});

// ─── unknown tool ─────────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  const { invoke } = await loadWithMockedFetch("");

  await assert.rejects(
    () => invoke("unknown-tool"),
    { message: 'Unknown elevenlabs-docs tool: "unknown-tool"' },
  );
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loadWithMockedFetch(responseText) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(responseText, { status: 200 });

  const mod = await reimport();

  globalThis.fetch = original;
  // Return an invoke that still uses the mock
  return {
    invoke: async (name, args) => {
      globalThis.fetch = async () => new Response(responseText, { status: 200 });
      try {
        return await mod.invoke(name, args);
      } finally {
        globalThis.fetch = original;
      }
    },
  };
}

let importCounter = 0;
async function reimport() {
  importCounter++;
  return import(`../elevenlabs-docs.js?v=${importCounter}`);
}
