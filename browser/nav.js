#!/usr/bin/env node
/**
 * tools/browser/nav.js
 *
 * Navigate to a URL in the active tab or open a new one.
 *
 * Usage:
 *   bun tools/browser/nav.js https://example.com        # Navigate current tab
 *   bun tools/browser/nav.js https://example.com --new  # Open new tab
 */

import { connect } from "./shared.js";

const url = process.argv[2];
const newTab = process.argv[3] === "--new";

if (!url) {
  console.log("Usage: nav.js <url> [--new]");
  process.exit(1);
}

const b = await connect();

if (newTab) {
  const p = await b.newPage();
  await p.goto(url, { waitUntil: "domcontentloaded" });
  console.log("✓ Opened:", url);
} else {
  const pages = await b.pages();
  const p = pages.at(-1);
  if (!p) { console.error("✗ No active tab"); process.exit(1); }
  await p.goto(url, { waitUntil: "domcontentloaded" });
  console.log("✓ Navigated to:", url);
}

await b.disconnect();
