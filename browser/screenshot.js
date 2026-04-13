#!/usr/bin/env node
/**
 * tools/browser/screenshot.js
 *
 * Take a screenshot of the current viewport in the active tab.
 * Outputs the file path — the agent can read the image with its vision capabilities.
 *
 * Usage:
 *   bun tools/browser/screenshot.js              # Viewport screenshot
 *   bun tools/browser/screenshot.js --full       # Full-page screenshot
 *   bun tools/browser/screenshot.js --full '#id' # Screenshot specific element
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "./shared.js";

const args = process.argv.slice(2);
const fullPage = args.includes("--full");
const selector = args.find(a => !a.startsWith("-"));

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filepath = join(tmpdir(), `screenshot-${timestamp}.png`);

if (selector) {
  // Screenshot specific element
  await p.waitForSelector(selector, { timeout: 5000 }).catch(() => {});
  const el = await p.$(selector);
  if (!el) {
    console.error(`✗ Selector not found: ${selector}`);
    await b.disconnect();
    process.exit(1);
  }
  await el.screenshot({ path: filepath });
} else {
  await p.screenshot({ path: filepath, fullPage });
}

console.log(filepath);
await b.disconnect();
