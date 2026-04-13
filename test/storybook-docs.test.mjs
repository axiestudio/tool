import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeStorybookDocPath } from "../storybook-docs.js";

const BASE = "https://storybook.js.org";

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

// ─── normalizeStorybookDocPath ───────────────────────────────────

test("normalizeStorybookDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeStorybookDocPath("https://storybook.js.org/docs/writing-stories"),
    "/docs/writing-stories",
  );
  assert.equal(
    normalizeStorybookDocPath("https://storybook.js.org/docs/addons"),
    "/docs/addons",
  );
  assert.equal(
    normalizeStorybookDocPath("https://storybook.js.org/docs/configure/story-layout"),
    "/docs/configure/story-layout",
  );
});

test("normalizeStorybookDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeStorybookDocPath("/docs/writing-stories.md"),
    "/docs/writing-stories",
  );
  assert.equal(
    normalizeStorybookDocPath("/docs/addons/index.md"),
    "/docs/addons",
  );
  assert.equal(
    normalizeStorybookDocPath("docs/configure.md"),
    "/docs/configure",
  );
});

test("normalizeStorybookDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeStorybookDocPath("docs/writing-stories"),
    "/docs/writing-stories",
  );
  assert.equal(
    normalizeStorybookDocPath("docs/addons"),
    "/docs/addons",
  );
});

test("normalizeStorybookDocPath returns empty string for empty input", () => {
  assert.equal(normalizeStorybookDocPath(""), "");
  assert.equal(normalizeStorybookDocPath(null), "");
  assert.equal(normalizeStorybookDocPath(undefined), "");
});

// ─── invoke error handling ───────────────────────────────────────

test("invoke throws on unknown tool name", async () => {
  await assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.match(err.message, /unknown storybook-docs tool/i);
      return true;
    },
  );
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

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    (err) => {
      assert.match(err.message, /requires.*query/i);
      return true;
    },
  );
});

// ─── search-docs multi-term scoring ──────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Writing stories",
        "Stories capture the rendered state of a UI component.",
        "Each story demonstrates a different use case.",
        "",
        "# Args and controls",
        "Args are Storybook's way to define and manipulate component inputs.",
        "Controls give you a graphical UI to interact with args dynamically.",
        "Args are powerful for testing component variations.",
        "",
        "# Addons",
        "Addons extend Storybook with extra functionality.",
        "Install addons via npm packages.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "args controls inputs" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /args|controls/i, "Top result should contain args/controls terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /args|controls/i, "First section should be the best match");
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
        "# Decorators",
        "Decorators wrap stories with extra rendering functionality.",
        "Use decorators to provide context like themes or routing.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the decorators in storybook" });

    assert.ok(result.found > 0, "Should find decorator section despite stop words");
    assert.match(result.result, /decorator/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs section boundary detection ──────────────────────

test("search-docs splits on both heading and HR boundaries", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Section A",
        "Content about play functions and interaction testing.",
        "---",
        "Content about visual testing with snapshots.",
        "---",
        "# Section B",
        "More about play functions and user events.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "play functions" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ────────────────────────────────────────────────────

test("get-page fetches and returns markdown content", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/writing-stories`) {
      return createResponse("# Writing Stories\n\nStories are the building blocks of Storybook.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/writing-stories" });

    assert.equal(result.path, "/docs/writing-stories");
    assert.match(result.markdown, /writing stories/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/addons`) {
      return createResponse("# Addons\n\nExtend Storybook functionality.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://storybook.js.org/docs/addons" });

    assert.equal(result.path, "/docs/addons");
    assert.match(result.markdown, /addon/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/docs/nonexistent" }),
      (err) => {
        assert.match(err.message, /not found/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page skips responses that are actually HTML", async () => {
  const originalFetch = globalThis.fetch;
  const fetchedUrls = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);

    if (url === `${BASE}/docs/configure`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/docs/configure" }),
      (err) => {
        assert.match(err.message, /not found/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── error handling ──────────────────────────────────────────────

test("search-docs returns human-readable error on 404", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("search-docs", { query: "anything" }),
      (err) => {
        assert.match(err.message, /not found|404/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
