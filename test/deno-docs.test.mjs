import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeDenoDocPath } from "../deno-docs.js";

const BASE = "https://docs.deno.com";

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

// ─── normalizeDenoDocPath ────────────────────────────────────────

test("normalizeDenoDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeDenoDocPath("https://docs.deno.com/runtime/"),
    "/runtime/",
  );
  assert.equal(
    normalizeDenoDocPath("https://docs.deno.com/runtime/fundamentals/typescript/"),
    "/runtime/fundamentals/typescript/",
  );
  assert.equal(
    normalizeDenoDocPath("https://docs.deno.com/deploy/"),
    "/deploy/",
  );
});

test("normalizeDenoDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeDenoDocPath("/runtime/fundamentals/typescript.md"),
    "/runtime/fundamentals/typescript/",
  );
  assert.equal(
    normalizeDenoDocPath("/runtime/index.md"),
    "/runtime/",
  );
  assert.equal(
    normalizeDenoDocPath("deploy/index.md"),
    "/deploy/",
  );
});

test("normalizeDenoDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeDenoDocPath("runtime/fundamentals/typescript"),
    "/runtime/fundamentals/typescript/",
  );
  assert.equal(
    normalizeDenoDocPath("examples"),
    "/examples/",
  );
});

test("normalizeDenoDocPath ensures trailing slash", () => {
  assert.equal(
    normalizeDenoDocPath("/runtime"),
    "/runtime/",
  );
  assert.equal(
    normalizeDenoDocPath("/deploy"),
    "/deploy/",
  );
});

test("normalizeDenoDocPath strips query params and hash", () => {
  assert.equal(
    normalizeDenoDocPath("/runtime/fundamentals/typescript/?tab=config#usage"),
    "/runtime/fundamentals/typescript/",
  );
  assert.equal(
    normalizeDenoDocPath("https://docs.deno.com/runtime/#getting-started"),
    "/runtime/",
  );
});

test("normalizeDenoDocPath returns / for empty input", () => {
  assert.equal(normalizeDenoDocPath(""), "/");
  assert.equal(normalizeDenoDocPath(null), "/");
  assert.equal(normalizeDenoDocPath(undefined), "/");
});

// ─── get-index ───────────────────────────────────────────────────

test("get-index fetches llms.txt and returns index text", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms.txt`) {
      return createResponse("# Deno Docs\n\n- [Runtime](/runtime/)\n- [Deploy](/deploy/)");
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-index");
    assert.ok(result.index.includes("Deno Docs"));
    assert.ok(result.index.includes("/runtime/"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-index returns human-readable error on network failure", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => { throw new Error("ECONNRESET"); };

  try {
    await assert.rejects(
      () => invoke("get-index"),
      (err) => {
        assert.match(err.message, /network error/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-index returns human-readable error on 404", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-index"),
      (err) => {
        assert.match(err.message, /not found.*404/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ────────────────────────────────────────────────────

test("get-page tries multiple URL patterns before failing", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    if (url === `${BASE}/runtime/`) {
      return createResponse("# Deno Runtime\n\nSecure JavaScript runtime.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/runtime/" });

    assert.equal(result.path, "/runtime/");
    assert.match(result.markdown, /Deno Runtime/i);
    assert.ok(fetchedUrls.includes(`${BASE}/runtime/index.md`), "Should try index.md first");
    assert.ok(fetchedUrls.includes(`${BASE}/runtime/`), "Should try bare path as fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/runtime/fundamentals/typescript/index.md`) {
      return createResponse("# TypeScript\n\nNative TypeScript support in Deno.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://docs.deno.com/runtime/fundamentals/typescript/" });

    assert.equal(result.path, "/runtime/fundamentals/typescript/");
    assert.match(result.markdown, /typescript/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/nonexistent/" }),
      (err) => {
        assert.match(err.message, /not found/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws when path is missing", async () => {
  await assert.rejects(
    () => invoke("get-page", {}),
    (err) => {
      assert.match(err.message, /requires.*path/i);
      return true;
    },
  );
});

test("get-page skips responses that are actually HTML", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/deploy/index.md`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${BASE}/deploy/`) {
      return createResponse("# Deno Deploy\n\nServerless at the edge.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/deploy/" });

    assert.equal(result.path, "/deploy/");
    assert.match(result.markdown, /deploy/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs ─────────────────────────────────────────────────

test("search-docs fetches llms-full.txt for comprehensive search", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Permissions",
        "Deno is secure by default. All access to the system must be explicitly granted.",
        "Use --allow-read, --allow-write, --allow-net flags.",
        "",
        "# TypeScript",
        "Deno supports TypeScript natively without configuration.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "permissions" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /permissions/i);
    assert.ok(fetchedUrls.includes(`${BASE}/llms-full.txt`), "Must use llms-full.txt for search");
    assert.ok(!fetchedUrls.includes(`${BASE}/llms.txt`), "Should NOT use llms.txt for search");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# HTTP Server",
        "Deno includes a built-in HTTP server.",
        "Use Deno.serve() to start serving requests.",
        "",
        "# KV Database",
        "Deno KV is a built-in key-value database.",
        "It supports atomic operations and queues.",
        "",
        "# Permissions and Security",
        "Deno permissions control access to the network, filesystem, and environment.",
        "Use --allow-net for network access and --allow-read for filesystem.",
        "Security is a core feature of the Deno permissions model.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "permissions security network" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /permissions|security/i, "Top result should contain permission/security terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /permissions|security/i, "First section should be the best match");
    }
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
        "# FFI",
        "The FFI API allows calling native libraries from Deno.",
        "Use Deno.dlopen() to load shared libraries.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the ffi in deno" });

    assert.ok(result.found > 0, "Should find FFI section despite stop words");
    assert.match(result.result, /ffi/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Section A",
        "Content about testing and assertions.",
        "---",
        "Content about testing patterns and mocking.",
        "---",
        "# Section B",
        "More about testing with Deno.test API.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "testing" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Workers",
        "Deno workers " + "workers ".repeat(200),
        "",
        "# More Workers",
        "Workers and threads " + "workers ".repeat(200),
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "workers", maxChars: 100 });

    assert.ok(result.result.length <= 103, "Result should respect maxChars (with ... suffix)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    (err) => {
      assert.match(err.message, /requires.*query/i);
      return true;
    },
  );
});

test("search-docs returns human-readable error on 404", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("search-docs", { query: "anything" }),
      (err) => {
        assert.match(err.message, /not found.*404/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns fallback message when nothing matches", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse("# Unrelated\n\nNothing relevant here.");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "xyznonexistent123" });

    assert.equal(result.found, 0);
    assert.equal(result.result, "No relevant sections found.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── unknown tool ────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  await assert.rejects(
    () => invoke("nonexistent-tool"),
    (err) => {
      assert.match(err.message, /unknown.*deno-docs/i);
      return true;
    },
  );
});
