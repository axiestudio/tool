#!/usr/bin/env node
/**
 * tools/browser/links.js
 *
 * Extract all links from the active tab.
 * Output: one link per line as "text :: href"
 *
 * Usage:
 *   bun tools/browser/links.js                  # All links
 *   bun tools/browser/links.js 'product'        # Filter by text or href pattern
 *   bun tools/browser/links.js --absolute       # Force absolute URLs
 *   bun tools/browser/links.js --json           # JSON output
 */

import { connect } from "./shared.js";

const args = process.argv.slice(2);
const pattern = args.find(a => !a.startsWith("--"));
const absolute = args.includes("--absolute");
const jsonMode = args.includes("--json");

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

const links = await p.evaluate((forceAbsolute) => {
  return Array.from(document.querySelectorAll("a[href]")).map((a) => ({
    text: a.innerText?.trim().replace(/\s+/g, " ").slice(0, 100) || "(no text)",
    href: forceAbsolute ? a.href : (a.getAttribute("href") || a.href),
  })).filter(l => l.href && !l.href.startsWith("javascript:"));
}, absolute);

const filtered = pattern
  ? links.filter(l =>
      l.text.toLowerCase().includes(pattern.toLowerCase()) ||
      l.href.toLowerCase().includes(pattern.toLowerCase()),
    )
  : links;

if (jsonMode) {
  console.log(JSON.stringify(filtered, null, 2));
} else {
  for (const l of filtered) {
    console.log(`${l.text} :: ${l.href}`);
  }
  console.log(`\n(${filtered.length} links${pattern ? ` matching "${pattern}"` : ""})`);
}

await b.disconnect();
