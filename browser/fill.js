#!/usr/bin/env node
/**
 * tools/browser/fill.js
 *
 * Fill a form field in the active tab. Optionally submit.
 *
 * Usage:
 *   bun tools/browser/fill.js '#email' user@example.com
 *   bun tools/browser/fill.js 'input[name=q]' 'search query' --submit
 *   bun tools/browser/fill.js '#btn' --click                  # Click only
 *   bun tools/browser/fill.js '#select' 'Option Label' --select  # Select dropdown
 */

import { connect } from "./shared.js";

const args = process.argv.slice(2);
const selector = args[0];
const value = args.find((a, i) => i > 0 && !a.startsWith("--"));
const submit = args.includes("--submit");
const clickOnly = args.includes("--click");
const isSelect = args.includes("--select");

if (!selector) {
  console.log("Usage: fill.js <selector> [value] [--submit] [--click] [--select]");
  process.exit(1);
}

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

// Wait for the element to exist
await p.waitForSelector(selector, { timeout: 5000 }).catch(() => {});
const el = await p.$(selector);

if (!el) {
  console.error(`✗ Selector not found: ${selector}`);
  await b.disconnect();
  process.exit(1);
}

if (clickOnly) {
  await el.click();
  console.log(`✓ Clicked: ${selector}`);
} else if (isSelect && value) {
  await p.select(selector, value);
  console.log(`✓ Selected "${value}" in: ${selector}`);
} else if (value !== undefined) {
  // Clear existing value, then type
  await el.click({ clickCount: 3 });
  await el.type(value, { delay: 30 });
  console.log(`✓ Filled "${value}" into: ${selector}`);

  if (submit) {
    await el.press("Enter");
    console.log("✓ Submitted (Enter)");
  }
} else {
  console.error("✗ No value provided");
  await b.disconnect();
  process.exit(1);
}

await b.disconnect();
