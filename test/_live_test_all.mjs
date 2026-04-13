#!/usr/bin/env node
/**
 * Live API test — hits every tool's get-index (or equivalent) endpoint once.
 * Reports pass/fail for each. Exit code = number of failures.
 *
 * Usage: node test/_live_test_all.mjs
 */

const TIMEOUT = 15_000;

/** Wrap a promise with a timeout */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Each entry: [label, modulePath, toolName, args, validator]
 * validator(result) should return true if the result looks valid.
 */
const tests = [
  // --- Original 8 ---
  ["context7 resolve-library-id", "../context7.js", "resolve-library-id", { libraryName: "hono" },
    (r) => typeof r === "string" && r.length > 0],
  ["cloudflare-docs list-products", "../cloudflare-docs.js", "list-products", {},
    (r) => r.products && r.products.length > 0],
  ["npm search", "../npm.js", "search", { query: "hono" },
    (r) => r.packages && r.packages.length > 0],
  ["github get-repo-info", "../github.js", "get-repo-info", { owner: "honojs", repo: "hono" },
    (r) => r.fullName && r.fullName.length > 0],
  ["astro-docs get-index", "../astro-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["drizzle-docs get-index", "../drizzle-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["better-auth-docs get-index", "../better-auth-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["livekit-docs get-index", "../livekit-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],

  // --- Round 1 (10) ---
  ["hono-docs get-index", "../hono-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["react-docs get-index", "../react-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["nextjs-docs get-index", "../nextjs-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["zod-docs get-index", "../zod-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["bun-docs get-index", "../bun-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["stripe-docs get-index", "../stripe-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["tanstack-docs get-index", "../tanstack-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["shadcn-docs get-index", "../shadcn-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["neon-docs get-index", "../neon-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["deno-docs get-index", "../deno-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],

  // --- Round 2 (12) ---
  ["vitest-docs get-index", "../vitest-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["svelte-docs get-index", "../svelte-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["vue-docs get-index", "../vue-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["angular-docs get-index", "../angular-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["nuxt-docs get-index", "../nuxt-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["clerk-docs get-index", "../clerk-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["convex-docs get-index", "../convex-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["turso-docs get-index", "../turso-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["supabase-docs get-index", "../supabase-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["prisma-docs get-index", "../prisma-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["turborepo-docs get-index", "../turborepo-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["elevenlabs-docs get-index", "../elevenlabs-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],

  // --- Round 3 (6) ---
  ["trpc-docs get-index", "../trpc-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["solid-docs get-index", "../solid-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["elysia-docs get-index", "../elysia-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["fastify-docs get-index", "../fastify-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["effect-docs get-index", "../effect-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["xstate-docs get-index", "../xstate-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],

  // --- Round 4 (7) ---
  ["vite-docs get-index", "../vite-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["vercel-docs get-index", "../vercel-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["payload-docs get-index", "../payload-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["resend-docs get-index", "../resend-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["mantine-docs get-index", "../mantine-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["langchain-docs get-index", "../langchain-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["nitro-docs get-index", "../nitro-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],

  // --- Round 5 (7) ---
  ["panda-css-docs get-index", "../panda-css-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["expo-docs get-index", "../expo-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["zustand-docs get-index", "../zustand-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["storybook-docs get-index", "../storybook-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["tauri-docs get-index", "../tauri-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["rspack-docs get-index", "../rspack-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
  ["wxt-docs get-index", "../wxt-docs.js", "get-index", {},
    (r) => r.index && r.index.length > 100],
];

async function main() {
  console.log(`\n  Live API Test — ${tests.length} tools\n`);
  const results = [];
  let pass = 0;
  let fail = 0;

  // Run in batches of 10 to avoid overwhelming networks
  for (let i = 0; i < tests.length; i += 10) {
    const batch = tests.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(async ([label, modPath, toolName, args, validator]) => {
        const mod = await import(modPath);
        const result = await withTimeout(mod.invoke(toolName, args), TIMEOUT, label);
        if (!validator(result)) throw new Error("Validation failed — unexpected result shape");
        return label;
      })
    );
    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      const label = batch[j][0];
      if (r.status === "fulfilled") {
        console.log(`  ✅ ${label}`);
        pass++;
      } else {
        console.log(`  ❌ ${label} — ${r.reason?.message || r.reason}`);
        fail++;
        results.push({ label, error: r.reason?.message });
      }
    }
  }

  console.log(`\n  ${pass} passed, ${fail} failed out of ${tests.length}\n`);
  if (fail > 0) {
    console.log("  Failures:");
    for (const { label, error } of results) {
      console.log(`    - ${label}: ${error}`);
    }
  }
  process.exit(fail);
}

main();
