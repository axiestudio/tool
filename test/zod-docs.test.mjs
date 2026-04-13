import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeZodDocPath } from "../zod-docs.js";

const BASE = "https://zod.dev";

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

// ─── normalizeZodDocPath ─────────────────────────────────────────

test("normalizeZodDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeZodDocPath("https://zod.dev/primitives"),
    "/primitives",
  );
  assert.equal(
    normalizeZodDocPath("https://zod.dev/error-handling"),
    "/error-handling",
  );
  assert.equal(
    normalizeZodDocPath("https://zod.dev/guides/generics"),
    "/guides/generics",
  );
});

test("normalizeZodDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeZodDocPath("/objects.md"),
    "/objects",
  );
  assert.equal(
    normalizeZodDocPath("/primitives/index.md"),
    "/primitives",
  );
  assert.equal(
    normalizeZodDocPath("arrays.md"),
    "/arrays",
  );
});

test("normalizeZodDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeZodDocPath("primitives"),
    "/primitives",
  );
  assert.equal(
    normalizeZodDocPath("unions"),
    "/unions",
  );
});

test("normalizeZodDocPath strips query params and hash", () => {
  assert.equal(
    normalizeZodDocPath("/objects?tab=pick#usage"),
    "/objects",
  );
  assert.equal(
    normalizeZodDocPath("https://zod.dev/functions#async"),
    "/functions",
  );
});

test("normalizeZodDocPath returns empty string for empty input", () => {
  assert.equal(normalizeZodDocPath(""), "");
  assert.equal(normalizeZodDocPath(null), "");
  assert.equal(normalizeZodDocPath(undefined), "");
});

test("normalizeZodDocPath strips trailing slash", () => {
  assert.equal(
    normalizeZodDocPath("/primitives/"),
    "/primitives",
  );
});

// ─── get-index ───────────────────────────────────────────────────

test("get-index fetches Zod llms.txt and returns index", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse("# Zod Documentation\n\n- /introduction\n- /primitives\n- /objects");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-index");

    assert.ok(result.index.includes("Zod Documentation"));
    assert.ok(result.index.includes("/primitives"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ────────────────────────────────────────────────────

test("get-page fetches a Zod doc page as markdown", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/primitives.md`) {
      return createResponse("# Primitives\n\nZod provides schemas for all JavaScript primitives.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/primitives" });

    assert.equal(result.path, "/primitives");
    assert.match(result.markdown, /primitives/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page tries multiple URL patterns before failing", async () => {
  const fetchedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    if (url === `${BASE}/objects`) {
      return createResponse("# Objects\n\nDefine object schemas with z.object().");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/objects" });

    assert.equal(result.path, "/objects");
    assert.match(result.markdown, /z\.object/i);
    assert.ok(fetchedUrls.includes(`${BASE}/objects.md`), "Should try .md extension first");
    assert.ok(fetchedUrls.includes(`${BASE}/objects`), "Should try bare path as fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/unions.md`) {
      return createResponse("# Unions\n\nCreate union types with z.union().");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://zod.dev/unions" });

    assert.equal(result.path, "/unions");
    assert.match(result.markdown, /union/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page skips responses that are actually HTML", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/arrays.md`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${BASE}/arrays/index.md`) {
      return createResponse("# Arrays\n\nValidate arrays with z.array().");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/arrays" });

    assert.equal(result.path, "/arrays");
    assert.match(result.markdown, /array/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/nonexistent" }),
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

// ─── search-docs ─────────────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# String validation",
        "Use z.string() to validate strings.",
        "Add constraints like .min(), .max(), .email().",
        "",
        "# Error handling and formatting",
        "Zod provides detailed error messages for validation failures.",
        "Use .safeParse() to get structured error objects.",
        "Custom error maps let you format error messages.",
        "",
        "# Number schemas",
        "Use z.number() to validate numbers.",
        "Add constraints like .min(), .max(), .int().",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "error messages formatting" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /error/i, "Top result should contain error terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /error/i, "First section should be the best match");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs filters stop words from query", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Coercion",
        "Zod can coerce inputs to the correct type automatically.",
        "Use z.coerce.string() or z.coerce.number() for coercion.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the coercion in zod" });

    assert.ok(result.found > 0, "Should find coercion section despite stop words");
    assert.match(result.result, /coerce|coercion/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Section A",
        "Content about transforms and preprocessing.",
        "---",
        "Content about refinements in schemas.",
        "---",
        "# Section B",
        "More about transforms and pipes.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "transforms" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
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

// ─── error handling ──────────────────────────────────────────────

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

test("invoke throws for unknown tool name", async () => {
  await assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.match(err.message, /unknown zod-docs tool/i);
      return true;
    },
  );
});
