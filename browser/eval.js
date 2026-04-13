#!/usr/bin/env node
/**
 * tools/browser/eval.js
 *
 * Execute JavaScript in the active tab's page context.
 * Runs in an async context — you can use await.
 *
 * Usage:
 *   bun tools/browser/eval.js 'document.title'
 *   bun tools/browser/eval.js 'document.querySelectorAll("a").length'
 *   bun tools/browser/eval.js 'await fetch("/api/status").then(r => r.json())'
 */

import { connect } from "./shared.js";

const code = process.argv.slice(2).join(" ");

if (!code) {
  console.log("Usage: eval.js '<js expression>'");
  process.exit(1);
}

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

let result;
try {
  result = await p.evaluate((c) => {
    const AsyncFunction = (async () => {}).constructor;
    return new AsyncFunction(`return (${c})`)();
  }, code);
} catch (err) {
  console.error("✗ Eval error:", err.message);
  await b.disconnect();
  process.exit(1);
}

if (Array.isArray(result)) {
  for (let i = 0; i < result.length; i++) {
    if (i > 0) console.log("");
    if (typeof result[i] === "object" && result[i] !== null) {
      for (const [k, v] of Object.entries(result[i])) console.log(`${k}: ${v}`);
    } else {
      console.log(result[i]);
    }
  }
} else if (typeof result === "object" && result !== null) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result);
}

await b.disconnect();
