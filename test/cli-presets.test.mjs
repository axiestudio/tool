import assert from "node:assert/strict";
import test from "node:test";

import { CUSTOM_PRESET_VALUE, getParamPresets, getToolTemplates } from "../bin/cli-presets.js";

test("cloudflare get-page path presets keep custom input available", () => {
  const presets = getParamPresets("cloudflare-docs", "get-page", "path");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "/workers/"));
  assert.ok(presets.some((preset) => preset.value === "/workers/runtime-apis/kv/"));
  assert.ok(presets.some((preset) => preset.value === "/agents/"));
  assert.ok(presets.some((preset) => preset.value === "/tunnel/"));
  assert.ok(presets.some((preset) => preset.value === "/workers/runtime-apis/bindings/service-bindings/rpc/"));
  assert.ok(presets.some((preset) => preset.value === "/workers/vite-plugin/"));
});

test("cloudflare product presets cover common developer products", () => {
  const presets = getParamPresets("cloudflare-docs", "search-docs", "product");

  assert.ok(presets.some((preset) => preset.value === "workers"));
  assert.ok(presets.some((preset) => preset.value === "d1"));
  assert.ok(presets.some((preset) => preset.value === "workers-ai"));
  assert.ok(presets.some((preset) => preset.value === "agents"));
});

test("context7 resolve-library-id presets include custom input and common libraries", () => {
  const presets = getParamPresets("context7", "resolve-library-id", "libraryName");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "next.js"));
  assert.ok(presets.some((preset) => preset.value === "better-auth"));
  assert.ok(presets.some((preset) => preset.value === "assistant-ui"));
  assert.ok(presets.some((preset) => preset.value === "cloudflare workers"));
});

test("context7 get-library-docs presets include direct library IDs and topic shortcuts", () => {
  const libraryPresets = getParamPresets("context7", "get-library-docs", "libraryId");
  const topicPresets = getParamPresets("context7", "get-library-docs", "topic");

  assert.equal(libraryPresets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(libraryPresets.some((preset) => preset.value === "/vercel/next.js"));
  assert.ok(libraryPresets.some((preset) => preset.value === "/reactjs/react.dev"));
  assert.ok(libraryPresets.some((preset) => preset.value === "/assistant-ui/assistant-ui"));
  assert.ok(libraryPresets.some((preset) => preset.value === "/better-auth/better-auth"));

  assert.equal(topicPresets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(topicPresets.some((preset) => preset.value === "routing"));
  assert.ok(topicPresets.some((preset) => preset.value === "middleware"));
  assert.ok(topicPresets.some((preset) => preset.value === "hooks"));
  assert.ok(topicPresets.some((preset) => preset.value === "tool calling"));
});

test("commands without curated presets return an empty list", () => {
  const presets = getParamPresets("cloudflare-docs", "search-docs", "query");

  assert.deepEqual(presets, []);
});

test("cloudflare templates include direct developer shortcuts", () => {
  const templates = getToolTemplates("cloudflare-docs");

  assert.ok(templates.some((template) =>
    template.label === "Workers KV binding docs"
    && template.commandName === "get-page"
    && template.values.path === "/workers/runtime-apis/kv/",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search D1 migrations"
    && template.commandName === "search-docs"
    && template.values.product === "d1"
    && template.values.query === "migrations",
  ));

  assert.ok(templates.some((template) =>
    template.label === "AI: Agents quick start"
    && template.commandName === "get-page"
    && template.values.path === "/agents/getting-started/quick-start/",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Zero Trust: Tunnel overview"
    && template.commandName === "get-page"
    && template.values.path === "/tunnel/",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Workers: Service bindings RPC"
    && template.commandName === "get-page"
    && template.values.path === "/workers/runtime-apis/bindings/service-bindings/rpc/",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search Agents human in the loop"
    && template.commandName === "search-docs"
    && template.values.product === "agents"
    && template.values.query === "human in the loop",
  ));
});

test("context7 templates include high-signal library workflows", () => {
  const templates = getToolTemplates("context7");

  assert.ok(templates.some((template) =>
    template.label === "Resolve Next.js library ID"
    && template.commandName === "resolve-library-id"
    && template.values.libraryName === "next.js"
    && template.values.query === "next.js app router official docs",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Next.js routing docs"
    && template.commandName === "get-library-docs"
    && template.values.libraryId === "/vercel/next.js"
    && template.values.topic === "routing",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Assistant UI thread docs"
    && template.commandName === "get-library-docs"
    && template.values.libraryId === "/assistant-ui/assistant-ui"
    && template.values.topic === "thread",
  ));

  assert.ok(templates.some((template) =>
    template.label === "AI SDK tool calling docs"
    && template.commandName === "get-library-docs"
    && template.values.libraryId === "/websites/ai-sdk_dev"
    && template.values.topic === "tool calling",
  ));
});

test("non-cloudflare tools do not expose command templates yet", () => {
  const astroTemplates = getToolTemplates("astro-docs");

  assert.ok(astroTemplates.some((template) =>
    template.label === "Phase 1: Content collections"
    && template.commandName === "get-page"
    && template.values.path === "/en/guides/content-collections/",
  ));

  assert.ok(astroTemplates.some((template) =>
    template.label === "Phase 2: Deploy to Cloudflare"
    && template.commandName === "get-page"
    && template.values.path === "/en/guides/deploy/cloudflare/",
  ));

  assert.ok(astroTemplates.some((template) =>
    template.label === "Phase 3: CMS guides"
    && template.commandName === "get-page"
    && template.values.path === "/en/guides/cms/",
  ));
});

test("astro get-page presets include custom input and core guides", () => {
  const presets = getParamPresets("astro-docs", "get-page", "path");

  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "/en/guides/content-collections/"));
  assert.ok(presets.some((preset) => preset.value === "/en/guides/server-islands/"));
  assert.ok(presets.some((preset) => preset.value === "/en/guides/deploy/cloudflare/"));
});

