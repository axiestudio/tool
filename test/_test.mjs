// Validation script — tests all tools
const results = [];
function ok(tool, cmd) { results.push(`  ✓ ${tool}.${cmd}`); }
function fail(tool, cmd, err) { results.push(`  ✗ ${tool}.${cmd}: ${err}`); }

// ─── npm ─────────────────────────────────────────────────────────
console.log("Testing npm...");
try {
  const npm = await import("../npm.js");
  const s = await npm.invoke("search", { query: "hono" });
  s.packages?.length > 0 ? ok("npm", "search") : fail("npm", "search", "no results");
  const r = await npm.invoke("get-readme", { packageName: "hono" });
  typeof r.readme === "string" && r.readme.length > 10 ? ok("npm", "get-readme") : fail("npm", "get-readme", "empty");
  const i = await npm.invoke("get-package-info", { packageName: "hono" });
  i.name === "hono" ? ok("npm", "get-package-info") : fail("npm", "get-package-info", "wrong name");
  const v = await npm.invoke("get-versions", { packageName: "hono" });
  const vers = v.versions ?? v;
  (Array.isArray(vers) ? vers : Object.keys(vers)).length > 0 ? ok("npm", "get-versions") : fail("npm", "get-versions", "no versions");
  const dl = await npm.invoke("get-downloads", { packageName: "hono" });
  typeof dl.weekly === "number" && dl.weekly > 0 ? ok("npm", "get-downloads") : fail("npm", "get-downloads", "no weekly downloads");
  const deps = await npm.invoke("get-dependencies", { packageName: "hono" });
  typeof deps.totalDeps === "number" ? ok("npm", "get-dependencies") : fail("npm", "get-dependencies", "no totalDeps");
} catch (e) { fail("npm", "*", e.message); }

// ─── github ──────────────────────────────────────────────────────
console.log("Testing github...");
try {
  const gh = await import("../github.js");
  const f = await gh.invoke("get-file", { owner: "honojs", repo: "hono", path: "README.md" });
  f.content?.length > 0 ? ok("github", "get-file") : fail("github", "get-file", "empty");
  const d = await gh.invoke("list-dir", { owner: "honojs", repo: "hono", path: "src" });
  (d.entries ?? d).length > 0 ? ok("github", "list-dir") : fail("github", "list-dir", "empty");
  const ri = await gh.invoke("get-repo-info", { owner: "honojs", repo: "hono" });
  ri.fullName || ri.full_name ? ok("github", "get-repo-info") : fail("github", "get-repo-info", "no name");
  const rel = await gh.invoke("get-releases", { owner: "honojs", repo: "hono" });
  (rel.releases ?? rel).length > 0 ? ok("github", "get-releases") : fail("github", "get-releases", "empty");
  // normalizeGitHubUrl
  const norm = gh.normalizeGitHubUrl("https://github.com/honojs/hono/blob/main/src/index.ts");
  norm.owner === "honojs" && norm.repo === "hono" ? ok("github", "normalizeGitHubUrl") : fail("github", "normalizeGitHubUrl", "bad parse");
  // compare-tags (use known Hono tags)
  const cmp = await gh.invoke("compare-tags", { owner: "honojs", repo: "hono", base: "v4.0.0", head: "v4.0.1" });
  typeof cmp.total_commits === "number" ? ok("github", "compare-tags") : fail("github", "compare-tags", "no commits");
} catch (e) { fail("github", "*", e.message); }

// ─── context7 ────────────────────────────────────────────────────
console.log("Testing context7...");
try {
  const c7 = await import("../context7.js");
  const id = await c7.invoke("resolve-library-id", { libraryName: "react" });
  typeof id === "string" && id.length > 0 ? ok("context7", "resolve-library-id") : fail("context7", "resolve-library-id", "bad id");
  const docs = await c7.invoke("get-library-docs", { libraryId: id, topic: "hooks", tokens: 500 });
  String(docs).length > 10 ? ok("context7", "get-library-docs") : fail("context7", "get-library-docs", "empty");
} catch (e) { fail("context7", "*", e.message); }

