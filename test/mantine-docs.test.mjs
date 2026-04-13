import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeMantineDocPath, tools } from "../mantine-docs.js";

const BASE = "https://mantine.dev";

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

// ─── tools array ─────────────────────────────────────────────────

test("tools array exports exactly 3 tools", () => {
  assert.equal(tools.length, 3);
  const names = tools.map((t) => t.name);
  assert.deepEqual(names, ["get-index", "get-page", "search-docs"]);
});

test("each tool has a description and parameters object", () => {
  for (const tool of tools) {
    assert.ok(typeof tool.description === "string" && tool.description.length > 0);
    assert.ok(typeof tool.parameters === "object");
  }
});

// ─── normalizeMantineDocPath ─────────────────────────────────────

test("normalizeMantineDocPath strips absolute mantine.dev URLs", () => {
  assert.equal(
    normalizeMantineDocPath("https://mantine.dev/core/button"),
    "/core/button",
  );
  assert.equal(
    normalizeMantineDocPath("https://mantine.dev/hooks/use-disclosure"),
    "/hooks/use-disclosure",
  );
});

test("normalizeMantineDocPath strips .md and index.md suffixes", () => {
  assert.equal(normalizeMantineDocPath("/core/button.md"), "/core/button");
  assert.equal(normalizeMantineDocPath("/core/button/index.md"), "/core/button");
  assert.equal(normalizeMantineDocPath("form/use-form.md"), "/form/use-form");
});

test("normalizeMantineDocPath ensures leading slash", () => {
  assert.equal(normalizeMantineDocPath("core/button"), "/core/button");
  assert.equal(normalizeMantineDocPath("hooks/use-disclosure"), "/hooks/use-disclosure");
});

test("normalizeMantineDocPath returns empty string for empty input", () => {
  assert.equal(normalizeMantineDocPath(""), "");
  assert.equal(normalizeMantineDocPath(null), "");
  assert.equal(normalizeMantineDocPath(undefined), "");
});

test("normalizeMantineDocPath strips trailing slash", () => {
  assert.equal(normalizeMantineDocPath("/core/button/"), "/core/button");
});

// ─── invoke error handling ───────────────────────────────────────

test("invoke throws on unknown tool name", () => {
  assert.rejects(
    () => invoke("unknown-tool"),
    (err) => {
      assert.match(err.message, /unknown mantine-docs tool/i);
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

// ─── search-docs scoring ─────────────────────────────────────────

test("search-docs scores sections higher when more distinct query terms match", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Button",
        "A simple button component for user interactions.",
        "Use variant prop to change button appearance.",
        "",
        "# Notifications system",
        "Mantine notifications system provides a way to display notifications.",
        "Use notifications.show() to trigger notifications from anywhere.",
        "Notifications support custom styling and positioning.",
        "",
        "# Color scheme",
        "Mantine supports dark and light color schemes.",
        "Toggle color scheme with useMantineColorScheme hook.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "notifications show custom" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /notification/i, "Top result should contain notifications terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /notification/i, "First section should be the best match");
    }
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
        "# Button component",
        "A".repeat(5000) + " button details here.",
        "",
        "# Another button section",
        "More button information " + "B".repeat(5000),
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "button", maxChars: 200 });

    assert.ok(result.result.length <= 200, `Result should be <= 200 chars, got ${result.result.length}`);
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
        "# Modals manager",
        "Mantine modals manager allows you to open modals imperatively.",
        "Use modals.open() to display modal dialogs.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to use the modals in mantine" });

    assert.ok(result.found > 0, "Should find modals section despite stop words");
    assert.match(result.result, /modal/i);
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
        "Content about theming and dark mode.",
        "---",
        "Content about theming provider setup.",
        "---",
        "# Section B",
        "More about theming with CSS variables.",
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

// ─── heading boost ───────────────────────────────────────────────

test("search-docs boosts score when query term appears in heading", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms-full.txt`) {
      return createResponse([
        "# Accordion",
        "The accordion component shows collapsible content panels.",
        "",
        "# Tabs",
        "Tabs organize content into separate views. Also supports accordion-like behavior.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "accordion" });

    assert.ok(result.found > 0, "Should find matching sections");
    const sections = result.result.split("---");
    assert.match(sections[0].trim(), /^# Accordion/i, "Section with heading match should rank first");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
