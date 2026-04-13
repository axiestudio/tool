#!/usr/bin/env node
/**
 * tools/browser/scroll.js
 *
 * Scroll the active tab.
 *
 * Usage:
 *   bun tools/browser/scroll.js bottom       # Scroll to bottom
 *   bun tools/browser/scroll.js top          # Scroll to top
 *   bun tools/browser/scroll.js 500          # Scroll down by 500px
 *   bun tools/browser/scroll.js '#footer'    # Scroll element into view
 *   bun tools/browser/scroll.js bottom --wait 2  # Scroll to bottom, wait 2s (infinite scroll)
 */

import { connect } from "./shared.js";

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith("--"));
const waitArg = args[args.indexOf("--wait") + 1];
const waitMs = waitArg ? Number(waitArg) * 1000 : 0;

if (!target) {
  console.log("Usage: scroll.js <bottom|top|<px>|<selector>> [--wait <seconds>]");
  process.exit(1);
}

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

if (target === "bottom") {
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  if (waitMs) await new Promise(r => setTimeout(r, waitMs));
  const pos = await p.evaluate(() => window.scrollY);
  console.log(`✓ Scrolled to bottom (y=${pos})`);
} else if (target === "top") {
  await p.evaluate(() => window.scrollTo(0, 0));
  console.log("✓ Scrolled to top");
} else if (!isNaN(Number(target))) {
  const px = Number(target);
  await p.evaluate((n) => window.scrollBy(0, n), px);
  const pos = await p.evaluate(() => window.scrollY);
  console.log(`✓ Scrolled by ${px}px (y=${pos})`);
} else {
  // CSS selector
  const found = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }, target);

  if (!found) {
    console.error(`✗ Selector not found: ${target}`);
    await b.disconnect();
    process.exit(1);
  }
  console.log(`✓ Scrolled to: ${target}`);
}

await b.disconnect();
