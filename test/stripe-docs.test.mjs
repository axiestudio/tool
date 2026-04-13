import assert from "node:assert/strict";
import test from "node:test";

import { invoke, normalizeStripeDocPath } from "../stripe-docs.js";

const BASE = "https://docs.stripe.com";

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

// ─── normalizeStripeDocPath ──────────────────────────────────────

test("normalizeStripeDocPath converts absolute URLs to clean paths", () => {
  assert.equal(
    normalizeStripeDocPath("https://docs.stripe.com/payments/accept-a-payment"),
    "/payments/accept-a-payment",
  );
  assert.equal(
    normalizeStripeDocPath("https://docs.stripe.com/billing/subscriptions/overview"),
    "/billing/subscriptions/overview",
  );
  assert.equal(
    normalizeStripeDocPath("https://docs.stripe.com/api/charges"),
    "/api/charges",
  );
});

test("normalizeStripeDocPath strips .md and index.md suffixes", () => {
  assert.equal(
    normalizeStripeDocPath("/payments/accept-a-payment.md"),
    "/payments/accept-a-payment",
  );
  assert.equal(
    normalizeStripeDocPath("/billing/subscriptions/index.md"),
    "/billing/subscriptions",
  );
  assert.equal(
    normalizeStripeDocPath("webhooks.md"),
    "/webhooks",
  );
});

test("normalizeStripeDocPath ensures leading slash for relative paths", () => {
  assert.equal(
    normalizeStripeDocPath("payments/accept-a-payment"),
    "/payments/accept-a-payment",
  );
  assert.equal(
    normalizeStripeDocPath("connect/oauth"),
    "/connect/oauth",
  );
});

test("normalizeStripeDocPath strips query params and hash", () => {
  assert.equal(
    normalizeStripeDocPath("/api/charges?expand=true#create"),
    "/api/charges",
  );
  assert.equal(
    normalizeStripeDocPath("https://docs.stripe.com/webhooks#verify-events"),
    "/webhooks",
  );
});

test("normalizeStripeDocPath returns empty string for empty input", () => {
  assert.equal(normalizeStripeDocPath(""), "");
  assert.equal(normalizeStripeDocPath(null), "");
  assert.equal(normalizeStripeDocPath(undefined), "");
});

test("normalizeStripeDocPath strips trailing slash", () => {
  assert.equal(
    normalizeStripeDocPath("/payments/accept-a-payment/"),
    "/payments/accept-a-payment",
  );
});

// ─── get-index ───────────────────────────────────────────────────

test("get-index fetches Stripe llms.txt and returns index", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/llms.txt`) {
      return createResponse(
        "# Stripe Documentation\n\n" +
        "- [Accept a payment](/payments/accept-a-payment)\n" +
        "- [Subscriptions](/billing/subscriptions/overview)\n" +
        "- [Connect](/connect)\n" +
        "- [Webhooks](/webhooks)\n",
      );
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("get-index");
    assert.ok(result.index.includes("Stripe Documentation"));
    assert.ok(result.index.includes("/payments/accept-a-payment"));
    assert.ok(result.index.includes("/webhooks"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── get-page ────────────────────────────────────────────────────

test("get-page fetches a Stripe doc page as markdown", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/payments/accept-a-payment.md`) {
      return createResponse("# Accept a payment\n\nUse the Payment Intents API to accept payments.");
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/payments/accept-a-payment" });
    assert.equal(result.path, "/payments/accept-a-payment");
    assert.match(result.markdown, /Payment Intents API/);
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

    if (url === `${BASE}/webhooks`) {
      return createResponse("# Webhooks\n\nListen for events on your Stripe account.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/webhooks" });

    assert.equal(result.path, "/webhooks");
    assert.match(result.markdown, /events/i);
    assert.ok(fetchedUrls.includes(`${BASE}/webhooks.md`), "Should try .md extension first");
    assert.ok(fetchedUrls.includes(`${BASE}/webhooks`), "Should try bare path as fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page normalizes absolute URL input", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === `${BASE}/api/charges.md`) {
      return createResponse("# Charges\n\nCreate and manage charges.");
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "https://docs.stripe.com/api/charges" });
    assert.equal(result.path, "/api/charges");
    assert.match(result.markdown, /charges/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("get-page throws descriptive error when page not found", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  try {
    await assert.rejects(
      () => invoke("get-page", { path: "/nonexistent-page" }),
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

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/stripe-js.md`) {
      return new Response("<!DOCTYPE html><html><body>Not markdown</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${BASE}/stripe-js`) {
      return createResponse("# Stripe.js\n\nClient-side JavaScript library.");
    }

    return new Response("Not found", { status: 404 });
  };

  try {
    const result = await invoke("get-page", { path: "/stripe-js" });
    assert.equal(result.path, "/stripe-js");
    assert.match(result.markdown, /Stripe\.js/);
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
        "# Payments",
        "Use the Payment Intents API to accept payments.",
        "Create a PaymentIntent to start collecting a payment.",
        "",
        "# Subscriptions and recurring billing",
        "Manage subscriptions with the Billing API.",
        "Use subscriptions for recurring billing cycles.",
        "Subscriptions support trials and metered billing.",
        "",
        "# Webhooks",
        "Listen for events on your Stripe account.",
        "Verify webhook signatures for security.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "subscriptions recurring billing" });

    assert.ok(result.found > 0, "Should find matching sections");
    assert.match(result.result, /subscription|billing/i, "Top result should contain subscription/billing terms");

    const sections = result.result.split("---");
    if (sections.length > 1) {
      assert.match(sections[0], /subscription|billing/i, "First section should be the best match");
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
        "# Webhooks",
        "Listen for events on your Stripe account.",
        "Verify webhook signatures to confirm authenticity.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "how to verify the webhook signatures" });

    assert.ok(result.found > 0, "Should find webhook section despite stop words");
    assert.match(result.result, /webhook/i);
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
        "# Payment Intents",
        "Create and confirm payment intents for checkout.",
        "---",
        "Content about payment methods and checkout sessions.",
        "---",
        "# Connect",
        "Payment processing with connected accounts and payment intents.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "payment intents" });

    assert.ok(result.found >= 2, "Should find at least 2 sections split by headings and HRs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search-docs returns 'No relevant sections found.' when nothing matches", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url === `${BASE}/llms.txt`) {
      return createResponse([
        "# Payments",
        "Use the Payment Intents API.",
      ].join("\n"));
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const result = await invoke("search-docs", { query: "xyznonexistent" });

    assert.equal(result.found, 0);
    assert.equal(result.result, "No relevant sections found.");
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
      assert.match(err.message, /unknown stripe-docs tool/i);
      return true;
    },
  );
});
