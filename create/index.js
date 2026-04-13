#!/usr/bin/env node

// @axiestudio/create-tool — Interactive setup wizard
// Usage: npm create @axiestudio/tool

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

// ── ANSI helpers ────────────────────────────────────────────────────────────

const ESC = "\x1b[";
const CLEAR_LINE = ESC + "2K";
const HIDE_CURSOR = ESC + "?25l";
const SHOW_CURSOR = ESC + "?25h";
const up = (n) => (n > 0 ? ESC + n + "A" : "");
const b = (s) => `\x1b[1m${s}\x1b[22m`;
const d = (s) => `\x1b[2m${s}\x1b[22m`;
const cyan = (s) => `\x1b[36m${s}\x1b[39m`;
const green = (s) => `\x1b[32m${s}\x1b[39m`;
const yellow = (s) => `\x1b[33m${s}\x1b[39m`;
const magenta = (s) => `\x1b[35m${s}\x1b[39m`;
const gray = (s) => `\x1b[90m${s}\x1b[39m`;

// Clack-inspired box drawing
const BAR = gray("│");
const BAR_START = gray("┌");
const BAR_END = gray("└");
const STEP = green("◆");
const STEP_DONE = gray("◇");

// ── Prompts ─────────────────────────────────────────────────────────────────

