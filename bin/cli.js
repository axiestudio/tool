#!/usr/bin/env node

// ─── Route subcommands ────────────────────────────────────────────────────────

const cmd = process.argv[2];

if (cmd === "init" || cmd === "setup") {
  await runInit();
  process.exit(0);
} else if (cmd === "--help" || cmd === "-h") {
  printHelp();
  process.exit(0);
} else if (cmd) {
  // Unknown command
  printHelp();
  process.exit(1);
} else {
  // No args — try explorer if deps available + TTY, otherwise init wizard
  let hasExplorerDeps = false;
  try {
    await import("react");
    await import("ink");
    hasExplorerDeps = true;
  } catch {}

  if (hasExplorerDeps && process.stdin.isTTY) {
    await runExplorer();
  } else {
    await runInit();
    process.exit(0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT WIZARD — zero dependencies, raw stdin + ANSI
// ═══════════════════════════════════════════════════════════════════════════════

async function runInit() {
  const { writeFileSync, mkdirSync, existsSync, readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { execSync } = await import("node:child_process");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const skillSource = join(__dirname, "..", "SKILL.md");

  // ── ANSI helpers ──────────────────────────────────────────────────────────

  const ESC = "\x1b[";
  const CLEAR_LINE = ESC + "2K";
  const HIDE_CURSOR = ESC + "?25l";
  const SHOW_CURSOR = ESC + "?25h";
  const up = (n) => (n > 0 ? ESC + n + "A" : "");
  const bold = (s) => `\x1b[1m${s}\x1b[22m`;
  const dim = (s) => `\x1b[2m${s}\x1b[22m`;
  const cyan = (s) => `\x1b[36m${s}\x1b[39m`;
  const green = (s) => `\x1b[32m${s}\x1b[39m`;
  const yellow = (s) => `\x1b[33m${s}\x1b[39m`;
  const magenta = (s) => `\x1b[35m${s}\x1b[39m`;

  // ── Multi-select prompt ───────────────────────────────────────────────────

  function multiSelect(title, items, allOnByDefault = true) {
    // Non-interactive fallback (piped stdin / CI)
    if (!process.stdin.isTTY) {
      console.log("");
      console.log(bold(cyan("  " + title)));
      console.log(dim("  (non-interactive — using defaults)"));
      return items.filter((item) => item.checked ?? allOnByDefault);
    }

    return new Promise((resolve) => {
      const checked = items.map((item) => item.checked ?? allOnByDefault);
      let cursor = 0;
      let lineCount = 0;

      function render() {
        // Move cursor up to overwrite previous render
        if (lineCount > 0) process.stdout.write(up(lineCount));

        const lines = [];
        lines.push("");
        lines.push(bold(cyan("  " + title)));
        lines.push("");
        for (let i = 0; i < items.length; i++) {
          const mark = checked[i] ? green("  ✔ ") : "  ○ ";
          const pointer = i === cursor ? cyan("❯") : " ";
          const label = i === cursor ? bold(items[i].label) : items[i].label;
          const desc = items[i].description ? dim("  " + items[i].description) : "";
          lines.push(pointer + mark + label + desc);
        }
        lines.push("");
        lines.push(dim("  ↑↓ navigate · Space toggle · a all · n none · Enter confirm"));

        const output = lines.map((l) => CLEAR_LINE + l).join("\n");
        process.stdout.write(output);
        lineCount = lines.length - 1;
      }

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdout.write(HIDE_CURSOR);

      render();

      function onData(key) {
        if (key === "\x03") {
          // Ctrl+C
          process.stdout.write(SHOW_CURSOR + "\n");
          process.exit(0);
        }
        if (key === "\r" || key === "\n") {
          // Enter
          cleanup();
          const selected = items.filter((_, i) => checked[i]);
          resolve(selected);
          return;
        }
        if (key === " ") {
          checked[cursor] = !checked[cursor];
        }
        if (key === "a") {
          checked.fill(true);
        }
        if (key === "n") {
          checked.fill(false);
        }
        // Up arrow: \x1b[A
        if (key === "\x1b[A" || key === "k") {
          cursor = Math.max(0, cursor - 1);
        }
        // Down arrow: \x1b[B
        if (key === "\x1b[B" || key === "j") {
          cursor = Math.min(items.length - 1, cursor + 1);
        }
        render();
      }

      function cleanup() {
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write(SHOW_CURSOR + "\n");
      }

      process.stdin.on("data", onData);
    });
  }

  // ── Detect package manager ────────────────────────────────────────────────

  function detectPM() {
    const ua = process.env.npm_config_user_agent || "";
    if (ua.startsWith("bun")) return "bun";
    if (ua.startsWith("pnpm")) return "pnpm";
    if (ua.startsWith("yarn")) return "yarn";
    // Check lockfiles
    if (existsSync("bun.lockb") || existsSync("bun.lock")) return "bun";
    if (existsSync("pnpm-lock.yaml")) return "pnpm";
    if (existsSync("yarn.lock")) return "yarn";
    return "npm";
  }

  // ── Run wizard ────────────────────────────────────────────────────────────

  console.log("");
  console.log(bold(magenta("  @axiestudio/tool")) + "  setup wizard");
  console.log(dim("  Zero-dependency fetch wrappers that replace MCP servers"));

  // Step 1: Select tools
  const toolChoices = [
    { id: "context7",         label: "context7",         description: "Live docs for any library (npm, GitHub, PyPI)" },
    { id: "cloudflare-docs",  label: "cloudflare-docs",  description: "Cloudflare developer docs" },
    { id: "ar-android-docs",  label: "ar-android-docs",  description: "Google ARCore and Scene Viewer docs" },
    { id: "ar-ios-docs",      label: "ar-ios-docs",      description: "Apple ARKit docs" },
    { id: "npm",              label: "npm",              description: "npm registry — search, README, versions" },
    { id: "github",           label: "github",           description: "GitHub public API — files, code search" },
    { id: "astro-docs",       label: "astro-docs",       description: "Astro framework docs" },
    { id: "drizzle-docs",     label: "drizzle-docs",     description: "Drizzle ORM docs" },
    { id: "better-auth-docs", label: "better-auth-docs", description: "Better Auth docs" },
    { id: "livekit-docs",     label: "livekit-docs",     description: "LiveKit voice/rooms docs" },
    { id: "hono-docs",        label: "hono-docs",        description: "Hono web framework docs" },
    { id: "react-docs",       label: "react-docs",       description: "React docs" },
    { id: "nextjs-docs",      label: "nextjs-docs",      description: "Next.js docs" },
    { id: "zod-docs",         label: "zod-docs",         description: "Zod schema validation docs" },
    { id: "bun-docs",         label: "bun-docs",         description: "Bun runtime docs" },
    { id: "stripe-docs",      label: "stripe-docs",      description: "Stripe API docs" },
    { id: "tanstack-docs",    label: "tanstack-docs",    description: "TanStack (Query, Router, Table) docs" },
    { id: "shadcn-docs",      label: "shadcn-docs",      description: "shadcn/ui component docs" },
    { id: "neon-docs",        label: "neon-docs",        description: "Neon serverless Postgres docs" },
    { id: "deno-docs",        label: "deno-docs",        description: "Deno runtime docs" },
    { id: "vitest-docs",      label: "vitest-docs",      description: "Vitest testing framework docs" },
    { id: "svelte-docs",      label: "svelte-docs",      description: "Svelte framework docs" },
    { id: "vue-docs",         label: "vue-docs",         description: "Vue.js docs" },
    { id: "angular-docs",     label: "angular-docs",     description: "Angular framework docs" },
    { id: "nuxt-docs",        label: "nuxt-docs",        description: "Nuxt framework docs" },
    { id: "clerk-docs",       label: "clerk-docs",       description: "Clerk authentication docs" },
    { id: "convex-docs",      label: "convex-docs",      description: "Convex backend platform docs" },
    { id: "turso-docs",       label: "turso-docs",       description: "Turso edge database docs" },
    { id: "supabase-docs",    label: "supabase-docs",    description: "Supabase platform docs" },
    { id: "prisma-docs",      label: "prisma-docs",      description: "Prisma ORM docs" },
    { id: "turborepo-docs",   label: "turborepo-docs",   description: "Turborepo monorepo tool docs" },
    { id: "elevenlabs-docs",  label: "elevenlabs-docs",  description: "ElevenLabs voice AI docs" },
    { id: "trpc-docs",        label: "trpc-docs",        description: "tRPC end-to-end typesafe API docs" },
    { id: "solid-docs",       label: "solid-docs",       description: "SolidJS reactive framework docs" },
    { id: "elysia-docs",      label: "elysia-docs",      description: "Elysia Bun web framework docs" },
    { id: "fastify-docs",     label: "fastify-docs",     description: "Fastify Node.js framework docs" },
    { id: "effect-docs",      label: "effect-docs",      description: "Effect TypeScript library docs" },
    { id: "xstate-docs",      label: "xstate-docs",      description: "XState state machines docs" },
    { id: "vite-docs",        label: "vite-docs",        description: "Vite build tool docs" },
    { id: "vercel-docs",      label: "vercel-docs",      description: "Vercel platform docs" },
    { id: "payload-docs",     label: "payload-docs",     description: "Payload CMS docs" },
    { id: "resend-docs",      label: "resend-docs",      description: "Resend email API docs" },
    { id: "mantine-docs",     label: "mantine-docs",     description: "Mantine UI component docs" },
    { id: "langchain-docs",   label: "langchain-docs",   description: "LangChain JS AI framework docs" },
    { id: "nitro-docs",       label: "nitro-docs",       description: "Nitro server toolkit docs" },
    { id: "panda-css-docs",   label: "panda-css-docs",   description: "Panda CSS-in-JS framework docs" },
    { id: "expo-docs",        label: "expo-docs",        description: "Expo React Native framework docs" },
    { id: "zustand-docs",     label: "zustand-docs",     description: "Zustand state management docs" },
    { id: "storybook-docs",   label: "storybook-docs",   description: "Storybook UI workshop docs" },
    { id: "tauri-docs",       label: "tauri-docs",       description: "Tauri desktop app framework docs" },
    { id: "rspack-docs",      label: "rspack-docs",      description: "Rspack Rust bundler docs" },
    { id: "wxt-docs",         label: "wxt-docs",         description: "WXT web extension framework docs" },
  ];

  const selectedTools = await multiSelect("Which tools do you want to use?", toolChoices);

  // Step 2: Optional features
  const featureChoices = [
    { id: "browser",  label: "Browser automation",  description: "requires puppeteer-core — scrape, screenshot, fill forms via CDP", checked: false },
    { id: "skill",    label: "AI Agent skill file",  description: "copy SKILL.md for Copilot/Claude/Cursor (no deps)", checked: true },
    { id: "cli",      label: "Interactive CLI",      description: "requires ink + react — terminal UI tool explorer", checked: false },
  ];

  const selectedFeatures = await multiSelect("Optional features", featureChoices, false);
  const featureIds = new Set(selectedFeatures.map((f) => f.id));

  // Step 3: Summary
  console.log("");
  console.log(bold(cyan("  Summary")));
  console.log("");
  console.log(green("  Tools: ") + (selectedTools.length > 0 ? selectedTools.map((t) => t.id).join(", ") : dim("none")));
  console.log(green("  Features: ") + (selectedFeatures.length > 0 ? selectedFeatures.map((f) => f.id).join(", ") : dim("none")));
  console.log("");

  // Step 4: Install optional dependencies
  // NOTE: The 52 core tools have ZERO dependencies.
  // These are ONLY needed for the optional features the user selected above.
  const depsToInstall = [];
  const depReasons = [];
  if (featureIds.has("browser")) {
    depsToInstall.push("puppeteer-core");
    depReasons.push("  • " + bold("puppeteer-core") + " — required for " + cyan("Browser automation") + " (CDP connection to Chrome)");
  }
  if (featureIds.has("cli")) {
    depsToInstall.push("ink", "react");
    depReasons.push("  • " + bold("ink") + " + " + bold("react") + " — required for " + cyan("Interactive CLI") + " (terminal UI explorer)");
  }

  const pm = detectPM();
  if (depsToInstall.length > 0) {
    console.log(yellow("  ⓘ  The 52 core tools require NO dependencies."));
    console.log(yellow("     The following are only needed for your selected optional features:"));
    console.log("");
    for (const reason of depReasons) console.log(reason);
    console.log("");

    const installCmd =
      pm === "bun" ? `bun add ${depsToInstall.join(" ")}` :
      pm === "pnpm" ? `pnpm add ${depsToInstall.join(" ")}` :
      pm === "yarn" ? `yarn add ${depsToInstall.join(" ")}` :
      `npm install ${depsToInstall.join(" ")}`;

    console.log(dim("  $ " + installCmd));
    try {
      execSync(installCmd, { stdio: "inherit" });
      console.log(green("  ✔ Optional dependencies installed"));
    } catch {
      console.log(yellow("  ⚠ Install failed — run manually: " + installCmd));
    }
    console.log("");
  }

  // Step 5: Copy SKILL.md
  if (featureIds.has("skill") && existsSync(skillSource)) {
    // Detect best location
    const destinations = [
      ".agents/skills/@axiestudio/tool/SKILL.md",
      ".cursor/rules/@axiestudio/tool.md",
      ".github/copilot-instructions.md",
    ];

    // Default to .agents/skills/ which is the most universal
    const dest = destinations[0];
    const destPath = join(process.cwd(), dest);

    if (existsSync(destPath)) {
      console.log(dim("  SKILL.md already exists at " + dest + ", skipping"));
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, readFileSync(skillSource, "utf8"));
      console.log(green("  ✔ ") + "SKILL.md copied to " + cyan(dest));
    }
    console.log("");
  }

  // Step 6: Usage hints
  console.log(bold("  Quick start:"));
  console.log("");

  if (selectedTools.some((t) => t.id === "context7")) {
    console.log(dim("  import { invoke } from '@axiestudio/tool/context7';"));
    console.log(dim('  const id   = await invoke("resolve-library-id", { libraryName: "hono" });'));
    console.log(dim('  const docs = await invoke("get-library-docs", { libraryId: id, topic: "middleware" });'));
    console.log("");
  } else if (selectedTools.length > 0) {
    const first = selectedTools[0];
    console.log(dim(`  import { invoke } from '@axiestudio/tool/${first.id}';`));
    console.log(dim(`  const result = await invoke("${first.id === "npm" ? "search" : "search-docs"}", { query: "..." });`));
    console.log("");
  }

  if (featureIds.has("cli")) {
    console.log(dim("  Run the interactive explorer:"));
    console.log(dim("  $ npx @axiestudio/tool"));
    console.log("");
  }

  console.log(green("  Done!") + " " + dim("Docs: https://github.com/axiestudio/tool"));
  console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELP
// ═══════════════════════════════════════════════════════════════════════════════

function printHelp() {
  console.log(`
  ${"\x1b[1m\x1b[35m"}axie-tool${"\x1b[0m"}  Zero-dependency AI agent fetch wrappers

  ${"\x1b[1m"}Usage:${"\x1b[0m"}
    axie-tool              Setup wizard (or interactive explorer if ink installed)
    axie-tool init         Setup wizard — pick tools, install deps, copy SKILL.md
    axie-tool --help       Show this help

  ${"\x1b[1m"}Import:${"\x1b[0m"}
    import { invoke } from '@axiestudio/tool/context7';
    import { invoke } from '@axiestudio/tool/npm';
    import { invoke } from '@axiestudio/tool/github';

  ${"\x1b[2m"}Docs: https://github.com/axiestudio/tool${"\x1b[0m"}
`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTERACTIVE TOOL EXPLORER (ink + react)
// ═══════════════════════════════════════════════════════════════════════════════

async function runExplorer() {

let React, useState, useCallback, render, Box, Text, useInput, useApp, Newline;
try {
  React = await import("react");
  useState = React.useState;
  useCallback = React.useCallback;
  const ink = await import("ink");
  render = ink.render;
  Box = ink.Box;
  Text = ink.Text;
  useInput = ink.useInput;
  useApp = ink.useApp;
  Newline = ink.Newline;
} catch {
  console.error(
    "The interactive CLI requires ink and react.\n\n" +
      "Install them:\n" +
      "  npm install ink react\n" +
      "  bun add ink react\n\n" +
      "Or use the tools directly as ES modules:\n" +
      "  import { invoke } from '@axiestudio/tool/npm';\n\n" +
      "Or run the setup wizard:\n" +
      "  npx @axiestudio/tool init\n"
  );
  process.exit(1);
}

const { CUSTOM_PRESET_VALUE, getParamPresets, getToolTemplates } = await import("./cli-presets.js");

// ─── Tool registry ────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: "context7",
    label: "context7",
    description: "Live library docs for any npm package",
    module: "../context7.js",
    envHint: "CONTEXT7_API_KEY (optional)",
    commands: [
      {
        name: "resolve-library-id",
        description: "Resolve a library name to a Context7 ID",
        params: [
          { name: "libraryName", hint: "e.g. react, drizzle-orm, hono" },
          { name: "query", hint: "(optional) extra context", optional: true },
        ],
      },
      {
        name: "get-library-docs",
        description: "Fetch docs for a library ID",
        params: [
          { name: "libraryId", hint: "e.g. /facebook/react" },
          { name: "topic", hint: "(optional) e.g. hooks, routing", optional: true },
          { name: "tokens", hint: "(optional) max tokens, default 5000", optional: true },
        ],
      },
    ],
  },
  {
    id: "cloudflare-docs",
    label: "cloudflare-docs",
    description: "Cloudflare developer docs (Workers, KV, D1, R2, AI…)",
    module: "../cloudflare-docs.js",
    commands: [
      { name: "list-products", description: "List available CF products", params: [] },
      {
        name: "get-product-index",
        description: "Get the index for a CF product",
        params: [{ name: "product", hint: "e.g. workers, kv, d1" }],
      },
      {
        name: "get-page",
        description: "Fetch a docs page by path",
        params: [{ name: "path", hint: "e.g. /workers/runtime-apis/kv/" }],
      },
      {
        name: "search-docs",
        description: "Search within a CF product",
        params: [
          { name: "product", hint: "e.g. workers, d1, r2" },
          { name: "query", hint: "search keywords" },
        ],
      },
    ],
  },
  {
    id: "ar-android-docs",
    label: "ar-android-docs",
    description: "Google ARCore and Scene Viewer docs",
    module: "../ar-android-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      {
        name: "get-page",
        description: "Fetch a docs page",
        params: [{ name: "path", hint: "e.g. /ar/develop/scene-viewer" }],
      },
      {
        name: "search-docs",
        description: "Search the docs",
        params: [{ name: "query", hint: "e.g. ar_only intent" }],
      },
    ],
  },
  {
    id: "ar-ios-docs",
    label: "ar-ios-docs",
    description: "Apple ARKit docs",
    module: "../ar-ios-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      {
        name: "get-page",
        description: "Fetch a docs page",
        params: [{ name: "path", hint: "e.g. /documentation/arkit/arsession" }],
      },
      {
        name: "search-docs",
        description: "Search the docs",
        params: [{ name: "query", hint: "e.g. ARSession lifecycle" }],
      },
    ],
  },
  {
    id: "npm",
    label: "npm",
    description: "npm registry — search, README, metadata, versions",
    module: "../npm.js",
    commands: [
      {
        name: "search",
        description: "Search npm packages",
        params: [{ name: "query", hint: "e.g. hono middleware" }],
      },
      {
        name: "get-readme",
        description: "Fetch a package README",
        params: [
          { name: "packageName", hint: "e.g. drizzle-orm" },
          { name: "version", hint: "(optional) e.g. 0.30.0", optional: true },
        ],
      },
      {
        name: "get-package-info",
        description: "Fetch package metadata",
        params: [{ name: "packageName", hint: "e.g. better-auth" }],
      },
      {
        name: "get-versions",
        description: "List all published versions",
        params: [{ name: "packageName", hint: "e.g. react" }],
      },
    ],
  },
  {
    id: "github",
    label: "github",
    description: "GitHub public API — files, dirs, code search, releases",
    module: "../github.js",
    commands: [
      {
        name: "get-file",
        description: "Read a file from a public repo",
        params: [
          { name: "owner", hint: "e.g. honojs" },
          { name: "repo", hint: "e.g. hono" },
          { name: "path", hint: "e.g. src/index.ts" },
          { name: "ref", hint: "(optional) branch or sha", optional: true },
        ],
      },
      {
        name: "list-dir",
        description: "List a directory in a public repo",
        params: [
          { name: "owner", hint: "e.g. cloudflare" },
          { name: "repo", hint: "e.g. workers-sdk" },
          { name: "path", hint: "(optional) subpath", optional: true },
        ],
      },
      {
        name: "search-code",
        description: "Search code across GitHub",
        params: [{ name: "query", hint: "e.g. DurableObject alarm in:file language:ts" }],
      },
      {
        name: "get-releases",
        description: "Get releases for a repo",
        params: [
          { name: "owner", hint: "e.g. cloudflare" },
          { name: "repo", hint: "e.g. workers-sdk" },
        ],
      },
      {
        name: "get-repo-info",
        description: "Get repo metadata",
        params: [
          { name: "owner", hint: "e.g. drizzle-team" },
          { name: "repo", hint: "e.g. drizzle-orm" },
        ],
      },
    ],
  },
  {
    id: "astro-docs",
    label: "astro-docs",
    description: "Astro framework docs",
    module: "../astro-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      {
        name: "get-page",
        description: "Fetch a docs page",
        params: [{ name: "path", hint: "e.g. /en/guides/middleware/" }],
      },
      {
        name: "search-docs",
        description: "Search the docs",
        params: [{ name: "query", hint: "e.g. server islands" }],
      },
    ],
  },
  {
    id: "drizzle-docs",
    label: "drizzle-docs",
    description: "Drizzle ORM docs",
    module: "../drizzle-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      {
        name: "get-page",
        description: "Fetch a docs page",
        params: [{ name: "path", hint: "e.g. /docs/relations" }],
      },
      {
        name: "search-docs",
        description: "Search the docs",
        params: [{ name: "query", hint: "e.g. row level security" }],
      },
    ],
  },
  {
    id: "better-auth-docs",
    label: "better-auth-docs",
    description: "Better Auth docs",
    module: "../better-auth-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      {
        name: "get-page",
        description: "Fetch a docs page",
        params: [{ name: "path", hint: "e.g. /docs/plugins/organization" }],
      },
      {
        name: "search-docs",
        description: "Search the docs",
        params: [{ name: "query", hint: "e.g. session enrichment" }],
      },
    ],
  },
  {
    id: "livekit-docs",
    label: "livekit-docs",
    description: "LiveKit voice agent / rooms docs",
    module: "../livekit-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      {
        name: "get-page",
        description: "Fetch a docs page",
        params: [{ name: "path", hint: "e.g. /agents/voice-pipeline-agent" }],
      },
      {
        name: "search-docs",
        description: "Search the docs",
        params: [{ name: "query", hint: "e.g. token generation" }],
      },
    ],
  },
  {
    id: "hono-docs",
    label: "hono-docs",
    description: "Hono web framework docs",
    module: "../hono-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/getting-started" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. middleware" }] },
    ],
  },
  {
    id: "react-docs",
    label: "react-docs",
    description: "React docs",
    module: "../react-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /learn" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. hooks" }] },
    ],
  },
  {
    id: "nextjs-docs",
    label: "nextjs-docs",
    description: "Next.js docs",
    module: "../nextjs-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/app/building-your-application" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. server components" }] },
    ],
  },
  {
    id: "zod-docs",
    label: "zod-docs",
    description: "Zod schema validation docs",
    module: "../zod-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /library/schema-methods" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. transform" }] },
    ],
  },
  {
    id: "bun-docs",
    label: "bun-docs",
    description: "Bun runtime docs",
    module: "../bun-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/runtime/bunfig" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. test runner" }] },
    ],
  },
  {
    id: "stripe-docs",
    label: "stripe-docs",
    description: "Stripe API docs",
    module: "../stripe-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/payments" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. subscriptions" }] },
    ],
  },
  {
    id: "tanstack-docs",
    label: "tanstack-docs",
    description: "TanStack (Query, Router, Table) docs",
    module: "../tanstack-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /query/latest/docs/overview" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. query keys" }] },
    ],
  },
  {
    id: "shadcn-docs",
    label: "shadcn-docs",
    description: "shadcn/ui component docs",
    module: "../shadcn-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/components/button" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. dialog" }] },
    ],
  },
  {
    id: "neon-docs",
    label: "neon-docs",
    description: "Neon serverless Postgres docs",
    module: "../neon-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. branching" }] },
    ],
  },
  {
    id: "deno-docs",
    label: "deno-docs",
    description: "Deno runtime docs",
    module: "../deno-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /runtime/" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. permissions" }] },
    ],
  },
  {
    id: "vitest-docs",
    label: "vitest-docs",
    description: "Vitest testing framework docs",
    module: "../vitest-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. mocking" }] },
    ],
  },
  {
    id: "svelte-docs",
    label: "svelte-docs",
    description: "Svelte framework docs",
    module: "../svelte-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/svelte/overview" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. reactivity" }] },
    ],
  },
  {
    id: "vue-docs",
    label: "vue-docs",
    description: "Vue.js docs",
    module: "../vue-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. composition api" }] },
    ],
  },
  {
    id: "angular-docs",
    label: "angular-docs",
    description: "Angular framework docs",
    module: "../angular-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/components" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. signals" }] },
    ],
  },
  {
    id: "nuxt-docs",
    label: "nuxt-docs",
    description: "Nuxt framework docs",
    module: "../nuxt-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/getting-started/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. auto imports" }] },
    ],
  },
  {
    id: "clerk-docs",
    label: "clerk-docs",
    description: "Clerk authentication docs",
    module: "../clerk-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/quickstarts/nextjs" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. organizations" }] },
    ],
  },
  {
    id: "convex-docs",
    label: "convex-docs",
    description: "Convex backend platform docs",
    module: "../convex-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/functions" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. mutations" }] },
    ],
  },
  {
    id: "turso-docs",
    label: "turso-docs",
    description: "Turso edge database docs",
    module: "../turso-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. embedded replicas" }] },
    ],
  },
  {
    id: "supabase-docs",
    label: "supabase-docs",
    description: "Supabase platform docs",
    module: "../supabase-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/guides/auth" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. row level security" }] },
    ],
  },
  {
    id: "prisma-docs",
    label: "prisma-docs",
    description: "Prisma ORM docs",
    module: "../prisma-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/getting-started" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. relations" }] },
    ],
  },
  {
    id: "turborepo-docs",
    label: "turborepo-docs",
    description: "Turborepo monorepo tool docs",
    module: "../turborepo-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/getting-started" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. caching" }] },
    ],
  },
  {
    id: "elevenlabs-docs",
    label: "elevenlabs-docs",
    description: "ElevenLabs voice AI docs",
    module: "../elevenlabs-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /overview/intro" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. text to speech" }] },
    ],
  },
  {
    id: "trpc-docs",
    label: "trpc-docs",
    description: "tRPC end-to-end typesafe API docs",
    module: "../trpc-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/client/react" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. router" }] },
    ],
  },
  {
    id: "solid-docs",
    label: "solid-docs",
    description: "SolidJS reactive framework docs",
    module: "../solid-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /concepts/signals" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. signals" }] },
    ],
  },
  {
    id: "elysia-docs",
    label: "elysia-docs",
    description: "Elysia Bun web framework docs",
    module: "../elysia-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /quick-start" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. plugin" }] },
    ],
  },
  {
    id: "fastify-docs",
    label: "fastify-docs",
    description: "Fastify Node.js framework docs",
    module: "../fastify-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/latest/Reference/Hooks" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. hooks" }] },
    ],
  },
  {
    id: "effect-docs",
    label: "effect-docs",
    description: "Effect TypeScript library docs",
    module: "../effect-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. pipe" }] },
    ],
  },
  {
    id: "xstate-docs",
    label: "xstate-docs",
    description: "XState state machines docs",
    module: "../xstate-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/quick-start" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. state machine" }] },
    ],
  },
  {
    id: "vite-docs",
    label: "vite-docs",
    description: "Vite build tool docs",
    module: "../vite-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/features" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. plugins" }] },
    ],
  },
  {
    id: "vercel-docs",
    label: "vercel-docs",
    description: "Vercel platform docs",
    module: "../vercel-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/deployments/overview" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. deployment" }] },
    ],
  },
  {
    id: "payload-docs",
    label: "payload-docs",
    description: "Payload CMS docs",
    module: "../payload-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/configuration/collections" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. collections" }] },
    ],
  },
  {
    id: "resend-docs",
    label: "resend-docs",
    description: "Resend email API docs",
    module: "../resend-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/send-email" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. send email" }] },
    ],
  },
  {
    id: "mantine-docs",
    label: "mantine-docs",
    description: "Mantine UI component docs",
    module: "../mantine-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /core/button/" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. button" }] },
    ],
  },
  {
    id: "langchain-docs",
    label: "langchain-docs",
    description: "LangChain JS AI framework docs",
    module: "../langchain-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. chain" }] },
    ],
  },
  {
    id: "nitro-docs",
    label: "nitro-docs",
    description: "Nitro server toolkit docs",
    module: "../nitro-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/routing" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. routes" }] },
    ],
  },
  {
    id: "panda-css-docs",
    label: "panda-css-docs",
    description: "Panda CSS-in-JS framework docs",
    module: "../panda-css-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/theming/tokens" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. tokens" }] },
    ],
  },
  {
    id: "expo-docs",
    label: "expo-docs",
    description: "Expo React Native framework docs",
    module: "../expo-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /router/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. navigation" }] },
    ],
  },
  {
    id: "zustand-docs",
    label: "zustand-docs",
    description: "Zustand state management docs",
    module: "../zustand-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /learn/getting-started/introduction" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. store" }] },
    ],
  },
  {
    id: "storybook-docs",
    label: "storybook-docs",
    description: "Storybook UI workshop docs",
    module: "../storybook-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /docs/writing-stories" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. addon" }] },
    ],
  },
  {
    id: "tauri-docs",
    label: "tauri-docs",
    description: "Tauri desktop app framework docs",
    module: "../tauri-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /start/" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. window" }] },
    ],
  },
  {
    id: "rspack-docs",
    label: "rspack-docs",
    description: "Rspack Rust bundler docs",
    module: "../rspack-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/features/loader" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. loader" }] },
    ],
  },
  {
    id: "wxt-docs",
    label: "wxt-docs",
    description: "WXT web extension framework docs",
    module: "../wxt-docs.js",
    commands: [
      { name: "get-index", description: "Get the docs index", params: [] },
      { name: "get-page", description: "Fetch a docs page", params: [{ name: "path", hint: "e.g. /guide/essentials/entrypoints" }] },
      { name: "search-docs", description: "Search the docs", params: [{ name: "query", hint: "e.g. manifest" }] },
    ],
  },
];

