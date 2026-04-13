---
name: axiestudio-tool
description: "50 zero-dependency fetch wrappers replacing MCP servers. Live library docs, npm/GitHub data, 46 framework doc tools, and browser automation. All tools share invoke(toolName, args). Use when you need up-to-date documentation, package info, GitHub file access, or browser automation."
---

# @axiestudio/tool — AI Agent Skill (50 Tools)

This file teaches AI agents how to call the `@axiestudio/tool` package. Every tool exports `invoke(toolName, args)` — a standardized function-calling interface. No MCP, no daemons, no config. Just `import` and `invoke`.

---

## File Locations & Self-Repair

You are reading this SKILL.md from inside the user's project (e.g. `.agents/skills/axiestudio-tool/SKILL.md`). It was placed here by `npm create @axiestudio/tool`.

The tool source files are installed at:

```
node_modules/@axiestudio/tool/
├─ context7.js, npm.js, github.js, react-docs.js, ...  (50 tool files)
├─ browser/                                             (CDP automation scripts)
├─ bin/cli.js                                           (interactive CLI)
└─ SKILL.md                                             (canonical copy of this file)
```

**If an `invoke()` call fails or returns unexpected data**, read the tool's source file to diagnose the issue:

```js
// Example: read the source of react-docs.js to understand its internals
const source = readFileSync("node_modules/@axiestudio/tool/react-docs.js", "utf8");
```

Each tool is a self-contained ~50–150 line module using only `fetch()`. If an upstream API changed its URL or response format, you can patch the tool file directly in `node_modules/@axiestudio/tool/` — it's plain JavaScript, no build step.

The canonical full version of this skill file (with all 50 tool schemas) is at `node_modules/@axiestudio/tool/SKILL.md`. If this copy feels incomplete, read that one.

---

## What is a "Tool"?

A **tool** is a single JavaScript file (e.g. `react-docs.js`, `npm.js`, `github.js`) that wraps one or more HTTP API endpoints behind a unified `invoke(commandName, args)` function. Each tool:

- **Is a plain `.js` file** — no compilation, no build step, no transpilation needed.
- **Has zero runtime dependencies** — uses only the built-in `fetch()` API available in Node 18+, Bun, and Deno.
- **Exports `invoke(commandName, args)`** — the single entry point. You pass a command name string and an arguments object, and get back a structured result.
- **Exports a `tools` array** — a machine-readable descriptor listing every command the tool supports, including parameter names, types, and descriptions. This is what makes the tools self-documenting.
- **Returns structured data** — never raw HTML. Results are parsed objects (`{ markdown, index, path, packages, entries }` etc.).

Each tool file can contain 1–6 commands. For example, `npm.js` has 6 commands (`search`, `get-readme`, `get-package-info`, `get-versions`, `get-downloads`, `get-dependencies`), while `react-docs.js` has 3 (`get-index`, `get-page`, `search-docs`).

The package ships **50 tool files** covering documentation, package registries, GitHub, and browser automation. They replace MCP servers with plain `fetch()` calls — no protocol overhead, no daemon process, no config files.

---

## How to Call a Tool

```js
import { invoke } from "@axiestudio/tool/<tool-name>";
const result = await invoke("<command>", { ...args });
```

Every tool file also exports a `tools` array describing its available commands, parameters, and descriptions. You can inspect it programmatically:

```js
import { tools } from "@axiestudio/tool/npm";
// tools → [{ name: "search", description: "...", parameters: { query: "string", size: "number (optional)" } }, ...]
```

---

## Tool Definitions (Function-Calling Schema)

Below are all 50 tools with their full function signatures. Use these definitions to generate correct `invoke()` calls.

---

### `context7` — Live docs for any library

**Import:** `@axiestudio/tool/context7`
**Auth:** `CONTEXT7_API_KEY` env var (optional — works without it)
**Rule:** Always call `resolve-library-id` first, then `get-library-docs`. Never skip the resolve step.

#### `resolve-library-id`

Resolves a human-readable library name into a Context7 library ID.

```
invoke("resolve-library-id", {
  libraryName: string,       // required — e.g. "react", "next.js", "supabase"
  query?:      string        // optional — extra context to narrow the match
}) → string                  // returns the library ID, e.g. "/facebook/react"
```

#### `get-library-docs`

Fetches up-to-date documentation snippets for a resolved library.

```
invoke("get-library-docs", {
  libraryId: string,         // required — ID from resolve-library-id
  topic?:    string,         // optional — focus area, e.g. "routing", "hooks"
  tokens?:   number          // optional — max tokens to return (default 5000)
}) → object                  // returns doc snippets with source URLs
```

**Example:**
```js
import { invoke } from "@axiestudio/tool/context7";
const id   = await invoke("resolve-library-id", { libraryName: "hono" });
const docs = await invoke("get-library-docs", { libraryId: id, topic: "middleware" });
```