test("astro search templates cover phase-specific developer tasks", () => {
  const astroTemplates = getToolTemplates("astro-docs");

  assert.ok(astroTemplates.some((template) =>
    template.label === "Phase 2: Search server output"
    && template.commandName === "search-docs"
    && template.values.query === "server output",
  ));

  assert.ok(astroTemplates.some((template) =>
    template.label === "Phase 3: Search blog patterns"
    && template.commandName === "search-docs"
    && template.values.query === "build a blog",
  ));
});

test("better-auth get-page presets include phased core, plugin, and enterprise docs", () => {
  const presets = getParamPresets("better-auth-docs", "get-page", "path");

  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "/docs/installation"));
  assert.ok(presets.some((preset) => preset.value === "/docs/concepts/session-management"));
  assert.ok(presets.some((preset) => preset.value === "/docs/plugins/organization"));
  assert.ok(presets.some((preset) => preset.value === "/docs/plugins/magic-link"));
  assert.ok(presets.some((preset) => preset.value === "/docs/plugins/stripe"));
  assert.ok(presets.some((preset) => preset.value === "/docs/infrastructure/introduction"));
});

test("better-auth templates cover phase 1 core, phase 2 plugins, and phase 3 enterprise flows", () => {
  const templates = getToolTemplates("better-auth-docs");

  assert.ok(templates.some((template) =>
    template.label === "Phase 1: Installation"
    && template.commandName === "get-page"
    && template.values.path === "/docs/installation",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Phase 2: Organization"
    && template.commandName === "get-page"
    && template.values.path === "/docs/plugins/organization",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Phase 2: Magic link"
    && template.commandName === "get-page"
    && template.values.path === "/docs/plugins/magic-link",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Phase 3: Stripe"
    && template.commandName === "get-page"
    && template.values.path === "/docs/plugins/stripe",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Phase 3: Search enterprise billing"
    && template.commandName === "search-docs"
    && template.values.query === "subscriptions payments billing",
  ));
});

// ─── npm presets ──────────────────────────────────────────────────────────────

test("npm package presets have custom input first and include key packages", () => {
  const presets = getParamPresets("npm", "get-readme", "packageName");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((p) => p.value === "hono"));
  assert.ok(presets.some((p) => p.value === "drizzle-orm"));
  assert.ok(presets.some((p) => p.value === "better-auth"));
  assert.ok(presets.some((p) => p.value === "@ai-sdk/openai"));
  assert.ok(presets.some((p) => p.value === "@assistant-ui/react"));
  assert.ok(presets.some((p) => p.value === "zustand"));
  assert.ok(presets.some((p) => p.value === "wrangler"));
  assert.ok(presets.some((p) => p.value === "@livekit/components-react"));
});

