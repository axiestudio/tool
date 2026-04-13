#!/usr/bin/env node
/**
 * tools/browser/cookies.js
 *
 * Export cookies for the active tab — including HTTP-only cookies,
 * which JavaScript in the page cannot access.
 *
 * Usage:
 *   bun tools/browser/cookies.js              # Print all cookies as JSON
 *   bun tools/browser/cookies.js 'session'    # Filter by name pattern
 *   bun tools/browser/cookies.js --curl       # Output as curl --cookie flag
 *   bun tools/browser/cookies.js --env        # Output as shell export statements
 */

import { connect } from "./shared.js";

const args = process.argv.slice(2);
const pattern = args.find(a => !a.startsWith("--"));
const curlMode = args.includes("--curl");
const envMode = args.includes("--env");

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

const allCookies = await p.cookies();
const cookies = pattern
  ? allCookies.filter(c => c.name.toLowerCase().includes(pattern.toLowerCase()))
  : allCookies;

if (curlMode) {
  // Output as a curl --cookie string
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
  console.log(`--cookie "${cookieStr}"`);
} else if (envMode) {
  // Output as shell variables (useful for scripts)
  for (const c of cookies) {
    const varName = c.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    console.log(`export COOKIE_${varName}="${c.value}"`);
  }
} else {
  console.log(JSON.stringify(cookies, null, 2));
  console.log(`\n(${cookies.length} cookies${pattern ? ` matching "${pattern}"` : ""})`);
}

await b.disconnect();