---

### `cloudflare-docs` — Cloudflare developer docs

**Import:** `@axiestudio/tool/cloudflare-docs`
**Auth:** None

#### `list-products`

```
invoke("list-products", {}) → { products: string[] }
```

#### `get-product-index`

```
invoke("get-product-index", {
  product: string            // required — slug, e.g. "workers", "pages", "r2", "ai", "d1"
}) → { product: string, index: string }
```

#### `get-page`

```
invoke("get-page", {
  path: string               // required — e.g. "/workers/runtime-apis/kv/"
}) → { path: string, markdown: string }
```

#### `search-docs`

```
invoke("search-docs", {
  product:   string,         // required — product slug
  query:     string,         // required — what you're looking for
  maxChars?: number          // optional — max characters (default 8000)
}) → { result: string, found: number }
```

---

### `npm` — npm registry

**Import:** `@axiestudio/tool/npm`
**Auth:** None

#### `search`

```
invoke("search", {
  query: string,             // required — e.g. "hono middleware"
  size?: number              // optional — results to return (default 10, max 250)
}) → { packages: Array<{ name, description, version, downloads }> }
```

#### `get-readme`

```
invoke("get-readme", {
  packageName: string,       // required — e.g. "hono", "drizzle-orm"
  version?:    string        // optional — defaults to latest
}) → { readme: string }     // Markdown
```

#### `get-package-info`

```
invoke("get-package-info", {
  packageName: string,       // required
  version?:    string        // optional — defaults to latest
}) → object                  // description, homepage, repository, dependencies, exports, license, etc.
```

#### `get-versions`

```
invoke("get-versions", {
  packageName: string        // required
}) → { versions: Array<{ version, date }> }
```

#### `get-downloads`

```
invoke("get-downloads", {
  packageName: string        // required — e.g. "hono", "@ai-sdk/openai"
}) → { weekly: number, monthly: number }
```

#### `get-dependencies`

```
invoke("get-dependencies", {
  packageName: string,       // required
  version?:    string        // optional — defaults to latest
}) → { dependencies, devDependencies, peerDependencies, optionalDependencies, total: number }
```

---

### `github` — GitHub public API

**Import:** `@axiestudio/tool/github`
**Auth:** None (public repos only)

#### `get-file`

```
invoke("get-file", {
  owner: string,             // required — e.g. "honojs"
  repo:  string,             // required — e.g. "hono"
  path:  string,             // required — e.g. "src/index.ts"
  ref?:  string              // optional — branch/tag/commit, defaults to HEAD
}) → { content: string }
```

#### `list-dir`

```
invoke("list-dir", {
  owner: string,             // required
  repo:  string,             // required
  path?: string,             // optional — defaults to root "/"
  ref?:  string              // optional — branch/tag/commit
}) → { entries: Array<{ name, type, size }> }
```

#### `search-code`

```
invoke("search-code", {
  query:     string,         // required — GitHub code search query
  language?: string,         // optional — e.g. "typescript"
  perPage?:  number          // optional — results (default 10, max 30)
}) → { items: Array<{ path, repo, snippet }>, total: number }
```

#### `get-releases`

```
invoke("get-releases", {
  owner:    string,          // required
  repo:     string,          // required
  perPage?: number           // optional — releases to return (default 10)
}) → { releases: Array<{ tag, name, date, body }> }
```

#### `get-repo-info`

```
invoke("get-repo-info", {
  owner: string,             // required
  repo:  string              // required
}) → object                  // description, stars, topics, language, homepage, etc.
```

#### `compare-tags`

```
invoke("compare-tags", {
  owner: string,             // required
  repo:  string,             // required
  base:  string,             // required — e.g. "v4.0.0"
  head:  string              // required — e.g. "v4.1.0"
}) → object                  // commits, files changed, diff stats
```

---

### 46 Documentation Tools (shared interface)

All 46 documentation tools expose the **same three commands**. The only difference is the import path and which docs site they fetch from.

**Import pattern:** `@axiestudio/tool/<tool-name>`

#### `get-index`

Returns a full index of all documentation pages. Use this to discover valid page paths before calling `get-page`.

```
invoke("get-index", {}) → { index: string }
```

#### `get-page`

Fetches a specific documentation page as clean Markdown.

```
invoke("get-page", {
  path: string               // required — doc path from the index, e.g. "/docs/getting-started"
}) → { path: string, markdown: string }
```

#### `search-docs`

Searches across all documentation for a keyword or topic.

```
invoke("search-docs", {
  query:     string,         // required — what you're looking for
  maxChars?: number          // optional — max characters to return (default 8000)
}) → { result: string, found: number }
```

**Example (works the same for all 46 tools):**
```js
import { invoke } from "@axiestudio/tool/react-docs";
const { index }    = await invoke("get-index", {});
const { markdown } = await invoke("get-page", { path: "/reference/react/useState" });
const { result }   = await invoke("search-docs", { query: "hooks" });
```