test("npm package presets are shared across all npm param registrations", () => {
  const readme = getParamPresets("npm", "get-readme", "packageName");
  const info = getParamPresets("npm", "get-package-info", "packageName");
  const versions = getParamPresets("npm", "get-versions", "packageName");
  const downloads = getParamPresets("npm", "get-downloads", "packageName");
  const deps = getParamPresets("npm", "get-dependencies", "packageName");

  // All should return the same set of values
  assert.equal(readme.length, info.length);
  assert.equal(readme.length, versions.length);
  assert.equal(readme.length, downloads.length);
  assert.equal(readme.length, deps.length);
});

test("npm search presets include common queries", () => {
  const presets = getParamPresets("npm", "search", "query");

  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((p) => p.value === "hono middleware"));
  assert.ok(presets.some((p) => p.value === "astro integration"));
  assert.ok(presets.some((p) => p.value === "react state management"));
  assert.ok(presets.some((p) => p.value === "ai sdk provider"));
  assert.ok(presets.some((p) => p.value === "cloudflare worker"));
  assert.ok(presets.some((p) => p.value === "testing library react"));
});

test("npm templates contain essential shortcuts", () => {
  const templates = getToolTemplates("npm");

  assert.ok(templates.length >= 12);

  assert.ok(templates.some((t) =>
    t.label === "Get Hono README"
    && t.commandName === "get-readme"
    && t.values.packageName === "hono",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get Better Auth package info"
    && t.commandName === "get-package-info"
    && t.values.packageName === "better-auth",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get hono downloads"
    && t.commandName === "get-downloads"
    && t.values.packageName === "hono",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get @ai-sdk/openai dependencies"
    && t.commandName === "get-dependencies"
    && t.values.packageName === "@ai-sdk/openai",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Search AI SDK providers"
    && t.commandName === "search"
    && t.values.query === "ai sdk provider",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get wrangler README"
    && t.commandName === "get-readme"
    && t.values.packageName === "wrangler",
  ));
});

// ─── livekit-docs presets ─────────────────────────────────────────────────────

test("livekit get-page path presets have custom input first and include key paths", () => {
  const presets = getParamPresets("livekit-docs", "get-page", "path");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "/agents/overview"));
  assert.ok(presets.some((preset) => preset.value === "/agents/voice-pipeline-agent"));
  assert.ok(presets.some((preset) => preset.value === "/realtime/rooms"));
  assert.ok(presets.some((preset) => preset.value === "/realtime/tracks"));
  assert.ok(presets.some((preset) => preset.value === "/sdk/js/react/components"));
  assert.ok(presets.some((preset) => preset.value === "/reference/server/token-generation"));
  assert.ok(presets.some((preset) => preset.value === "/home/get-started"));
  assert.ok(presets.some((preset) => preset.value === "/agents/multimodal-agent"));
});

test("livekit search-docs query presets include common queries", () => {
  const presets = getParamPresets("livekit-docs", "search-docs", "query");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "voice agent"));
  assert.ok(presets.some((preset) => preset.value === "rooms"));
  assert.ok(presets.some((preset) => preset.value === "tracks"));
  assert.ok(presets.some((preset) => preset.value === "token generation"));
  assert.ok(presets.some((preset) => preset.value === "react components"));
  assert.ok(presets.some((preset) => preset.value === "multimodal agent"));
  assert.ok(presets.some((preset) => preset.value === "deployment"));
  assert.ok(presets.some((preset) => preset.value === "self-hosting"));
  assert.ok(presets.some((preset) => preset.value === "plugins"));
  assert.ok(presets.some((preset) => preset.value === "data messages"));
});

test("livekit templates contain essential developer shortcuts", () => {
  const templates = getToolTemplates("livekit-docs");

  assert.ok(templates.length >= 12, `Expected at least 12 templates, got ${templates.length}`);

  assert.ok(templates.some((template) =>
    template.label === "Voice pipeline agent"
    && template.commandName === "get-page"
    && template.values.path === "/agents/voice-pipeline-agent",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Realtime rooms"
    && template.commandName === "get-page"
    && template.values.path === "/realtime/rooms",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Token generation"
    && template.commandName === "get-page"
    && template.values.path === "/reference/server/token-generation",
  ));

  assert.ok(templates.some((template) =>
    template.label === "React SDK components"
    && template.commandName === "get-page"
    && template.values.path === "/sdk/js/react/components",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search voice agent"
    && template.commandName === "search-docs"
    && template.values.query === "voice agent",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search token generation"
    && template.commandName === "search-docs"
    && template.values.query === "token generation",
  ));
});

// ─── AR docs presets ──────────────────────────────────────────────────────────

