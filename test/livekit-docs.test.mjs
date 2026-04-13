import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeLiveKitDocPath } from "../livekit-docs.js";

const BASE = "https://docs.livekit.io";

function createResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/markdown");
  }
  return new Response(body, { status: 200, ...init, headers });
}

// ─── normalizeLiveKitDocPath ────────────────────────────────────────────────

test("normalizeLiveKitDocPath strips absolute URLs to relative paths", () => {
  assert.equal(
    normalizeLiveKitDocPath("https://docs.livekit.io/agents/voice-pipeline-agent"),
    "/agents/voice-pipeline-agent",
  );
  assert.equal(
    normalizeLiveKitDocPath("https://docs.livekit.io/realtime/rooms"),
    "/realtime/rooms",
  );
});

test("normalizeLiveKitDocPath strips .md extensions", () => {
  assert.equal(
    normalizeLiveKitDocPath("/agents/overview.md"),
    "/agents/overview",
  );
  assert.equal(
    normalizeLiveKitDocPath("agents/worker.md"),
    "/agents/worker",
  );
});

test("normalizeLiveKitDocPath strips index.md suffixes", () => {
  assert.equal(
    normalizeLiveKitDocPath("/agents/plugins/index.md"),
    "/agents/plugins/",
  );
  assert.equal(
    normalizeLiveKitDocPath("realtime/index.md"),
    "/realtime/",
  );
});

test("normalizeLiveKitDocPath ensures leading slash", () => {
  assert.equal(
    normalizeLiveKitDocPath("agents/voice-pipeline-agent"),
    "/agents/voice-pipeline-agent",
  );
});

test("normalizeLiveKitDocPath strips query params and hash", () => {
  assert.equal(
    normalizeLiveKitDocPath("/agents/overview?lang=python#setup"),
    "/agents/overview",
  );
  assert.equal(
    normalizeLiveKitDocPath("https://docs.livekit.io/agents/overview?v=2#intro"),
    "/agents/overview",
  );
});

test("normalizeLiveKitDocPath handles empty input", () => {
  assert.equal(normalizeLiveKitDocPath(""), "/");
  assert.equal(normalizeLiveKitDocPath(null), "/");
  assert.equal(normalizeLiveKitDocPath(undefined), "/");
});

// ─── search-docs multi-term scoring ─────────────────────────────────────────

test("search-docs ranks sections matching more terms higher", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Voice Overview",
        "This section covers voice agents in LiveKit.",
        "",
        "# Pipeline Configuration",
        "The voice pipeline agent handles audio streaming and voice pipeline processing.",
        "",
        "# Rooms",
        "Rooms are the basic unit of LiveKit realtime communication.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "voice pipeline agent", maxChars: 50000 });

    assert.ok(result.found >= 2, `Expected at least 2 matches, got ${result.found}`);
    // The section matching ALL terms (voice + pipeline + agent) should rank first
    assert.ok(
      result.result.indexOf("Pipeline Configuration") < result.result.indexOf("Voice Overview"),
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
        "# Token Generation",
        "Generate access tokens for your LiveKit server.",
        "",
        "# Unrelated Weather",
        "The weather is nice today.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    // "the" and "for" are stop words — only "token" should matter
    const result = await invoke("search-docs", { query: "the token for" });
    assert.ok(result.found >= 1);
    assert.ok(result.result.includes("Token Generation"));
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
        "Section about tracks and audio.",
        "Tracks carry voice data.",
        "---",
        "Section about rooms only.",
        "Rooms host participants.",
        "---",
        "Another section about tracks and rooms.",
        "Tracks in rooms are managed automatically.",
      ].join("\n"));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "tracks rooms" });
    // The section mentioning both "tracks" and "rooms" should appear first
    assert.ok(result.found >= 1);
    assert.ok(result.result.includes("managed automatically"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page fallback chain ────────────────────────────────────────────────

test("get-page tries multiple URL patterns before failing", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    // Only the /index.md variant succeeds
    if (url === `${BASE}/agents/overview/index.md`) {
      return createResponse("# Agents Overview\n\nLearn about LiveKit agents.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/agents/overview" });
    assert.ok(result.markdown.includes("Agents Overview"));
    // Should have tried .md first, then /index.md
    assert.ok(fetchedUrls.includes(`${BASE}/agents/overview.md`));
    assert.ok(fetchedUrls.includes(`${BASE}/agents/overview/index.md`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/agents/worker.md`) {
      return createResponse("# Agent Worker\n\nWorker setup guide.");
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://docs.livekit.io/agents/worker" });
    assert.equal(result.path, "/agents/worker");
    assert.ok(result.markdown.includes("Agent Worker"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/nonexistent/page" }),
      (err) => {
        assert.ok(err.message.includes("not found"));
        assert.ok(err.message.includes("get-index"));
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── error handling ─────────────────────────────────────────────────────────

test("invoke throws for unknown tool name", () => {
  assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.ok(err.message.includes("Unknown livekit-docs tool"));
      assert.ok(err.message.includes("Available tools"));
      return true;
    },
  );
});
