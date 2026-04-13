#!/usr/bin/env node
/**
 * tools/browser/wait.js
 *
 * Wait for a CSS selector to appear in the active tab.
 * Essential for SPAs and dynamically loaded content.
 *
 * Usage:
 *   bun tools/browser/wait.js '.loaded'          # Wait up to 5s
 *   bun tools/browser/wait.js '#content' 15      # Custom timeout in seconds
 *   bun tools/browser/wait.js '.item' --hidden   # Wait for element to be hidden
 */

import { connect } from "./shared.js";

const args = process.argv.slice(2);
const selector = args.find(a => !a.startsWith("--") && isNaN(Number(a)));
const timeoutArg = args.find(a => !a.startsWith("--") && !isNaN(Number(a)));
const hidden = args.includes("--hidden");
const timeout = (timeoutArg ? Number(timeoutArg) : 5) * 1000;

if (!selector) {
  console.log("Usage: wait.js <selector> [timeout_seconds] [--hidden]");
  process.exit(1);
}

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

try {
  await p.waitForSelector(selector, {
    timeout,
    hidden,
  });
  console.log(`✓ Found: ${selector}`);
} catch {
  console.error(`✗ Timeout: "${selector}" not found after ${timeout / 1000}s`);
  await b.disconnect();
  process.exit(1);
}

await b.disconnect();