test("ar-android-docs presets and templates include key Android AR workflows", () => {
  const pathPresets = getParamPresets("ar-android-docs", "get-page", "path");
  const queryPresets = getParamPresets("ar-android-docs", "search-docs", "query");
  const templates = getToolTemplates("ar-android-docs");

  assert.ok(Array.isArray(pathPresets));
  assert.equal(pathPresets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(pathPresets.some((preset) => preset.value === "/ar/develop/scene-viewer"));
  assert.ok(pathPresets.some((preset) => preset.value === "/ar/develop/runtime"));
  assert.ok(pathPresets.some((preset) => preset.value === "/ar/develop/webxr/model-viewer"));
  assert.ok(pathPresets.some((preset) => preset.value === "/ar/discover/supported-devices"));

  assert.ok(Array.isArray(queryPresets));
  assert.equal(queryPresets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(queryPresets.some((preset) => preset.value === "ar_only intent"));
  assert.ok(queryPresets.some((preset) => preset.value === "model-viewer"));
  assert.ok(queryPresets.some((preset) => preset.value === "supported devices"));

  assert.ok(templates.some((template) =>
    template.label === "Scene Viewer guide"
    && template.commandName === "get-page"
    && template.values.path === "/ar/develop/scene-viewer",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search AR-only intent"
    && template.commandName === "search-docs"
    && template.values.query === "ar_only intent",
  ));
});

test("ar-ios-docs presets and templates include key ARKit workflows", () => {
  const pathPresets = getParamPresets("ar-ios-docs", "get-page", "path");
  const queryPresets = getParamPresets("ar-ios-docs", "search-docs", "query");
  const templates = getToolTemplates("ar-ios-docs");

  assert.ok(Array.isArray(pathPresets));
  assert.equal(pathPresets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(pathPresets.some((preset) => preset.value === "/documentation/arkit"));
  assert.ok(pathPresets.some((preset) => preset.value === "/documentation/arkit/arsession"));
  assert.ok(pathPresets.some((preset) => preset.value === "/documentation/arkit/arkit_in_ios/content_anchors"));

  assert.ok(Array.isArray(queryPresets));
  assert.equal(queryPresets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(queryPresets.some((preset) => preset.value === "ARSession lifecycle"));
  assert.ok(queryPresets.some((preset) => preset.value === "world tracking"));
  assert.ok(queryPresets.some((preset) => preset.value === "device support"));

  assert.ok(templates.some((template) =>
    template.label === "ARKit root"
    && template.commandName === "get-page"
    && template.values.path === "/documentation/arkit",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search ARSession lifecycle"
    && template.commandName === "search-docs"
    && template.values.query === "ARSession lifecycle",
  ));
});

// ─── Drizzle presets ─────────────────────────────────────────────

test("drizzle get-page path presets include custom input first and key doc paths", () => {
  const presets = getParamPresets("drizzle-docs", "get-page", "path");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "/docs/select"));
  assert.ok(presets.some((preset) => preset.value === "/docs/relations"));
  assert.ok(presets.some((preset) => preset.value === "/docs/migrations"));
  assert.ok(presets.some((preset) => preset.value === "/docs/rls"));
  assert.ok(presets.some((preset) => preset.value === "/docs/joins"));
  assert.ok(presets.some((preset) => preset.value === "/docs/connect-neon"));
  assert.ok(presets.some((preset) => preset.value === "/docs/schemas"));
  assert.ok(presets.some((preset) => preset.value === "/docs/transactions"));
});

test("drizzle search-docs query presets include common search topics", () => {
  const presets = getParamPresets("drizzle-docs", "search-docs", "query");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((preset) => preset.value === "select query"));
  assert.ok(presets.some((preset) => preset.value === "relations"));
  assert.ok(presets.some((preset) => preset.value === "migrations"));
  assert.ok(presets.some((preset) => preset.value === "row level security"));
  assert.ok(presets.some((preset) => preset.value === "neon serverless"));
  assert.ok(presets.some((preset) => preset.value === "joins"));
  assert.ok(presets.some((preset) => preset.value === "transactions"));
});

test("drizzle templates include get-page and search-docs shortcuts", () => {
  const templates = getToolTemplates("drizzle-docs");

  assert.ok(templates.length >= 12, "Should have at least 12 templates");

  assert.ok(templates.some((template) =>
    template.label === "SELECT queries"
    && template.commandName === "get-page"
    && template.values.path === "/docs/select",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Relations"
    && template.commandName === "get-page"
    && template.values.path === "/docs/relations",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Migrations"
    && template.commandName === "get-page"
    && template.values.path === "/docs/migrations",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Connect Neon"
    && template.commandName === "get-page"
    && template.values.path === "/docs/connect-neon",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search relations"
    && template.commandName === "search-docs"
    && template.values.query === "relations",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search row-level security"
    && template.commandName === "search-docs"
    && template.values.query === "row level security",
  ));

  assert.ok(templates.some((template) =>
    template.label === "Search Neon serverless"
    && template.commandName === "search-docs"
    && template.values.query === "neon serverless",
  ));
});

// ─── GitHub presets ──────────────────────────────────────────────

test("github owner presets include key owners from the ecosystem", () => {
  const presets = getParamPresets("github", "get-file", "owner");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((p) => p.value === "honojs"));
  assert.ok(presets.some((p) => p.value === "vercel"));
  assert.ok(presets.some((p) => p.value === "better-auth"));
  assert.ok(presets.some((p) => p.value === "drizzle-team"));
  assert.ok(presets.some((p) => p.value === "cloudflare"));
  assert.ok(presets.some((p) => p.value === "tanstack"));
  assert.ok(presets.some((p) => p.value === "microsoft"));
  assert.ok(presets.some((p) => p.value === "vitest-dev"));
  assert.ok(presets.some((p) => p.value === "assistant-ui"));
});