function multiSelect(title, items, allOnByDefault = true) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(items.filter((item) => item.checked ?? allOnByDefault));
  }

  return new Promise((resolve) => {
    const checked = items.map((item) => item.checked ?? allOnByDefault);
    let cursor = 0;
    let lineCount = 0;

    function render() {
      if (lineCount > 0) process.stdout.write(up(lineCount));
      const lines = [];
      lines.push("");
      for (let i = 0; i < items.length; i++) {
        const mark = checked[i] ? green("✔") : gray("○");
        const pointer = i === cursor ? cyan("❯") : " ";
        const label = i === cursor ? b(items[i].label) : items[i].label;
        const desc = items[i].description ? d("  " + items[i].description) : "";
        lines.push(`  ${pointer} ${mark} ${label}${desc}`);
      }
      lines.push("");
      lines.push(d("    ↑↓ navigate · Space toggle · a all · n none · Enter confirm"));
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
      if (key === "\x03") { process.stdout.write(SHOW_CURSOR + "\n"); process.exit(0); }
      if (key === "\r" || key === "\n") { cleanup(); resolve(items.filter((_, i) => checked[i])); return; }
      if (key === " ") checked[cursor] = !checked[cursor];
      if (key === "a") checked.fill(true);
      if (key === "n") checked.fill(false);
      if (key === "\x1b[A" || key === "k") cursor = Math.max(0, cursor - 1);
      if (key === "\x1b[B" || key === "j") cursor = Math.min(items.length - 1, cursor + 1);
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

function groupedMultiSelect(title, groups, allOnByDefault = true) {
  if (!process.stdin.isTTY) {
    const result = [];
    for (const g of groups) {
      for (const item of g.items) {
        if (item.checked ?? allOnByDefault) result.push(item);
      }
    }
    return Promise.resolve(result);
  }

  return new Promise((resolve) => {
    // Flatten groups into a mixed list of headers + items
    const flatList = [];
    const checked = [];
    for (let gi = 0; gi < groups.length; gi++) {
      flatList.push({ type: "header", groupIdx: gi });
      checked.push([]);
      for (let ii = 0; ii < groups[gi].items.length; ii++) {
        flatList.push({ type: "item", groupIdx: gi, itemIdx: ii });
        checked[gi].push(groups[gi].items[ii].checked ?? allOnByDefault);
      }
    }

    let cursor = 0;
    let scrollOffset = 0;
    const termRows = process.stdout.rows || 24;
    const viewportHeight = Math.max(14, Math.min(24, termRows - 8));
    let lineCount = 0;

    const totalItems = checked.reduce((sum, g) => sum + g.length, 0);

    function selectedCount() {
      return checked.reduce((sum, g) => sum + g.filter(Boolean).length, 0);
    }

    function groupSelCount(gi) {
      return checked[gi].filter(Boolean).length;
    }

    function render() {
      if (lineCount > 0) process.stdout.write(up(lineCount));

      // Keep cursor in viewport
      if (cursor < scrollOffset) scrollOffset = cursor;
      if (cursor >= scrollOffset + viewportHeight) scrollOffset = cursor - viewportHeight + 1;

      // Snap to include group header when scrolling into a group
      if (scrollOffset > 0 && flatList[scrollOffset].type === "item") {
        for (let h = scrollOffset - 1; h >= Math.max(0, scrollOffset - 2); h--) {
          if (flatList[h].type === "header" && flatList[h].groupIdx === flatList[scrollOffset].groupIdx) {
            scrollOffset = h;
            break;
          }
        }
      }

      const lines = [];
      const visibleEnd = Math.min(flatList.length, scrollOffset + viewportHeight);

      // Scroll up indicator
      if (scrollOffset > 0) {
        lines.push(gray(`      ↑ ${scrollOffset} more above`));
      }

      for (let i = scrollOffset; i < visibleEnd; i++) {
        const entry = flatList[i];

        if (entry.type === "header") {
          const g = groups[entry.groupIdx];
          const gi = entry.groupIdx;
          const total = g.items.length;
          const sel = groupSelCount(gi);
          const allSel = sel === total;
          const noneSel = sel === 0;

          // Blank line before group (except first visible)
          if (i > scrollOffset || (scrollOffset === 0 && i > 0)) lines.push("");

          const pointer = i === cursor ? cyan("❯") : " ";
          const mark = allSel ? green("■") : noneSel ? gray("□") : yellow("◧");
          const name = i === cursor ? b(g.name) : g.name;
          const pad = " ".repeat(Math.max(1, 36 - g.name.length));
          const counter = d(`${sel}/${total}`);
          lines.push(`  ${pointer} ${mark} ${cyan(name)}${pad}${counter}`);
        } else {
          const item = groups[entry.groupIdx].items[entry.itemIdx];
          const isChecked = checked[entry.groupIdx][entry.itemIdx];

          const pointer = i === cursor ? cyan("❯") : " ";
          const mark = isChecked ? green("✔") : gray("○");
          const label = i === cursor ? b(item.label) : item.label;
          const pad = " ".repeat(Math.max(1, 20 - item.label.length));
          const desc = item.description ? d(item.description) : "";
          lines.push(`  ${pointer}   ${mark} ${label}${pad}${desc}`);
        }
      }

      // Scroll down indicator
      const remaining = flatList.length - visibleEnd;
      if (remaining > 0) {
        lines.push(gray(`      ↓ ${remaining} more below`));
      }

      // Status bar
      lines.push("");
      const sel = selectedCount();
      const selText = sel === totalItems
        ? green(b(`All ${totalItems} selected`))
        : `${green(b(String(sel)))}${gray("/")}${gray(String(totalItems))} selected`;
      lines.push(`  ${selText}`);
      lines.push(gray("  ↑↓ navigate · Space toggle · Tab next group · a all · n none · Enter confirm"));

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
      if (key === "\x03") { process.stdout.write(SHOW_CURSOR + "\n"); process.exit(0); }
      if (key === "\r" || key === "\n") {
        cleanup();
        const result = [];
        for (let gi = 0; gi < groups.length; gi++) {
          for (let ii = 0; ii < groups[gi].items.length; ii++) {
            if (checked[gi][ii]) result.push(groups[gi].items[ii]);
          }
        }
        resolve(result);
        return;
      }

      if (key === " ") {
        const entry = flatList[cursor];
        if (entry.type === "header") {
          // Toggle entire category
          const gi = entry.groupIdx;
          const allChecked = checked[gi].every(Boolean);
          checked[gi].fill(!allChecked);
        } else {
          checked[entry.groupIdx][entry.itemIdx] = !checked[entry.groupIdx][entry.itemIdx];
        }
      }

      if (key === "a") { for (const g of checked) g.fill(true); }
      if (key === "n") { for (const g of checked) g.fill(false); }

      if (key === "\x1b[A" || key === "k") cursor = Math.max(0, cursor - 1);
      if (key === "\x1b[B" || key === "j") cursor = Math.min(flatList.length - 1, cursor + 1);

      // Tab = jump to next group header
      if (key === "\t") {
        for (let i = cursor + 1; i < flatList.length; i++) {
          if (flatList[i].type === "header") { cursor = i; break; }
        }
      }
      // Shift-Tab = jump to previous group header
      if (key === "\x1b[Z") {
        for (let i = cursor - 1; i >= 0; i--) {
          if (flatList[i].type === "header") { cursor = i; break; }
        }
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

function confirm(question, defaultYes = true) {
  if (!process.stdin.isTTY) return Promise.resolve(defaultYes);

  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const hint = defaultYes ? "(Y/n)" : "(y/N)";
    rl.question(`  ${cyan("◆")} ${question} ${d(hint)} `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === "" ? defaultYes : a === "y" || a === "yes");
    });
  });
}

// ── Package manager detection ───────────────────────────────────────────────

function detectPM() {
  const ua = process.env.npm_config_user_agent || "";
  if (ua.startsWith("bun")) return "bun";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (existsSync("bun.lockb") || existsSync("bun.lock")) return "bun";
  if (existsSync("pnpm-lock.yaml")) return "pnpm";
  if (existsSync("yarn.lock")) return "yarn";
  return "npm";
}

function installCmd(pm, deps) {
  const d = deps.join(" ");
  if (pm === "bun") return `bun add ${d}`;
  if (pm === "pnpm") return `pnpm add ${d}`;
  if (pm === "yarn") return `yarn add ${d}`;
  return `npm install ${d}`;
}

// ── IDE / CLI / Agent detection ─────────────────────────────────────────────

/**
 * Detect the user's IDE, editor, or AI CLI from environment variables.
 * Returns { id, name, skillDir } — the recommended skill directory for that tool.
 *
 * Detection sources (env vars set by terminals spawned from each tool):
 *   VS Code:    TERM_PROGRAM=vscode, VSCODE_INJECTION=1
 *   Cursor:     TERM_PROGRAM=cursor, CURSOR_TRACE_ID
 *   Windsurf:   TERM_PROGRAM=windsurf
 *   Zed:        TERM_PROGRAM=zed, ZED_TERM
 *   JetBrains:  TERMINAL_EMULATOR=JetBrains-JediTerm
 *   Fleet:      TERMINAL_EMULATOR=JetBrains-Fleet (JetBrains Fleet)
 *   Claude Code:CLAUDE_PROJECT_DIR
 *   Aider:      AIDER_* env vars or .aider.conf.yml at root
 *   Gemini CLI: GEMINI_API_KEY (Google's CLI)
 *   Warp:       TERM_PROGRAM=WarpTerminal
 *   Codex CLI:  CODEX_HOME or CODEX_* env
 *   Amazon Q:   Q_SET_* env vars
 *   Cline:      CLINE_* or the VS Code extension context
 *   Continue:   CONTINUE_GLOBAL_DIR
 */
function detectEnvironment() {
  const env = process.env;
  const tp = (env.TERM_PROGRAM || "").toLowerCase();
  const te = (env.TERMINAL_EMULATOR || "").toLowerCase();

  // IDEs / Editors (from TERM_PROGRAM or specific env vars)
  if (tp === "cursor" || env.CURSOR_TRACE_ID)
    return { id: "cursor",      name: "Cursor",            skillDir: ".cursor/skills" };
  if (tp === "windsurf" || env.WINDSURF_SESSION)
    return { id: "windsurf",    name: "Windsurf",          skillDir: ".windsurf/skills" };
  if (tp === "vscode" || env.VSCODE_INJECTION || env.VSCODE_PID)
    return { id: "vscode",      name: "VS Code",           skillDir: ".agents/skills" };
  if (tp === "zed" || env.ZED_TERM)
    return { id: "zed",         name: "Zed",               skillDir: ".agents/skills" };
  if (te.includes("jetbrains-jediterm") || env.JETBRAINS_IDE)
    return { id: "jetbrains",   name: "JetBrains IDE",     skillDir: ".agents/skills" };
  if (te.includes("jetbrains-fleet") || env.FLEET_HOST)
    return { id: "fleet",       name: "JetBrains Fleet",   skillDir: ".agents/skills" };

  // AI CLIs (from tool-specific env vars)
  if (env.CLAUDE_PROJECT_DIR || env.CLAUDE_CODE)
    return { id: "claude-code", name: "Claude Code",       skillDir: ".claude/skills" };
  if (env.CONTINUE_GLOBAL_DIR)
    return { id: "continue",    name: "Continue",          skillDir: ".agents/skills" };
  if (env.CODEX_HOME || env.CODEX_SANDBOX_DIR)
    return { id: "codex",       name: "Codex CLI",         skillDir: ".agents/skills" };

  // Terminal emulators (these don't have skill dirs, but useful to report)
  if (tp === "warpterminal" || tp === "warp")
    return { id: "warp",        name: "Warp Terminal",     skillDir: ".agents/skills" };
  if (tp === "iterm2" || tp === "iterm.app")
    return { id: "iterm",       name: "iTerm2",            skillDir: ".agents/skills" };
  if (tp === "hyper")
    return { id: "hyper",       name: "Hyper",             skillDir: ".agents/skills" };
  if (tp === "alacritty")
    return { id: "alacritty",   name: "Alacritty",         skillDir: ".agents/skills" };
  if (tp === "tmux")
    return { id: "tmux",        name: "tmux",              skillDir: ".agents/skills" };

  return { id: "unknown", name: null, skillDir: ".agents/skills" };
}

// ── Repo root + skill directory detection ───────────────────────────────────

/** Walk up from cwd to find the repo root (where .git/ lives) */
function findRepoRoot(from = process.cwd()) {
  let dir = resolve(from);
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null; // hit filesystem root
    dir = parent;
  }
}

/**
 * Scan the repo for existing skill directories.
 * All known patterns that support SKILL.md files.
 */
function findSkillDirs(repoRoot) {
  const patterns = [
    { dir: ".agents/skills",   label: ".agents/skills/  (VS Code Copilot)" },
    { dir: ".github/skills",   label: ".github/skills/  (GitHub Copilot)" },
    { dir: ".claude/skills",   label: ".claude/skills/  (Claude Code)" },
    { dir: ".cursor/skills",   label: ".cursor/skills/  (Cursor)" },
    { dir: ".windsurf/skills", label: ".windsurf/skills/ (Windsurf)" },
  ];
  const found = [];
  for (const p of patterns) {
    const full = join(repoRoot, p.dir);
    if (existsSync(full)) {
      found.push({ path: full, rel: p.dir, label: p.label });
    }
  }
  return found;
}

// ── SKILL.md content ────────────────────────────────────────────────────────

const SKILL_MD = `---
name: axiestudio-tool
description: "52 zero-dependency fetch wrappers replacing MCP servers. Live library docs, npm/GitHub data, 48 framework doc tools, and browser automation. All tools share invoke(toolName, args)."
---

# @axiestudio/tool — AI Agent Skill (52 Tools)

## File Locations & Self-Repair

You are reading this SKILL.md from inside the project (e.g. .agents/skills/axiestudio-tool/SKILL.md). The tool source files are at:

\\\`\\\`\\\`
node_modules/@axiestudio/tool/
├─ context7.js, npm.js, github.js, react-docs.js, ...  (52 tool files)
├─ browser/                                             (CDP automation scripts)
├─ bin/cli.js                                           (interactive CLI)
└─ SKILL.md                                             (canonical full version)
\\\`\\\`\\\`

If an invoke() call fails, read the tool source at \\\`node_modules/@axiestudio/tool/<tool>.js\\\` to diagnose & fix. Each file is ~50-150 lines of plain fetch() calls.

The canonical full SKILL.md with all 52 tool schemas is at \\\`node_modules/@axiestudio/tool/SKILL.md\\\`. Read that for complete function-calling definitions.

## How to Call a Tool

\\\`\\\`\\\`js
import { invoke } from "@axiestudio/tool/<tool-name>";
const result = await invoke("<command>", { ...args });
\\\`\\\`\\\`

## Tool Catalog (52 tools)

**4 multi-purpose tools:**
| Import | Commands |
|---|---|
| \\\`@axiestudio/tool/context7\\\` | \\\`resolve-library-id\\\` → \\\`get-library-docs\\\` |
| \\\`@axiestudio/tool/cloudflare-docs\\\` | \\\`list-products\\\`, \\\`get-product-index\\\`, \\\`get-page\\\`, \\\`search-docs\\\` |
| \\\`@axiestudio/tool/npm\\\` | \\\`search\\\`, \\\`get-readme\\\`, \\\`get-package-info\\\`, \\\`get-versions\\\`, \\\`get-downloads\\\`, \\\`get-dependencies\\\` |
| \\\`@axiestudio/tool/github\\\` | \\\`get-file\\\`, \\\`list-dir\\\`, \\\`search-code\\\`, \\\`get-releases\\\`, \\\`get-repo-info\\\`, \\\`compare-tags\\\` |

**48 docs tools** — all share: \\\`get-index\\\`, \\\`get-page\\\`, \\\`search-docs\\\`:
react-docs, nextjs-docs, astro-docs, svelte-docs, vue-docs, angular-docs, nuxt-docs, solid-docs, hono-docs, fastify-docs, elysia-docs, trpc-docs, nitro-docs, expo-docs, bun-docs, deno-docs, vite-docs, vitest-docs, turborepo-docs, storybook-docs, rspack-docs, wxt-docs, tauri-docs, drizzle-docs, prisma-docs, neon-docs, supabase-docs, turso-docs, convex-docs, payload-docs, better-auth-docs, clerk-docs, stripe-docs, shadcn-docs, mantine-docs, panda-css-docs, tanstack-docs, zustand-docs, zod-docs, xstate-docs, effect-docs, langchain-docs, vercel-docs, livekit-docs, elevenlabs-docs, resend-docs, ar-android-docs, ar-ios-docs

## Browser Automation (optional — requires puppeteer-core)

The 52 core tools have ZERO dependencies. Browser scripts are the ONLY optional dependency.
Install: \\\`npm install puppeteer-core\\\` (or bun/pnpm/yarn equivalent)

\\\`\\\`\\\`bash
node node_modules/@axiestudio/tool/browser/start.js        # Launch Chrome
node node_modules/@axiestudio/tool/browser/nav.js <url>    # Navigate
node node_modules/@axiestudio/tool/browser/screenshot.js   # Screenshot
node node_modules/@axiestudio/tool/browser/get-text.js '#main'  # Extract text
\\\`\\\`\\\`

## Rules

1. Do not fetch docs already in context.
2. Context7 always needs two calls: resolve-library-id → get-library-docs.
3. Prefer dedicated docs tools over context7 when available.
4. All 48 docs tools share the same 3 commands (get-index, get-page, search-docs).
5. If a tool call fails, read its source at node_modules/@axiestudio/tool/<tool>.js and fix.
6. For complete tool-calling schemas, read node_modules/@axiestudio/tool/SKILL.md.

Docs: https://github.com/axiestudio/tool
`;

// ── Single select prompt ────────────────────────────────────────────────────

function singleSelect(title, items) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(items[0]);
  }

  return new Promise((resolve) => {
    let cursor = 0;
    let lineCount = 0;

    function render() {
      if (lineCount > 0) process.stdout.write(up(lineCount));
      const lines = [];
      lines.push("");
      for (let i = 0; i < items.length; i++) {
        const pointer = i === cursor ? cyan("❯") : " ";
        const mark = i === cursor ? green("●") : gray("○");
        const label = i === cursor ? b(items[i].label) : items[i].label;
        lines.push(`  ${pointer} ${mark} ${label}`);
      }
      lines.push("");
      lines.push(d("    ↑↓ navigate · Enter select"));
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
      if (key === "\x03") { process.stdout.write(SHOW_CURSOR + "\n"); process.exit(0); }
      if (key === "\r" || key === "\n") { cleanup(); resolve(items[cursor]); return; }
      if (key === "\x1b[A" || key === "k") cursor = Math.max(0, cursor - 1);
      if (key === "\x1b[B" || key === "j") cursor = Math.min(items.length - 1, cursor + 1);
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const detected = detectEnvironment();

  console.log("");
  console.log(`  ${BAR_START}  ${magenta(b("@axiestudio/tool"))}`);
  console.log(`  ${BAR}`);
  if (detected.name) {
    console.log(`  ${STEP_DONE}  Detected ${cyan(b(detected.name))}`);
    console.log(`  ${BAR}`);
  }

  // Step 1: Select tools
  console.log(`  ${STEP}  ${b("Select your tools")}`);

  const toolGroups = [
    {
      name: "Multi-purpose",
      items: [
        { id: "context7",        label: "context7",        description: "Live docs for any library" },
        { id: "cloudflare-docs", label: "cloudflare-docs", description: "Cloudflare developer docs" },
        { id: "npm",             label: "npm",             description: "npm registry — search, README, versions" },
        { id: "github",          label: "github",          description: "GitHub public API — files, code search, releases" },
      ],
    },
    {
      name: "AR Docs",
      items: [
        { id: "ar-android-docs", label: "ar-android-docs", description: "Google ARCore and Scene Viewer docs" },
        { id: "ar-ios-docs",     label: "ar-ios-docs",     description: "Apple ARKit docs" },
      ],
    },
    {
      name: "Frameworks & Runtimes",
      items: [
        { id: "react-docs",   label: "react-docs",   description: "React framework docs" },
        { id: "nextjs-docs",  label: "nextjs-docs",  description: "Next.js framework docs" },
        { id: "astro-docs",   label: "astro-docs",   description: "Astro framework docs" },
        { id: "svelte-docs",  label: "svelte-docs",  description: "Svelte / SvelteKit docs" },
        { id: "vue-docs",     label: "vue-docs",     description: "Vue.js framework docs" },
        { id: "angular-docs", label: "angular-docs", description: "Angular framework docs" },
        { id: "nuxt-docs",    label: "nuxt-docs",    description: "Nuxt framework docs" },
        { id: "solid-docs",   label: "solid-docs",   description: "SolidJS framework docs" },
        { id: "hono-docs",    label: "hono-docs",    description: "Hono HTTP framework docs" },
        { id: "fastify-docs", label: "fastify-docs", description: "Fastify framework docs" },
        { id: "elysia-docs",  label: "elysia-docs",  description: "Elysia framework docs" },
        { id: "trpc-docs",    label: "trpc-docs",    description: "tRPC end-to-end typesafe APIs" },
        { id: "nitro-docs",   label: "nitro-docs",   description: "Nitro server framework docs" },
        { id: "expo-docs",    label: "expo-docs",    description: "Expo React Native docs" },
        { id: "bun-docs",     label: "bun-docs",     description: "Bun runtime docs" },
        { id: "deno-docs",    label: "deno-docs",    description: "Deno runtime docs" },
      ],
    },
    {
      name: "Build & Dev Tools",
      items: [
        { id: "vite-docs",      label: "vite-docs",      description: "Vite build tool docs" },
        { id: "vitest-docs",    label: "vitest-docs",    description: "Vitest testing framework docs" },
        { id: "turborepo-docs", label: "turborepo-docs", description: "Turborepo monorepo docs" },
        { id: "storybook-docs", label: "storybook-docs", description: "Storybook component dev docs" },
        { id: "rspack-docs",    label: "rspack-docs",    description: "Rspack bundler docs" },
        { id: "wxt-docs",       label: "wxt-docs",       description: "WXT browser extension framework" },
        { id: "tauri-docs",     label: "tauri-docs",     description: "Tauri desktop app docs" },
      ],
    },
    {
      name: "Database & Backend",
      items: [
        { id: "drizzle-docs",  label: "drizzle-docs",  description: "Drizzle ORM docs" },
        { id: "prisma-docs",   label: "prisma-docs",   description: "Prisma ORM docs" },
        { id: "neon-docs",     label: "neon-docs",     description: "Neon serverless Postgres docs" },
        { id: "supabase-docs", label: "supabase-docs", description: "Supabase backend docs" },
        { id: "turso-docs",    label: "turso-docs",    description: "Turso edge database docs" },
        { id: "convex-docs",   label: "convex-docs",   description: "Convex backend platform docs" },
        { id: "payload-docs",  label: "payload-docs",  description: "Payload CMS docs" },
      ],
    },
    {
      name: "Auth & Payments",
      items: [
        { id: "better-auth-docs", label: "better-auth-docs", description: "Better Auth docs" },
        { id: "clerk-docs",       label: "clerk-docs",       description: "Clerk authentication docs" },
        { id: "stripe-docs",      label: "stripe-docs",      description: "Stripe payments docs" },
      ],
    },
    {
      name: "UI & Styling",
      items: [
        { id: "shadcn-docs",    label: "shadcn-docs",    description: "shadcn/ui component docs" },
        { id: "mantine-docs",   label: "mantine-docs",   description: "Mantine UI library docs" },
        { id: "panda-css-docs", label: "panda-css-docs", description: "Panda CSS docs" },
      ],
    },
    {
      name: "State & Data",
      items: [
        { id: "tanstack-docs", label: "tanstack-docs", description: "TanStack Query/Router/Table docs" },
        { id: "zustand-docs",  label: "zustand-docs",  description: "Zustand state management docs" },
        { id: "zod-docs",      label: "zod-docs",      description: "Zod schema validation docs" },
        { id: "xstate-docs",   label: "xstate-docs",   description: "XState state machines docs" },
        { id: "effect-docs",   label: "effect-docs",   description: "Effect-TS docs" },
      ],
    },
    {
      name: "AI & APIs",
      items: [
        { id: "langchain-docs",  label: "langchain-docs",  description: "LangChain AI framework docs" },
        { id: "vercel-docs",     label: "vercel-docs",     description: "Vercel platform docs" },
        { id: "livekit-docs",    label: "livekit-docs",    description: "LiveKit voice/video/agents docs" },
        { id: "elevenlabs-docs", label: "elevenlabs-docs", description: "ElevenLabs voice AI docs" },
        { id: "resend-docs",     label: "resend-docs",     description: "Resend email API docs" },
      ],
    },
  ];

  const selectedTools = await groupedMultiSelect("Select your tools", toolGroups);
  const totalTools = toolGroups.reduce((sum, g) => sum + g.items.length, 0);
  console.log(`  ${BAR}`);
  if (selectedTools.length === totalTools) {
    console.log(`  ${STEP_DONE}  ${green(b(`All ${totalTools} tools`))}`);
  } else {
    const byGroup = [];
    for (const g of toolGroups) {
      const sel = g.items.filter((i) => selectedTools.some((s) => s.id === i.id));
      if (sel.length > 0) byGroup.push(`${cyan(g.name)} ${d("(" + sel.length + ")")}`);
    }
    console.log(`  ${STEP_DONE}  ${green(b(selectedTools.length + " tools"))} — ${byGroup.join(d(" · "))}`);
  }
  console.log(`  ${BAR}`);

  // Step 2: Optional addons
  console.log(`  ${STEP}  ${b("Optional addons")}`);

  const addonChoices = [
    { id: "browser",  label: "Browser automation",  description: "requires puppeteer-core — scrape, screenshot, fill forms via CDP", checked: false },
    { id: "cli",      label: "Interactive CLI",     description: "requires ink + react — terminal UI tool explorer", checked: false },
    { id: "skill",    label: "AI Agent skill file", description: "SKILL.md for Copilot / Claude / Cursor (no deps)", checked: true },
  ];

  const selectedAddons = await multiSelect("", addonChoices, false);
  const addonIds = new Set(selectedAddons.map((a) => a.id));
  console.log(`  ${BAR}`);
  if (selectedAddons.length) {
    console.log(`  ${STEP_DONE}  ${green(selectedAddons.map((a) => a.id).join(", "))}`);
  } else {
    console.log(`  ${STEP_DONE}  ${d("None selected")}`);
  }
  console.log(`  ${BAR}`);

  // Step 3: Install dependencies
  //
  // The 52 core tools have ZERO dependencies — just fetch().
  // Only optional features (browser, CLI) require extra packages.
  //
  const pm = detectPM();
  const coreDeps = ["@axiestudio/tool"];
  const optionalDeps = [];
  const optionalReasons = [];
  if (addonIds.has("browser")) {
    optionalDeps.push("puppeteer-core");
    optionalReasons.push(`  ${b("•")} ${b("puppeteer-core")} — needed for ${cyan("Browser automation")} only (CDP connection to Chrome)`);
  }
  if (addonIds.has("cli")) {
    optionalDeps.push("ink", "react");
    optionalReasons.push(`  ${b("•")} ${b("ink")} + ${b("react")} — needed for ${cyan("Interactive CLI")} only (terminal UI explorer)`);
  }
  const allDeps = [...coreDeps, ...optionalDeps];

  if (optionalDeps.length > 0) {
    console.log(`  ${BAR}  ${yellow("ⓘ  The 52 core tools require ZERO dependencies.")}`);
    console.log(`  ${BAR}  ${yellow("   The following are only for your selected optional features:")}`);
    console.log(`  ${BAR}`);
    for (const reason of optionalReasons) console.log(`  ${BAR}${reason}`);
    console.log(`  ${BAR}`);
  }

  const installQuestion = optionalDeps.length > 0
    ? "Install tools + optional dependencies?"
    : "Install tools?";
  const shouldInstall = await confirm(installQuestion, true);
  if (shouldInstall) {
    const cmd = installCmd(pm, allDeps);
    console.log(`  ${BAR}`);
    console.log(`  ${BAR}  ${d("$ " + cmd)}`);
    try {
      execSync(cmd, { stdio: "inherit" });
      console.log(`  ${BAR}`);
      const installedLabel = optionalDeps.length > 0
        ? `${green("Installed")} ${d(allDeps.join(", "))}`
        : `${green("Tools installed")} ${d("@axiestudio/tool")}`;
      console.log(`  ${STEP_DONE}  ${installedLabel}`);
    } catch {
      console.log(`  ${BAR}`);
      console.log(`  ${STEP_DONE}  ${yellow("Install failed.")} Run manually: ${d(cmd)}`);
    }
  } else {
    console.log(`  ${STEP_DONE}  Skipped. Install later: ${d(installCmd(pm, allDeps))}`);
  }
  console.log(`  ${BAR}`);

  // Step 4: Copy SKILL.md into the USER's repo skill directory
  if (addonIds.has("skill")) {
    console.log(`  ${STEP}  ${b("AI Agent skill file")}`);
    // Find the user's repo root
    const repoRoot = findRepoRoot();
    let skillDestDir = null;

    if (repoRoot) {
      const relRoot = relative(process.cwd(), repoRoot) || ".";
      if (relRoot !== ".") {
        console.log(`  ${BAR}  Found repo root at ${cyan(relRoot)}`);
      }

      // Scan for existing skill directories
      const existingDirs = findSkillDirs(repoRoot);

      if (existingDirs.length === 1) {
        // One skill dir found — use it automatically
        skillDestDir = existingDirs[0].path;
        console.log(`  ${BAR}  Detected ${cyan(existingDirs[0].rel)}`);
      } else if (existingDirs.length > 1) {
        // Multiple skill dirs — let user pick
        console.log(`  ${BAR}  Multiple skill directories found:`);
        const choice = await singleSelect("", existingDirs);
        skillDestDir = choice.path;
      } else {
        // No skill dirs found — use IDE detection to suggest the best one
        const suggested = detected.skillDir; // e.g. ".cursor/skills" for Cursor
        const dirOptions = [
          { id: "agents",   label: ".agents/skills/  (VS Code Copilot)",   path: join(repoRoot, ".agents", "skills") },
          { id: "github",   label: ".github/skills/  (GitHub Copilot)",    path: join(repoRoot, ".github", "skills") },
          { id: "claude",   label: ".claude/skills/  (Claude Code)",       path: join(repoRoot, ".claude", "skills") },
          { id: "cursor",   label: ".cursor/skills/  (Cursor)",            path: join(repoRoot, ".cursor", "skills") },
          { id: "windsurf", label: ".windsurf/skills/ (Windsurf)",         path: join(repoRoot, ".windsurf", "skills") },
        ];

        // Move the detected IDE's option to the top
        const suggestedIdx = dirOptions.findIndex((o) => suggested.includes(o.id));
        if (suggestedIdx > 0) {
          const [item] = dirOptions.splice(suggestedIdx, 1);
          item.label = item.label + green(" ← detected");
          dirOptions.unshift(item);
        } else if (suggestedIdx === 0) {
          dirOptions[0].label = dirOptions[0].label + green(" ← detected");
        }

        if (detected.name) {
          console.log(`  ${BAR}  No skill directory found. ${d(`Suggesting ${detected.name}'s convention:`)}`);
        } else {
          console.log(`  ${BAR}  No skill directory found. Where should SKILL.md go?`);
        }
        const choice = await singleSelect("", dirOptions);
        skillDestDir = choice.path;
      }
    } else {
      // No git repo found — fall back to cwd with detected convention
      console.log(`  ${BAR}  ${yellow("⚠")} No git repo detected. Placing SKILL.md relative to cwd.`);
      skillDestDir = join(process.cwd(), detected.skillDir);
    }

    const destPath = join(skillDestDir, "axiestudio-tool", "SKILL.md");
    const relDest = relative(process.cwd(), destPath);

    if (existsSync(destPath)) {
      console.log(`  ${STEP_DONE}  ${d("SKILL.md already exists at")} ${cyan(relDest)}`);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      // Try to read from installed package first, fall back to embedded
      let content = SKILL_MD;
      const pkgSkill = join(process.cwd(), "node_modules", "@axiestudio", "tool", "SKILL.md");
      if (existsSync(pkgSkill)) {
        content = readFileSync(pkgSkill, "utf8");
      }
      writeFileSync(destPath, content);
      console.log(`  ${STEP_DONE}  ${green("SKILL.md")} → ${cyan(relDest)}`);
    }
    console.log(`  ${BAR}`);
  }

  // Step 5: Done
  console.log(`  ${BAR_END}  ${green(b("Setup complete!"))}`);
  console.log("");
  console.log(`  ${b("Next steps")}  Start using the tools:`);
  console.log("");
  console.log(d(`    import { invoke } from "@axiestudio/tool/context7";`));
  console.log(d(`    const id   = await invoke("resolve-library-id", { libraryName: "hono" });`));
  console.log(d(`    const docs = await invoke("get-library-docs", { libraryId: id });`));
  if (addonIds.has("browser")) {
    console.log("");
    console.log(d(`    // Browser automation`));
    console.log(d(`    import "@axiestudio/tool/browser/start";   // Launch Chrome`));
    console.log(d(`    import "@axiestudio/tool/browser/nav";     // Navigate`));
  }
  if (addonIds.has("cli")) {
    console.log("");
    console.log(d(`    // Interactive CLI explorer`));
    console.log(d(`    $ npx axie-tool`));
  }
  console.log("");
  console.log(`  ${d("Docs:")} ${cyan("https://github.com/axiestudio/tool")}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