#### Complete list of 46 docs tools

**Frameworks & runtimes (16):**
`react-docs`, `nextjs-docs`, `astro-docs`, `svelte-docs`, `vue-docs`, `angular-docs`, `nuxt-docs`, `solid-docs`, `hono-docs`, `fastify-docs`, `elysia-docs`, `trpc-docs`, `nitro-docs`, `expo-docs`, `bun-docs`, `deno-docs`

**Build & dev (7):**
`vite-docs`, `vitest-docs`, `turborepo-docs`, `storybook-docs`, `rspack-docs`, `wxt-docs`, `tauri-docs`

**Database & backend (7):**
`drizzle-docs`, `prisma-docs`, `neon-docs`, `supabase-docs`, `turso-docs`, `convex-docs`, `payload-docs`

**Auth & payments (3):**
`better-auth-docs`, `clerk-docs`, `stripe-docs`

**UI & styling (3):**
`shadcn-docs`, `mantine-docs`, `panda-css-docs`

**State & data (5):**
`tanstack-docs`, `zustand-docs`, `zod-docs`, `xstate-docs`, `effect-docs`

**AI & APIs (5):**
`langchain-docs`, `vercel-docs`, `livekit-docs`, `elevenlabs-docs`, `resend-docs`

---

## Decision Tree

```
Need docs for a specific framework/library with a dedicated tool?
  ├─ Check if it's one of the 46 docs tools listed above → use that tool
  ├─ Cloudflare product (Workers, KV, D1, R2, AI) → cloudflare-docs
  └─ Not listed above → context7 (works for ANY library)

Need npm package info, README, versions, or downloads?
  └─ npm

Need source code, directory listing, or releases from a GitHub repo?
  └─ github

Need to scrape or interact with a live web page?
  └─ browser/ scripts (start Chrome first with browser/start.js)

Which docs tool to use when there's overlap?
  ├─ For React → react-docs (dedicated, faster) over context7
  ├─ For Cloudflare Workers → cloudflare-docs (has product-specific search)
  └─ For anything without a dedicated tool → context7 (universal fallback)
```

---

## Browser Automation (CDP Scripts)

> **This is the ONLY part of @axiestudio/tool that requires a dependency.**
> The 50 core tool files are zero-dependency. Browser scripts are optional and need `puppeteer-core`.

### Dependency Installation

Browser tools connect to Chrome via the Chrome DevTools Protocol (CDP). They require:

1. **`puppeteer-core`** — a lightweight Chrome controller (~2 MB, no bundled Chromium)
2. **Google Chrome** — already installed on most machines

Install `puppeteer-core` with your package manager:

```bash
# Pick one:
npm install puppeteer-core
bun add puppeteer-core
pnpm add puppeteer-core
yarn add puppeteer-core
```

That's it. No other dependencies. If Chrome is not found, the scripts will print a helpful error message.

### Available Scripts

```bash
node browser/start.js                          # Launch Chrome on :9222
node browser/nav.js https://example.com        # Navigate
node browser/eval.js 'document.title'          # Execute JS
node browser/screenshot.js                     # Screenshot → temp PNG path
node browser/get-text.js '#main'               # Readable text from selector
node browser/wait.js '.loaded' 10              # Wait for selector (seconds)
node browser/scroll.js bottom --wait 2         # Scroll to bottom, wait
node browser/links.js --json                   # Extract all links
node browser/fill.js '#email' user@example.com # Fill form field
node browser/cookies.js --curl                 # Export cookies
node browser/pick.js "Click the submit button" # Interactive DOM picker
```

### Workflow

1. Start Chrome: `node browser/start.js`
2. Navigate: `node browser/nav.js https://example.com`
3. Interact: `node browser/get-text.js '#main'` / `node browser/screenshot.js` / etc.
4. Chrome stays open between commands — no restart needed.

---

## Rules for AI Agents

1. **Don't fetch docs you already have.** If a previous tool call or file read answers the question, skip the tool call.
2. **Context7 always needs two calls.** `resolve-library-id` first, then `get-library-docs`. Never skip the resolve step. Cache the ID within a session.
3. **Prefer dedicated docs tools over context7** when one exists (e.g. use `react-docs` for React, not `context7`).
4. **All 46 docs tools have the same 3 commands.** `get-index`, `get-page`, `search-docs` — the interface is identical. Only the import path changes.
5. **All tools return structured data.** Parse the return value. Don't scrape stdout.
6. **`cloudflare-docs` is different from the 46 docs tools.** It uses `list-products` + `get-product-index` instead of `get-index`, and its `search-docs` takes a `product` parameter.
7. **Browser tools need Chrome running.** Always run `browser/start.js` first.
8. **Zero dependencies.** Core tools work with Node 18+, Bun 1.0+, or Deno. No npm install required for the 50 `.js` files.