test("github owner presets are shared across get-file, list-dir, get-releases, get-repo-info", () => {
  const forFile = getParamPresets("github", "get-file", "owner");
  const forDir = getParamPresets("github", "list-dir", "owner");
  const forRel = getParamPresets("github", "get-releases", "owner");
  const forInfo = getParamPresets("github", "get-repo-info", "owner");
  const forCmp = getParamPresets("github", "compare-tags", "owner");

  assert.ok(forFile.length > 0);
  assert.deepEqual(forFile.map((p) => p.value), forDir.map((p) => p.value));
  assert.deepEqual(forFile.map((p) => p.value), forRel.map((p) => p.value));
  assert.deepEqual(forFile.map((p) => p.value), forInfo.map((p) => p.value));
  assert.deepEqual(forFile.map((p) => p.value), forCmp.map((p) => p.value));
});

test("github path presets include README.md, package.json, src/index.ts", () => {
  const presets = getParamPresets("github", "get-file", "path");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((p) => p.value === "README.md"));
  assert.ok(presets.some((p) => p.value === "package.json"));
  assert.ok(presets.some((p) => p.value === "src/index.ts"));
  assert.ok(presets.some((p) => p.value === "tsconfig.json"));
  assert.ok(presets.some((p) => p.value === "CHANGELOG.md"));
  assert.ok(presets.some((p) => p.value === "LICENSE"));
});

test("github search presets exist and include common queries", () => {
  const presets = getParamPresets("github", "search-code", "query");

  assert.ok(Array.isArray(presets));
  assert.equal(presets[0]?.value, CUSTOM_PRESET_VALUE);
  assert.ok(presets.some((p) => p.value === "DurableObject"));
  assert.ok(presets.some((p) => p.value === "useAgentChat"));
  assert.ok(presets.some((p) => p.value === "Hono middleware"));
});

test("github templates include essential shortcuts", () => {
  const templates = getToolTemplates("github");

  assert.ok(templates.length >= 12, `Expected at least 12 templates, got ${templates.length}`);

  assert.ok(templates.some((t) =>
    t.label === "Read Hono README"
    && t.commandName === "get-file"
    && t.values.owner === "honojs"
    && t.values.repo === "hono"
    && t.values.path === "README.md",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Read AI SDK package.json"
    && t.commandName === "get-file"
    && t.values.owner === "vercel"
    && t.values.repo === "ai",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Browse Better Auth source"
    && t.commandName === "list-dir"
    && t.values.owner === "better-auth",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get drizzle-orm releases"
    && t.commandName === "get-releases"
    && t.values.owner === "drizzle-team",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get Next.js releases"
    && t.commandName === "get-releases"
    && t.values.owner === "vercel",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Search DurableObject implementations"
    && t.commandName === "search-code",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Get hono/agents repo info"
    && t.commandName === "get-repo-info",
  ));

  assert.ok(templates.some((t) =>
    t.label === "Compare Hono releases"
    && t.commandName === "compare-tags"
    && t.values.owner === "honojs",
  ));
});