// ─── cloudflare-docs ─────────────────────────────────────────────
console.log("Testing cloudflare-docs...");
try {
  const cf = await import("../cloudflare-docs.js");
  const prods = await cf.invoke("list-products");
  (prods.products ?? prods).length > 0 ? ok("cloudflare", "list-products") : fail("cloudflare", "list-products", "empty");
  const page = await cf.invoke("get-page", { path: "/workers/" });
  (page.markdown ?? page).length > 10 ? ok("cloudflare", "get-page") : fail("cloudflare", "get-page", "empty");
  const sr = await cf.invoke("search-docs", { product: "workers", query: "KV" });
  (sr.result ?? sr.found ?? sr).toString().length > 0 ? ok("cloudflare", "search-docs") : fail("cloudflare", "search-docs", "empty");
} catch (e) { fail("cloudflare", "*", e.message); }

// ─── astro-docs ──────────────────────────────────────────────────
console.log("Testing astro-docs...");
try {
  const ast = await import("../astro-docs.js");
  const idx = await ast.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("astro", "get-index") : fail("astro", "get-index", "empty");
  const p = await ast.invoke("search-docs", { query: "middleware" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("astro", "search-docs") : fail("astro", "search-docs", "empty");
} catch (e) { fail("astro", "*", e.message); }

// ─── drizzle-docs ────────────────────────────────────────────────
console.log("Testing drizzle-docs...");
try {
  const dz = await import("../drizzle-docs.js");
  const idx = await dz.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("drizzle", "get-index") : fail("drizzle", "get-index", "empty");
  const p = await dz.invoke("search-docs", { query: "migrations" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("drizzle", "search-docs") : fail("drizzle", "search-docs", "empty");
} catch (e) { fail("drizzle", "*", e.message); }

// ─── better-auth-docs ────────────────────────────────────────────
console.log("Testing better-auth-docs...");
try {
  const ba = await import("../better-auth-docs.js");
  const idx = await ba.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("better-auth", "get-index") : fail("better-auth", "get-index", "empty");
  const p = await ba.invoke("search-docs", { query: "session" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("better-auth", "search-docs") : fail("better-auth", "search-docs", "empty");
} catch (e) { fail("better-auth", "*", e.message); }

// ─── livekit-docs ────────────────────────────────────────────────
console.log("Testing livekit-docs...");
try {
  const lk = await import("../livekit-docs.js");
  const idx = await lk.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("livekit", "get-index") : fail("livekit", "get-index", "empty");
  const p = await lk.invoke("search-docs", { query: "voice agent" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("livekit", "search-docs") : fail("livekit", "search-docs", "empty");
} catch (e) { fail("livekit", "*", e.message); }

// ─── hono-docs ───────────────────────────────────────────────────
console.log("Testing hono-docs...");
try {
  const hono = await import("../hono-docs.js");
  const idx = await hono.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("hono", "get-index") : fail("hono", "get-index", "empty");
  const p = await hono.invoke("search-docs", { query: "middleware" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("hono", "search-docs") : fail("hono", "search-docs", "empty");
} catch (e) { fail("hono", "*", e.message); }

// ─── react-docs ──────────────────────────────────────────────────
console.log("Testing react-docs...");
try {
  const react = await import("../react-docs.js");
  const idx = await react.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("react", "get-index") : fail("react", "get-index", "empty");
  const p = await react.invoke("search-docs", { query: "hooks" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("react", "search-docs") : fail("react", "search-docs", "empty");
} catch (e) { fail("react", "*", e.message); }

// ─── nextjs-docs ─────────────────────────────────────────────────
console.log("Testing nextjs-docs...");
try {
  const nextjs = await import("../nextjs-docs.js");
  const idx = await nextjs.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("nextjs", "get-index") : fail("nextjs", "get-index", "empty");
  const p = await nextjs.invoke("search-docs", { query: "routing" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("nextjs", "search-docs") : fail("nextjs", "search-docs", "empty");
} catch (e) { fail("nextjs", "*", e.message); }

// ─── zod-docs ────────────────────────────────────────────────────
console.log("Testing zod-docs...");
try {
  const zod = await import("../zod-docs.js");
  const idx = await zod.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("zod", "get-index") : fail("zod", "get-index", "empty");
  const p = await zod.invoke("search-docs", { query: "validation" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("zod", "search-docs") : fail("zod", "search-docs", "empty");
} catch (e) { fail("zod", "*", e.message); }

// ─── bun-docs ────────────────────────────────────────────────────
console.log("Testing bun-docs...");
try {
  const bun = await import("../bun-docs.js");
  const idx = await bun.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("bun", "get-index") : fail("bun", "get-index", "empty");
  const p = await bun.invoke("search-docs", { query: "runtime" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("bun", "search-docs") : fail("bun", "search-docs", "empty");
} catch (e) { fail("bun", "*", e.message); }

// ─── stripe-docs ─────────────────────────────────────────────────
console.log("Testing stripe-docs...");
try {
  const stripe = await import("../stripe-docs.js");
  const idx = await stripe.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("stripe", "get-index") : fail("stripe", "get-index", "empty");
  const p = await stripe.invoke("search-docs", { query: "payments" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("stripe", "search-docs") : fail("stripe", "search-docs", "empty");
} catch (e) { fail("stripe", "*", e.message); }

// ─── tanstack-docs ───────────────────────────────────────────────
console.log("Testing tanstack-docs...");
try {
  const tanstack = await import("../tanstack-docs.js");
  const idx = await tanstack.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("tanstack", "get-index") : fail("tanstack", "get-index", "empty");
  const p = await tanstack.invoke("search-docs", { query: "useQuery" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("tanstack", "search-docs") : fail("tanstack", "search-docs", "empty");
} catch (e) { fail("tanstack", "*", e.message); }

// ─── shadcn-docs ─────────────────────────────────────────────────
console.log("Testing shadcn-docs...");
try {
  const shadcn = await import("../shadcn-docs.js");
  const idx = await shadcn.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("shadcn", "get-index") : fail("shadcn", "get-index", "empty");
  const p = await shadcn.invoke("search-docs", { query: "button" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("shadcn", "search-docs") : fail("shadcn", "search-docs", "empty");
} catch (e) { fail("shadcn", "*", e.message); }

// ─── neon-docs ───────────────────────────────────────────────────
console.log("Testing neon-docs...");
try {
  const neon = await import("../neon-docs.js");
  const idx = await neon.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("neon", "get-index") : fail("neon", "get-index", "empty");
  const p = await neon.invoke("search-docs", { query: "branching" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("neon", "search-docs") : fail("neon", "search-docs", "empty");
} catch (e) { fail("neon", "*", e.message); }

// ─── deno-docs ───────────────────────────────────────────────────
console.log("Testing deno-docs...");
try {
  const deno = await import("../deno-docs.js");
  const idx = await deno.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("deno", "get-index") : fail("deno", "get-index", "empty");
  const p = await deno.invoke("search-docs", { query: "typescript" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("deno", "search-docs") : fail("deno", "search-docs", "empty");
} catch (e) { fail("deno", "*", e.message); }

// ─── vitest-docs ─────────────────────────────────────────────────
console.log("Testing vitest-docs...");
try {
  const vitest = await import("../vitest-docs.js");
  const idx = await vitest.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("vitest", "get-index") : fail("vitest", "get-index", "empty");
  const p = await vitest.invoke("search-docs", { query: "snapshot" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("vitest", "search-docs") : fail("vitest", "search-docs", "empty");
} catch (e) { fail("vitest", "*", e.message); }

// ─── svelte-docs ─────────────────────────────────────────────────
console.log("Testing svelte-docs...");
try {
  const svelte = await import("../svelte-docs.js");
  const idx = await svelte.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("svelte", "get-index") : fail("svelte", "get-index", "empty");
  const p = await svelte.invoke("search-docs", { query: "reactivity" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("svelte", "search-docs") : fail("svelte", "search-docs", "empty");
} catch (e) { fail("svelte", "*", e.message); }

// ─── vue-docs ────────────────────────────────────────────────────
console.log("Testing vue-docs...");
try {
  const vue = await import("../vue-docs.js");
  const idx = await vue.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("vue", "get-index") : fail("vue", "get-index", "empty");
  const p = await vue.invoke("search-docs", { query: "reactivity" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("vue", "search-docs") : fail("vue", "search-docs", "empty");
} catch (e) { fail("vue", "*", e.message); }

// ─── angular-docs ────────────────────────────────────────────────
console.log("Testing angular-docs...");
try {
  const angular = await import("../angular-docs.js");
  const idx = await angular.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("angular", "get-index") : fail("angular", "get-index", "empty");
  const p = await angular.invoke("search-docs", { query: "signals" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("angular", "search-docs") : fail("angular", "search-docs", "empty");
} catch (e) { fail("angular", "*", e.message); }

// ─── nuxt-docs ───────────────────────────────────────────────────
console.log("Testing nuxt-docs...");
try {
  const nuxt = await import("../nuxt-docs.js");
  const idx = await nuxt.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("nuxt", "get-index") : fail("nuxt", "get-index", "empty");
  const p = await nuxt.invoke("search-docs", { query: "useFetch" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("nuxt", "search-docs") : fail("nuxt", "search-docs", "empty");
} catch (e) { fail("nuxt", "*", e.message); }

// ─── clerk-docs ──────────────────────────────────────────────────
console.log("Testing clerk-docs...");
try {
  const clerk = await import("../clerk-docs.js");
  const idx = await clerk.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("clerk", "get-index") : fail("clerk", "get-index", "empty");
  const p = await clerk.invoke("search-docs", { query: "authentication" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("clerk", "search-docs") : fail("clerk", "search-docs", "empty");
} catch (e) { fail("clerk", "*", e.message); }

// ─── convex-docs ─────────────────────────────────────────────────
console.log("Testing convex-docs...");
try {
  const convex = await import("../convex-docs.js");
  const idx = await convex.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("convex", "get-index") : fail("convex", "get-index", "empty");
  const p = await convex.invoke("search-docs", { query: "mutations" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("convex", "search-docs") : fail("convex", "search-docs", "empty");
} catch (e) { fail("convex", "*", e.message); }

// ─── turso-docs ──────────────────────────────────────────────────
console.log("Testing turso-docs...");
try {
  const turso = await import("../turso-docs.js");
  const idx = await turso.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("turso", "get-index") : fail("turso", "get-index", "empty");
  const p = await turso.invoke("search-docs", { query: "embedded replicas" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("turso", "search-docs") : fail("turso", "search-docs", "empty");
} catch (e) { fail("turso", "*", e.message); }

// ─── supabase-docs ───────────────────────────────────────────────
console.log("Testing supabase-docs...");
try {
  const supabase = await import("../supabase-docs.js");
  const idx = await supabase.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("supabase", "get-index") : fail("supabase", "get-index", "empty");
  const p = await supabase.invoke("search-docs", { query: "authentication" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("supabase", "search-docs") : fail("supabase", "search-docs", "empty");
} catch (e) { fail("supabase", "*", e.message); }

// ─── prisma-docs ─────────────────────────────────────────────────
console.log("Testing prisma-docs...");
try {
  const prisma = await import("../prisma-docs.js");
  const idx = await prisma.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("prisma", "get-index") : fail("prisma", "get-index", "empty");
  const p = await prisma.invoke("search-docs", { query: "migrations" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("prisma", "search-docs") : fail("prisma", "search-docs", "empty");
} catch (e) { fail("prisma", "*", e.message); }

// ─── turborepo-docs ──────────────────────────────────────────────
console.log("Testing turborepo-docs...");
try {
  const turborepo = await import("../turborepo-docs.js");
  const idx = await turborepo.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("turborepo", "get-index") : fail("turborepo", "get-index", "empty");
  const p = await turborepo.invoke("search-docs", { query: "caching" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("turborepo", "search-docs") : fail("turborepo", "search-docs", "empty");
} catch (e) { fail("turborepo", "*", e.message); }

// ─── elevenlabs-docs ─────────────────────────────────────────────
console.log("Testing elevenlabs-docs...");
try {
  const elevenlabs = await import("../elevenlabs-docs.js");
  const idx = await elevenlabs.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("elevenlabs", "get-index") : fail("elevenlabs", "get-index", "empty");
  const p = await elevenlabs.invoke("search-docs", { query: "text to speech" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("elevenlabs", "search-docs") : fail("elevenlabs", "search-docs", "empty");
} catch (e) { fail("elevenlabs", "*", e.message); }

// ─── trpc-docs ──────────────────────────────────────────────────────────────
console.log("Testing trpc-docs...");
try {
  const trpc = await import("../trpc-docs.js");
  const idx = await trpc.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("trpc", "get-index") : fail("trpc", "get-index", "empty");
  const p = await trpc.invoke("search-docs", { query: "router" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("trpc", "search-docs") : fail("trpc", "search-docs", "empty");
} catch (e) { fail("trpc", "*", e.message); }

// ─── solid-docs ─────────────────────────────────────────────────────────────
console.log("Testing solid-docs...");
try {
  const solid = await import("../solid-docs.js");
  const idx = await solid.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("solid", "get-index") : fail("solid", "get-index", "empty");
  const p = await solid.invoke("search-docs", { query: "signals" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("solid", "search-docs") : fail("solid", "search-docs", "empty");
} catch (e) { fail("solid", "*", e.message); }

// ─── elysia-docs ────────────────────────────────────────────────────────────
console.log("Testing elysia-docs...");
try {
  const elysia = await import("../elysia-docs.js");
  const idx = await elysia.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("elysia", "get-index") : fail("elysia", "get-index", "empty");
  const p = await elysia.invoke("search-docs", { query: "plugin" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("elysia", "search-docs") : fail("elysia", "search-docs", "empty");
} catch (e) { fail("elysia", "*", e.message); }

// ─── fastify-docs ───────────────────────────────────────────────────────────
console.log("Testing fastify-docs...");
try {
  const fastify = await import("../fastify-docs.js");
  const idx = await fastify.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("fastify", "get-index") : fail("fastify", "get-index", "empty");
  const p = await fastify.invoke("search-docs", { query: "hooks" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("fastify", "search-docs") : fail("fastify", "search-docs", "empty");
} catch (e) { fail("fastify", "*", e.message); }

// ─── effect-docs ────────────────────────────────────────────────────────────
console.log("Testing effect-docs...");
try {
  const effect = await import("../effect-docs.js");
  const idx = await effect.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("effect", "get-index") : fail("effect", "get-index", "empty");
  const p = await effect.invoke("search-docs", { query: "pipe" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("effect", "search-docs") : fail("effect", "search-docs", "empty");
} catch (e) { fail("effect", "*", e.message); }

// ─── xstate-docs ────────────────────────────────────────────────────────────
console.log("Testing xstate-docs...");
try {
  const xstate = await import("../xstate-docs.js");
  const idx = await xstate.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("xstate", "get-index") : fail("xstate", "get-index", "empty");
  const p = await xstate.invoke("search-docs", { query: "state machine" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("xstate", "search-docs") : fail("xstate", "search-docs", "empty");
} catch (e) { fail("xstate", "*", e.message); }

// ─── vite-docs ──────────────────────────────────────────────────────────────
console.log("Testing vite-docs...");
try {
  const vite = await import("../vite-docs.js");
  const idx = await vite.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("vite", "get-index") : fail("vite", "get-index", "empty");
  const p = await vite.invoke("search-docs", { query: "plugins" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("vite", "search-docs") : fail("vite", "search-docs", "empty");
} catch (e) { fail("vite", "*", e.message); }

// ─── vercel-docs ────────────────────────────────────────────────────────────
console.log("Testing vercel-docs...");
try {
  const vercel = await import("../vercel-docs.js");
  const idx = await vercel.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("vercel", "get-index") : fail("vercel", "get-index", "empty");
  const p = await vercel.invoke("search-docs", { query: "deployment" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("vercel", "search-docs") : fail("vercel", "search-docs", "empty");
} catch (e) { fail("vercel", "*", e.message); }

// ─── payload-docs ───────────────────────────────────────────────────────────
console.log("Testing payload-docs...");
try {
  const payload = await import("../payload-docs.js");
  const idx = await payload.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("payload", "get-index") : fail("payload", "get-index", "empty");
  const p = await payload.invoke("search-docs", { query: "collections" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("payload", "search-docs") : fail("payload", "search-docs", "empty");
} catch (e) { fail("payload", "*", e.message); }

// ─── resend-docs ────────────────────────────────────────────────────────────
console.log("Testing resend-docs...");
try {
  const resend = await import("../resend-docs.js");
  const idx = await resend.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("resend", "get-index") : fail("resend", "get-index", "empty");
  const p = await resend.invoke("search-docs", { query: "send email" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("resend", "search-docs") : fail("resend", "search-docs", "empty");
} catch (e) { fail("resend", "*", e.message); }

// ─── mantine-docs ───────────────────────────────────────────────────────────
console.log("Testing mantine-docs...");
try {
  const mantine = await import("../mantine-docs.js");
  const idx = await mantine.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("mantine", "get-index") : fail("mantine", "get-index", "empty");
  const p = await mantine.invoke("search-docs", { query: "button" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("mantine", "search-docs") : fail("mantine", "search-docs", "empty");
} catch (e) { fail("mantine", "*", e.message); }

// ─── langchain-docs ─────────────────────────────────────────────────────────
console.log("Testing langchain-docs...");
try {
  const langchain = await import("../langchain-docs.js");
  const idx = await langchain.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("langchain", "get-index") : fail("langchain", "get-index", "empty");
  const p = await langchain.invoke("search-docs", { query: "chain" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("langchain", "search-docs") : fail("langchain", "search-docs", "empty");
} catch (e) { fail("langchain", "*", e.message); }

// ─── nitro-docs ─────────────────────────────────────────────────────────────
console.log("Testing nitro-docs...");
try {
  const nitro = await import("../nitro-docs.js");
  const idx = await nitro.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("nitro", "get-index") : fail("nitro", "get-index", "empty");
  const p = await nitro.invoke("search-docs", { query: "routes" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("nitro", "search-docs") : fail("nitro", "search-docs", "empty");
} catch (e) { fail("nitro", "*", e.message); }

// ─── panda-css-docs ─────────────────────────────────────────────────────────
console.log("Testing panda-css-docs...");
try {
  const pandaCss = await import("../panda-css-docs.js");
  const idx = await pandaCss.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("panda-css", "get-index") : fail("panda-css", "get-index", "empty");
  const p = await pandaCss.invoke("search-docs", { query: "tokens" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("panda-css", "search-docs") : fail("panda-css", "search-docs", "empty");
} catch (e) { fail("panda-css", "*", e.message); }

// ─── expo-docs ──────────────────────────────────────────────────────────────
console.log("Testing expo-docs...");
try {
  const expo = await import("../expo-docs.js");
  const idx = await expo.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("expo", "get-index") : fail("expo", "get-index", "empty");
  const p = await expo.invoke("search-docs", { query: "navigation" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("expo", "search-docs") : fail("expo", "search-docs", "empty");
} catch (e) { fail("expo", "*", e.message); }

// ─── zustand-docs ───────────────────────────────────────────────────────────
console.log("Testing zustand-docs...");
try {
  const zustand = await import("../zustand-docs.js");
  const idx = await zustand.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("zustand", "get-index") : fail("zustand", "get-index", "empty");
  const p = await zustand.invoke("search-docs", { query: "store" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("zustand", "search-docs") : fail("zustand", "search-docs", "empty");
} catch (e) { fail("zustand", "*", e.message); }

// ─── storybook-docs ─────────────────────────────────────────────────────────
console.log("Testing storybook-docs...");
try {
  const storybook = await import("../storybook-docs.js");
  const idx = await storybook.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("storybook", "get-index") : fail("storybook", "get-index", "empty");
  const p = await storybook.invoke("search-docs", { query: "addon" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("storybook", "search-docs") : fail("storybook", "search-docs", "empty");
} catch (e) { fail("storybook", "*", e.message); }

// ─── tauri-docs ─────────────────────────────────────────────────────────────
console.log("Testing tauri-docs...");
try {
  const tauri = await import("../tauri-docs.js");
  const idx = await tauri.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("tauri", "get-index") : fail("tauri", "get-index", "empty");
  const p = await tauri.invoke("search-docs", { query: "window" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("tauri", "search-docs") : fail("tauri", "search-docs", "empty");
} catch (e) { fail("tauri", "*", e.message); }

// ─── rspack-docs ────────────────────────────────────────────────────────────
console.log("Testing rspack-docs...");
try {
  const rspack = await import("../rspack-docs.js");
  const idx = await rspack.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("rspack", "get-index") : fail("rspack", "get-index", "empty");
  const p = await rspack.invoke("search-docs", { query: "loader" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("rspack", "search-docs") : fail("rspack", "search-docs", "empty");
} catch (e) { fail("rspack", "*", e.message); }

// ─── wxt-docs ───────────────────────────────────────────────────────────────
console.log("Testing wxt-docs...");
try {
  const wxt = await import("../wxt-docs.js");
  const idx = await wxt.invoke("get-index");
  (idx.index ?? idx).toString().length > 10 ? ok("wxt", "get-index") : fail("wxt", "get-index", "empty");
  const p = await wxt.invoke("search-docs", { query: "manifest" });
  (p.result ?? p.found ?? p).toString().length > 0 ? ok("wxt", "search-docs") : fail("wxt", "search-docs", "empty");
} catch (e) { fail("wxt", "*", e.message); }

// ─── Summary ─────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════");
console.log("RESULTS:");
for (const r of results) console.log(r);
const passed = results.filter(r => r.includes("✓")).length;
const failed = results.filter(r => r.includes("✗")).length;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);