// ─── Shared text input hook ───────────────────────────────────────────────────

function useTextInput(initial = "") {
  const [value, setValue] = useState(initial);

  const handleKey = useCallback(
    (input, key) => {
      if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
      } else if (!key.ctrl && !key.meta && !key.escape && !key.return && input) {
        setValue((v) => v + input);
      }
    },
    []
  );

  return [value, setValue, handleKey];
}

// ─── Menu component ───────────────────────────────────────────────────────────

const h = React.createElement;

function Menu({ items, selectedIndex, label, footerText = "↑↓ navigate · Enter select · q quit" }) {
  return h(Box, { flexDirection: "column" },
    h(Text, { bold: true, color: "cyan" }, label),
    ...items.map((item, i) =>
      h(Box, { key: i },
        h(Text, { color: i === selectedIndex ? "green" : undefined },
          i === selectedIndex ? "❯ " : "  ",
          h(Text, { bold: i === selectedIndex }, item.label ?? item.name),
          item.description ? h(Text, { color: "gray" }, "  " + item.description) : null,
        ),
      ),
    ),
    h(Newline),
    h(Text, { color: "gray", dimColor: true }, footerText),
  );
}

// ─── TextInput component ──────────────────────────────────────────────────────

function TextPrompt({ label, hint, value, active }) {
  return h(Box, null,
    h(Text, { color: active ? "cyan" : "gray" }, label + ": "),
    h(Text, null, value),
    active ? h(Text, { color: "cyan" }, "█") : null,
    hint && !value ? h(Text, { color: "gray" }, "  " + hint) : null,
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({ result, error }) {
  const lines = (error ?? result ?? "").split("\n").slice(0, 60);
  return h(Box, { flexDirection: "column" },
    h(Text, { bold: true, color: error ? "red" : "green" }, error ? "Error" : "Result"),
    h(Newline),
    ...lines.map((line, i) => h(Text, { key: i }, line)),
    h(Newline),
    h(Text, { color: "gray", dimColor: true }, "Press any key to go back"),
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const { exit } = useApp();

  // Screen: "tool" | "template" | "cmd" | "preset" | "params" | "running" | "result"
  const [screen, setScreen] = useState("tool");
  const [toolIdx, setToolIdx] = useState(0);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [paramIdx, setParamIdx] = useState(0);
  const [presetIdx, setPresetIdx] = useState(0);
  const [paramValues, setParamValues] = useState({});
  const [currentInput, setCurrentInput, handleCurrentKey] = useTextInput("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [resultBackScreen, setResultBackScreen] = useState("cmd");

  const selectedTool = TOOLS[toolIdx];
  const selectedCmd = selectedTool?.commands[cmdIdx];
  const currentTemplates = selectedTool ? getToolTemplates(selectedTool.id) : [];
  const templateMenuItems = currentTemplates.length > 0
    ? [...currentTemplates, {
      label: "Manual command picker",
      description: "Choose the raw command and parameters yourself",
      manual: true,
    }]
    : [];
  const currentParam = selectedCmd?.params[paramIdx];
  const currentPresets = currentParam
    ? getParamPresets(selectedTool.id, selectedCmd.name, currentParam.name)
    : [];

  function resetParamFlow() {
    setParamIdx(0);
    setPresetIdx(0);
    setParamValues({});
    setCurrentInput("");
  }

  function openCommandMenu() {
    resetParamFlow();
    setCmdIdx(0);
    setScreen("cmd");
  }

  function getPresetsForParam(index) {
    const param = selectedCmd?.params[index];
    if (!selectedTool || !selectedCmd || !param) return [];
    return getParamPresets(selectedTool.id, selectedCmd.name, param.name);
  }

  async function advanceParamFlow(nextValues, nextIdx) {
    const params = selectedCmd.params;

    if (nextIdx >= params.length) {
      await runTool(selectedTool, selectedCmd, nextValues);
      return;
    }

    setParamValues(nextValues);
    setParamIdx(nextIdx);
    setCurrentInput("");

    const nextPresets = getPresetsForParam(nextIdx);
    if (nextPresets.length > 0) {
      setPresetIdx(0);
      setScreen("preset");
      return;
    }

    setScreen("params");
  }

  useInput(async (input, key) => {
    if (screen === "result") {
      setScreen(resultBackScreen);
      setResult(null);
      setError(null);
      return;
    }

    if ((input === "q" || key.escape) && screen !== "params" && screen !== "preset") {
      if (screen === "template") {
        setScreen("tool");
        setTemplateIdx(0);
      } else if (screen === "cmd") {
        if (currentTemplates.length > 0) {
          setScreen("template");
        } else {
          setScreen("tool");
        }
        setCmdIdx(0);
      } else {
        exit();
      }
      return;
    }

    if (screen === "tool") {
      if (key.upArrow) setToolIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow) setToolIdx((i) => Math.min(TOOLS.length - 1, i + 1));
      else if (key.return) {
        setCmdIdx(0);
        setTemplateIdx(0);
        setScreen(currentTemplates.length > 0 ? "template" : "cmd");
      }
      return;
    }

    if (screen === "template") {
      if (key.upArrow) {
        setTemplateIdx((i) => Math.max(0, i - 1));
        return;
      }

      if (key.downArrow) {
        setTemplateIdx((i) => Math.min(templateMenuItems.length - 1, i + 1));
        return;
      }

      if (key.return) {
        const template = templateMenuItems[templateIdx];

        if (template?.manual) {
          openCommandMenu();
          return;
        }

        const command = selectedTool.commands.find((item) => item.name === template?.commandName);
        if (!command) {
          setError(`Unknown template command: ${template?.commandName ?? ""}`);
          setResultBackScreen("template");
          setScreen("result");
          return;
        }

        await runTool(selectedTool, command, template.values, "template");
      }

      return;
    }

    if (screen === "cmd") {
      if (key.upArrow) setCmdIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow)
        setCmdIdx((i) => Math.min(selectedTool.commands.length - 1, i + 1));
      else if (key.return) {
        resetParamFlow();
        if (selectedCmd.params.length === 0) {
          await runTool(selectedTool, selectedCmd, {});
        } else {
          const firstPresets = getPresetsForParam(0);
          setScreen(firstPresets.length > 0 ? "preset" : "params");
        }
      }
      return;
    }

    if (screen === "preset") {
      if (input === "q" || key.escape) {
        setScreen("cmd");
        resetParamFlow();
        return;
      }

      if (key.upArrow) {
        setPresetIdx((i) => Math.max(0, i - 1));
        return;
      }

      if (key.downArrow) {
        setPresetIdx((i) => Math.min(currentPresets.length - 1, i + 1));
        return;
      }

      if (key.return) {
        const preset = currentPresets[presetIdx];

        if (preset?.value === CUSTOM_PRESET_VALUE) {
          setCurrentInput("");
          setScreen("params");
          return;
        }

        const nextValues = { ...paramValues, [currentParam.name]: preset.value };
        await advanceParamFlow(nextValues, paramIdx + 1);
      }

      return;
    }

    if (screen === "params") {
      const params = selectedCmd.params;
      const param = params[paramIdx];

      if (key.escape) {
        setCurrentInput("");
        if (currentPresets.length > 0) {
          setPresetIdx(0);
          setScreen("preset");
        } else {
          setScreen("cmd");
          setParamValues({});
        }
        return;
      }

      if (key.return) {
        const newValues = { ...paramValues, [param.name]: currentInput };
        await advanceParamFlow(newValues, paramIdx + 1);
        return;
      }

      handleCurrentKey(input, key);
      return;
    }
  });

  async function runTool(tool, cmd, values, backScreen = "cmd") {
    setScreen("running");
    setResultBackScreen(backScreen);
    try {
      const mod = await import(tool.module);
      const raw = await mod.invoke(cmd.name, values);
      const text = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
      setResult(text);
      setScreen("result");
    } catch (err) {
      setError(String(err));
      setScreen("result");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return h(Box, { flexDirection: "column", padding: 1 },
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true, color: "magenta" }, "@axiestudio/tool"),
      h(Text, { color: "gray" }, "  zero-dependency AI agent fetch wrappers"),
    ),

    screen === "tool" && h(Menu, { items: TOOLS, selectedIndex: toolIdx, label: "Select a tool" }),

    screen === "template" && h(Box, { flexDirection: "column" },
      h(Text, { color: "gray", dimColor: true }, "Tool: ", h(Text, { color: "cyan" }, selectedTool.label)),
      h(Newline),
      h(Text, { color: "gray", dimColor: true }, "Curated shortcuts for common developer tasks"),
      h(Newline),
      h(Menu, {
        items: templateMenuItems,
        selectedIndex: templateIdx,
        label: "Select a shortcut",
        footerText: "↑↓ navigate · Enter run · q back",
      }),
    ),

    screen === "cmd" && h(Box, { flexDirection: "column" },
      h(Text, { color: "gray", dimColor: true }, "Tool: ", h(Text, { color: "cyan" }, selectedTool.label)),
      h(Newline),
      h(Menu, { items: selectedTool.commands, selectedIndex: cmdIdx, label: "Select a command" }),
      h(Newline),
      h(Text, { color: "gray", dimColor: true }, "← q to go back"),
    ),

    screen === "preset" && currentParam && h(Box, { flexDirection: "column" },
      h(Text, { color: "gray", dimColor: true }, selectedTool.label + " → ", h(Text, { color: "cyan" }, selectedCmd.name)),
      h(Newline),
      h(Text, { bold: true, color: "cyan" }, `Choose ${currentParam.name}`),
      h(Newline),
      ...selectedCmd.params.slice(0, paramIdx).map((param) =>
        h(Text, { key: param.name, color: "gray", dimColor: true }, `${param.name}: ${paramValues[param.name] ?? ""}`),
      ),
      selectedCmd.params.slice(0, paramIdx).length > 0 ? h(Newline) : null,
      h(Menu, {
        items: currentPresets,
        selectedIndex: presetIdx,
        label: `${currentParam.name} suggestions`,
        footerText: "↑↓ navigate · Enter select · Esc cancel",
      }),
    ),

    screen === "params" && selectedCmd && h(Box, { flexDirection: "column" },
      h(Text, { color: "gray", dimColor: true }, selectedTool.label + " → ", h(Text, { color: "cyan" }, selectedCmd.name)),
      h(Newline),
      h(Text, { bold: true, color: "cyan" }, "Enter parameters"),
      h(Newline),
      ...selectedCmd.params.map((p, i) =>
        h(TextPrompt, {
          key: p.name,
          label: p.name,
          hint: p.hint,
          value: i < paramIdx ? paramValues[p.name] ?? "" : i === paramIdx ? currentInput : "",
          active: i === paramIdx,
        }),
      ),
      h(Newline),
      h(Text, { color: "gray", dimColor: true }, "Enter confirm · Esc cancel"),
    ),

    screen === "running" && h(Box, null, h(Text, { color: "yellow" }, "⠋ Fetching...")),

    screen === "result" && h(ResultView, { result, error }),
  );
}

render(h(App));

} // end runExplorer
