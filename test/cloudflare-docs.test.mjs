import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeCloudflareDocPath } from "../cloudflare-docs.js";

const BASE = "https://developers.cloudflare.com";

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

test("normalizeCloudflareDocPath converts absolute markdown URLs into clean docs paths", () => {
  assert.equal(
    normalizeCloudflareDocPath("https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/index.md"),
    "/workers/runtime-apis/bindings/service-bindings/rpc/",
  );

  assert.equal(
    normalizeCloudflareDocPath("https://developers.cloudflare.com/agents/getting-started/quick-start/index.md"),
    "/agents/getting-started/quick-start/",
  );

  assert.equal(
    normalizeCloudflareDocPath("workers/vite-plugin/reference/api/index.md"),
    "/workers/vite-plugin/reference/api/",
  );
});

test("list-products parses Cloudflare product groups and descriptions from the global index", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse(`
# Cloudflare Developer Documentation

## Developer platform
- [Workers](https://developers.cloudflare.com/workers/llms.txt): Build, deploy, and scale serverless applications globally.
- [Agents](https://developers.cloudflare.com/agents/llms.txt): Build AI-powered agents to perform tasks.

## Cloudflare One
- [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/llms.txt): Connect your origin services to Cloudflare.
      `.trim());
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("list-products");

    assert.deepEqual(result.products, ["workers", "agents", "tunnel"]);
    assert.equal(result.groups[0]?.title, "Developer platform");
    assert.equal(result.groups[1]?.title, "Cloudflare One");
    assert.equal(result.entries[0]?.slug, "workers");
    assert.equal(result.entries[0]?.group, "Developer platform");
    assert.match(result.entries[1]?.description, /AI-powered agents/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-product-index returns structured sections with normalized page paths", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/workers/llms.txt`) {
      return createResponse(`
# Workers

## Getting started
- [CLI](https://developers.cloudflare.com/workers/get-started/guide/index.md)

## Runtime APIs
- [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/index.md): Facilitate Worker-to-Worker communication.
- [RPC](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/index.md): Facilitate Worker-to-Worker communication via RPC.
      `.trim());
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-product-index", { product: "workers" });

    assert.equal(result.product, "workers");
    assert.equal(result.sections[0]?.title, "Getting started");
    assert.equal(result.sections[1]?.title, "Runtime APIs");
    assert.equal(result.sections[1]?.entries[1]?.path, "/workers/runtime-apis/bindings/service-bindings/rpc/");
    assert.equal(result.entries[0]?.path, "/workers/get-started/guide/");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs fetches relevant indexed Cloudflare pages for better results", async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === `${BASE}/workers/llms.txt`) {
      return createResponse(`
# Workers

## Runtime APIs
- [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/index.md): Facilitate Worker-to-Worker communication.
- [RPC](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/index.md): Facilitate Worker-to-Worker communication via RPC.
- [Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/index.md): A full-featured integration between Vite and the Workers runtime.
      `.trim());
    }

    if (url === `${BASE}/workers/runtime-apis/bindings/service-bindings/rpc/index.md`) {
      return createResponse("# RPC\n\nFacilitate Worker-to-Worker communication via RPC with typed entrypoints.");
    }

    if (url === `${BASE}/workers/runtime-apis/bindings/service-bindings/index.md`) {
      return createResponse("# Service bindings\n\nForward requests between Workers over HTTP or RPC.");
    }

    if (url === `${BASE}/workers/vite-plugin/index.md`) {
      return createResponse("# Vite plugin\n\nUse Vite for local development.");
    }

    if (url === `${BASE}/workers/llms-full.txt`) {
      return createResponse("# Workers\n\nLarge archive fallback.");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { product: "workers", query: "worker to worker rpc" });

    assert.ok(result.found > 0);
    assert.match(result.result, /worker-to-worker communication/i);
    assert.ok(fetchCalls.includes(`${BASE}/workers/runtime-apis/bindings/service-bindings/rpc/index.md`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});