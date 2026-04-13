import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeShadcnDocPath } from "../shadcn-docs.js";

const BASE = "https://ui.shadcn.com";

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

// ─── normalizeShadcnDocPath ──────────────────────────────────────

test("normalizeShadcnDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeShadcnDocPath("https://ui.shadcn.com/docs/components/button"),
    "/docs/components/button",
  );
  assert.equal(
    normalizeShadcnDocPath("https://ui.shadcn.com/docs/installation"),
    "/docs/installation",
  );
  assert.equal(
    normalizeShadcnDocPath("https://ui.shadcn.com/docs/components/data-table"),
    "/docs/components/data-table",
  );
});

test("normalizeShadcnDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeShadcnDocPath("/docs/components/button.md"),
    "/docs/components/button",
  );
  assert.equal(
    normalizeShadcnDocPath("/docs/theming/index.md"),
    "/docs/theming",
  );
  assert.equal(
    normalizeShadcnDocPath("docs/dark-mode.md"),
    "/docs/dark-mode",
  );
});

test("normalizeShadcnDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeShadcnDocPath("docs/components/dialog"),
    "/docs/components/dialog",
  );
  assert.equal(
    normalizeShadcnDocPath("docs/cli"),
    "/docs/cli",
  );
});

test("normalizeShadcnDocPath strips query params and hash", () => {
  assert.equal(
    normalizeShadcnDocPath("/docs/components/button?tab=usage#examples"),
    "/docs/components/button",
  );
  assert.equal(
    normalizeShadcnDocPath("https://ui.shadcn.com/docs/theming#css-variables"),
    "/docs/theming",
  );
});

test("normalizeShadcnDocPath returns empty string for empty input", () => {
  assert.equal(normalizeShadcnDocPath(""), "");
  assert.equal(normalizeShadcnDocPath(null), "");
  assert.equal(normalizeShadcnDocPath(undefined), "");
});

test("normalizeShadcnDocPath strips trailing slash", () => {
  assert.equal(
    normalizeShadcnDocPath("/docs/components/button/"),
    "/docs/components/button",
  );
});

// ─── get-index ───────────────────────────────────────────────────

test("get-index fetches llms.txt and returns index", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse("# shadcn/ui docs\n\n- /docs/installation\n- /docs/components/button");
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-index");

    assert.ok(result.index.includes("/docs/installation"));
    assert.ok(result.index.includes("/docs/components/button"));
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

    if (url === `${BASE}/docs/components/button`) {
      return createResponse("# Button\n\nDisplays a button or a component that looks like a button.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/components/button" });

    assert.equal(result.path, "/docs/components/button");
    assert.match(result.markdown, /button/i);
    assert.ok(fetchedUrls.includes(`${BASE}/docs/components/button.md`), "Should try .md extension first");
    assert.ok(fetchedUrls.includes(`${BASE}/docs/components/button`), "Should try bare path as fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/docs/components/dialog.md`) {
      return createResponse("# Dialog\n\nA window overlaid on the primary content.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://ui.shadcn.com/docs/components/dialog" });

    assert.equal(result.path, "/docs/components/dialog");
    assert.match(result.markdown, /dialog/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/docs/components/nonexistent" }),
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

    if (url === `${BASE}/docs/theming.md`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${BASE}/docs/theming/index.md`) {
      return createResponse("# Theming\n\nCustomize the look and feel using CSS variables.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/docs/theming" });

    assert.equal(result.path, "/docs/theming");
    assert.match(result.markdown, /theming/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── search-docs ─────────────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Button",
        "Displays a button or a component that looks like a button.",
        "Use the buttonVariants helper to create link buttons.",
        "",
        "# Data Table",
        "A powerful table component built with TanStack Table.",
        "Supports sorting, filtering, and pagination for data tables.",
        "Data tables can display complex structured data.",
        "",
        "# Installation",
        "How to install dependencies and structure your app.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "data table sorting filtering" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /data table|sorting|filtering/i, "Top result should contain data table terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /data table/i, "First section should be the best match");
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
        "# Dark Mode",
        "Adding dark mode to your application with next-themes.",
        "Configure dark mode with CSS variables and Tailwind.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to add the dark mode in my app" });

    assert.ok(result.found > 0, "Should find dark mode section despite stop words");
    assert.match(result.result, /dark mode/i);
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
        "Content about theming and CSS variables.",
        "---",
        "Content about theming with Tailwind.",
        "---",
        "# Section B",
        "More about theming and color tokens.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "theming" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("search-docs throws when query is missing", async () => {
  await assert.rejects(
    () => invoke("search-docs", {}),
    (err) => {
      assert.match(err.message, /requires.*query/i);
      return true;
    },
  );
});

test("search-docs respects maxChars limit", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Component A",
        "Button component with many variants and sizes.",
        "",
        "# Component B",
        "Another button-like component with different props.",
        "",
        "# Component C",
        "Yet another button wrapper for special use cases.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "button", maxChars: 80 });

    assert.ok(result.result.length <= 83, "Result should respect maxChars (with ellipsis tolerance)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── unknown tool ────────────────────────────────────────────────

test("invoke throws for unknown tool name", async () => {
  await assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.match(err.message, /unknown.*shadcn-docs/i);
      return true;
    },
  );
});
