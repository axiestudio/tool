export const CUSTOM_PRESET_VALUE = "__custom__";

const createCustomPreset = (description) => ({
  label: "Type custom value...",
  description,
  value: CUSTOM_PRESET_VALUE,
});

const cloudflareProductPresets = [
  createCustomPreset("Enter any Cloudflare product slug"),
  { label: "Workers", description: "Serverless apps and APIs", value: "workers" },
  { label: "Pages", description: "Full-stack apps on the edge", value: "pages" },
  { label: "R2", description: "Object storage without egress fees", value: "r2" },
  { label: "KV", description: "Global low-latency key-value storage", value: "kv" },
  { label: "D1", description: "Serverless SQL database", value: "d1" },
  { label: "Durable Objects", description: "Stateful compute primitives", value: "durable-objects" },
  { label: "Queues", description: "Reliable background messaging", value: "queues" },
  { label: "Workflows", description: "Durable orchestration and retries", value: "workflows" },
  { label: "Vectorize", description: "Vector database for semantic search", value: "vectorize" },
  { label: "Hyperdrive", description: "Accelerated database connectivity", value: "hyperdrive" },
  { label: "Workers AI", description: "Run AI models on Cloudflare", value: "workers-ai" },
  { label: "AI Gateway", description: "Observe and control AI traffic", value: "ai-gateway" },
  { label: "AI Search", description: "Search experiences with AI-native retrieval", value: "ai-search" },
  { label: "AI Crawl Control", description: "Control how AI crawlers access your content", value: "ai-crawl-control" },
  { label: "Agents", description: "Build stateful AI agents", value: "agents" },
  { label: "Browser Rendering", description: "Control headless browsers", value: "browser-rendering" },
  { label: "Cloudflare One", description: "Zero Trust platform docs", value: "cloudflare-one" },
  { label: "Tunnel", description: "Expose private services securely", value: "tunnel" },
  { label: "Fundamentals", description: "Core Cloudflare concepts", value: "fundamentals" },
];

const cloudflarePathPresets = [
  createCustomPreset("Enter any path from developers.cloudflare.com"),
  { label: "Docs directory", description: "/directory/", value: "/directory/" },
  { label: "Workers overview", description: "/workers/", value: "/workers/" },
  { label: "Workers getting started", description: "/workers/get-started/guide/", value: "/workers/get-started/guide/" },
  { label: "Workers runtime APIs", description: "/workers/runtime-apis/", value: "/workers/runtime-apis/" },
  { label: "Workers fetch API", description: "/workers/runtime-apis/fetch/", value: "/workers/runtime-apis/fetch/" },
  { label: "Workers KV binding", description: "/workers/runtime-apis/kv/", value: "/workers/runtime-apis/kv/" },
  { label: "Workers service bindings RPC", description: "/workers/runtime-apis/bindings/service-bindings/rpc/", value: "/workers/runtime-apis/bindings/service-bindings/rpc/" },
  { label: "Workers env vars", description: "/workers/configuration/environment-variables/", value: "/workers/configuration/environment-variables/" },
  { label: "Workers Vitest integration", description: "/workers/testing/vitest-integration/", value: "/workers/testing/vitest-integration/" },
  { label: "Workers Vite plugin", description: "/workers/vite-plugin/", value: "/workers/vite-plugin/" },
  { label: "Workers Hono guide", description: "/workers/framework-guides/apis/hono/", value: "/workers/framework-guides/apis/hono/" },
  { label: "Pages overview", description: "/pages/", value: "/pages/" },
  { label: "R2 overview", description: "/r2/", value: "/r2/" },
  { label: "KV overview", description: "/kv/", value: "/kv/" },
  { label: "D1 overview", description: "/d1/", value: "/d1/" },
  { label: "D1 getting started", description: "/d1/get-started/", value: "/d1/get-started/" },
  { label: "D1 query patterns", description: "/d1/best-practices/query-d1/", value: "/d1/best-practices/query-d1/" },
  { label: "D1 migrations", description: "/d1/reference/migrations/", value: "/d1/reference/migrations/" },
  { label: "Durable Objects overview", description: "/durable-objects/", value: "/durable-objects/" },
  { label: "Queues overview", description: "/queues/", value: "/queues/" },
  { label: "Workers AI overview", description: "/workers-ai/", value: "/workers-ai/" },
  { label: "AI Gateway overview", description: "/ai-gateway/", value: "/ai-gateway/" },
  { label: "Agents overview", description: "/agents/", value: "/agents/" },
  { label: "Agents quick start", description: "/agents/getting-started/quick-start/", value: "/agents/getting-started/quick-start/" },
  { label: "Agents MCP portal", description: "/agents/model-context-protocol/mcp-portal/", value: "/agents/model-context-protocol/mcp-portal/" },
  { label: "AI Search overview", description: "/ai-search/", value: "/ai-search/" },
  { label: "Browser Rendering overview", description: "/browser-rendering/", value: "/browser-rendering/" },
  { label: "Cloudflare One overview", description: "/cloudflare-one/", value: "/cloudflare-one/" },
  { label: "Cloudflare One access policies", description: "/cloudflare-one/access-controls/policies/", value: "/cloudflare-one/access-controls/policies/" },
  { label: "Tunnel overview", description: "/tunnel/", value: "/tunnel/" },
  { label: "API reference", description: "/api/", value: "/api/" },
  { label: "Fundamentals", description: "/fundamentals/", value: "/fundamentals/" },
];

const cloudflareTemplates = [
  {
    label: "Developer platform: Workers docs index",
    description: "Browse the full Workers docs index",
    commandName: "get-product-index",
    values: { product: "workers" },
  },
  {
    label: "Featured: Docs directory",
    description: "Open Cloudflare's product directory",
    commandName: "get-page",
    values: { path: "/directory/" },
  },
  {
    label: "Developer platform: Workers quick start",
    description: "Open /workers/get-started/guide/",
    commandName: "get-page",
    values: { path: "/workers/get-started/guide/" },
  },
  {
    label: "Workers KV binding docs",
    description: "Open /workers/runtime-apis/kv/",
    commandName: "get-page",
    values: { path: "/workers/runtime-apis/kv/" },
  },
  {
    label: "Workers: Fetch API",
    description: "Open /workers/runtime-apis/fetch/",
    commandName: "get-page",
    values: { path: "/workers/runtime-apis/fetch/" },
  },
  {
    label: "Workers: Service bindings RPC",
    description: "Open /workers/runtime-apis/bindings/service-bindings/rpc/",
    commandName: "get-page",
    values: { path: "/workers/runtime-apis/bindings/service-bindings/rpc/" },
  },
  {
    label: "Workers: Env vars",
    description: "Open /workers/configuration/environment-variables/",
    commandName: "get-page",
    values: { path: "/workers/configuration/environment-variables/" },
  },
  {
    label: "Workers: Vite plugin",
    description: "Open /workers/vite-plugin/",
    commandName: "get-page",
    values: { path: "/workers/vite-plugin/" },
  },
  {
    label: "Workers: Hono guide",
    description: "Open /workers/framework-guides/apis/hono/",
    commandName: "get-page",
    values: { path: "/workers/framework-guides/apis/hono/" },
  },
  {
    label: "Developer platform: Durable Objects overview",
    description: "Open /durable-objects/",
    commandName: "get-page",
    values: { path: "/durable-objects/" },
  },
  {
    label: "Developer platform: D1 Worker API",
    description: "Open /d1/worker-api/",
    commandName: "get-page",
    values: { path: "/d1/worker-api/" },
  },
  {
    label: "Developer platform: D1 local development",
    description: "Open /d1/best-practices/local-development/",
    commandName: "get-page",
    values: { path: "/d1/best-practices/local-development/" },
  },
  {
    label: "Developer platform: D1 query patterns",
    description: "Open /d1/best-practices/query-d1/",
    commandName: "get-page",
    values: { path: "/d1/best-practices/query-d1/" },
  },
  {
    label: "Search Workers bindings",
    description: "Search Workers docs for bindings",
    commandName: "search-docs",
    values: { product: "workers", query: "bindings" },
  },
  {
    label: "Search Workers Vitest integration",
    description: "Search Workers docs for Vitest integration guidance",
    commandName: "search-docs",
    values: { product: "workers", query: "vitest integration" },
  },
  {
    label: "Search D1 migrations",
    description: "Search D1 docs for migrations",
    commandName: "search-docs",
    values: { product: "d1", query: "migrations" },
  },
  {
    label: "AI: Agents overview",
    description: "Open /agents/",
    commandName: "get-page",
    values: { path: "/agents/" },
  },
  {
    label: "AI: Agents quick start",
    description: "Open /agents/getting-started/quick-start/",
    commandName: "get-page",
    values: { path: "/agents/getting-started/quick-start/" },
  },
  {
    label: "AI: Agents MCP portal",
    description: "Open /agents/model-context-protocol/mcp-portal/",
    commandName: "get-page",
    values: { path: "/agents/model-context-protocol/mcp-portal/" },
  },
  {
    label: "Search Agents human in the loop",
    description: "Search Agents docs for human in the loop patterns",
    commandName: "search-docs",
    values: { product: "agents", query: "human in the loop" },
  },
  {
    label: "AI: Workers AI overview",
    description: "Open /workers-ai/",
    commandName: "get-page",
    values: { path: "/workers-ai/" },
  },
  {
    label: "AI: AI Gateway overview",
    description: "Open /ai-gateway/",
    commandName: "get-page",
    values: { path: "/ai-gateway/" },
  },
  {
    label: "AI: AI Search overview",
    description: "Open /ai-search/",
    commandName: "get-page",
    values: { path: "/ai-search/" },
  },
  {
    label: "Zero Trust: Tunnel overview",
    description: "Open /tunnel/",
    commandName: "get-page",
    values: { path: "/tunnel/" },
  },
  {
    label: "Zero Trust: Access policies",
    description: "Open /cloudflare-one/access-controls/policies/",
    commandName: "get-page",
    values: { path: "/cloudflare-one/access-controls/policies/" },
  },
];

const astroPathPresets = [
  createCustomPreset("Enter any Astro docs path"),
  { label: "Phase 1: Content collections", description: "/en/guides/content-collections/", value: "/en/guides/content-collections/" },
  { label: "Phase 1: Server islands", description: "/en/guides/server-islands/", value: "/en/guides/server-islands/" },
  { label: "Phase 1: Framework components", description: "/en/guides/framework-components/", value: "/en/guides/framework-components/" },
  { label: "Phase 1: Integrations", description: "/en/guides/integrations/", value: "/en/guides/integrations/" },
  { label: "Phase 1: Middleware", description: "/en/guides/middleware/", value: "/en/guides/middleware/" },
  { label: "Phase 1: Actions", description: "/en/guides/actions/", value: "/en/guides/actions/" },
  { label: "Phase 1: On-demand rendering", description: "/en/guides/on-demand-rendering/", value: "/en/guides/on-demand-rendering/" },
  { label: "Phase 2: Deployment guides", description: "/en/guides/deploy/", value: "/en/guides/deploy/" },
  { label: "Phase 2: Deploy to Cloudflare", description: "/en/guides/deploy/cloudflare/", value: "/en/guides/deploy/cloudflare/" },
  { label: "Phase 3: CMS guides", description: "/en/guides/cms/", value: "/en/guides/cms/" },
];

const astroTemplates = [
  {
    label: "Phase 1: Content collections",
    description: "Open the core content collections guide",
    commandName: "get-page",
    values: { path: "/en/guides/content-collections/" },
  },
  {
    label: "Phase 1: Server islands",
    description: "Open Astro server islands guide",
    commandName: "get-page",
    values: { path: "/en/guides/server-islands/" },
  },
  {
    label: "Phase 1: Framework components",
    description: "Open front-end framework integration guide",
    commandName: "get-page",
    values: { path: "/en/guides/framework-components/" },
  },
  {
    label: "Phase 1: Integrations",
    description: "Open working with integrations guide",
    commandName: "get-page",
    values: { path: "/en/guides/integrations/" },
  },
  {
    label: "Phase 1: Middleware",
    description: "Open middleware guide",
    commandName: "get-page",
    values: { path: "/en/guides/middleware/" },
  },
  {
    label: "Phase 1: Actions",
    description: "Open Astro actions guide",
    commandName: "get-page",
    values: { path: "/en/guides/actions/" },
  },
  {
    label: "Phase 1: On-demand rendering",
    description: "Open SSR and on-demand rendering guide",
    commandName: "get-page",
    values: { path: "/en/guides/on-demand-rendering/" },
  },
  {
    label: "Phase 2: Deployment guides",
    description: "Open Astro deployment guide index",
    commandName: "get-page",
    values: { path: "/en/guides/deploy/" },
  },
  {
    label: "Phase 2: Deploy to Cloudflare",
    description: "Open Astro Cloudflare deployment guide",
    commandName: "get-page",
    values: { path: "/en/guides/deploy/cloudflare/" },
  },
  {
    label: "Phase 2: Search server output",
    description: "Search Astro docs for server output guidance",
    commandName: "search-docs",
    values: { query: "server output" },
  },
  {
    label: "Phase 2: Search adapters",
    description: "Search Astro docs for SSR adapters",
    commandName: "search-docs",
    values: { query: "adapter" },
  },
  {
    label: "Phase 3: Search content layer API",
    description: "Search Astro docs for content layer details",
    commandName: "search-docs",
    values: { query: "content layer API" },
  },
  {
    label: "Phase 3: CMS guides",
    description: "Open Astro CMS guide index",
    commandName: "get-page",
    values: { path: "/en/guides/cms/" },
  },
  {
    label: "Phase 3: Search blog patterns",
    description: "Search Astro docs for blog and docs patterns",
    commandName: "search-docs",
    values: { query: "build a blog" },
  },
];

const betterAuthPathPresets = [
  createCustomPreset("Enter any Better Auth docs path"),
  { label: "Phase 1: Installation", description: "/docs/installation", value: "/docs/installation" },
  { label: "Phase 1: Client", description: "/docs/concepts/client", value: "/docs/concepts/client" },
  { label: "Phase 1: Session management", description: "/docs/concepts/session-management", value: "/docs/concepts/session-management" },
  { label: "Phase 1: Email", description: "/docs/concepts/email", value: "/docs/concepts/email" },
  { label: "Phase 1: Email & password", description: "/docs/authentication/email-password", value: "/docs/authentication/email-password" },
  { label: "Phase 1: OAuth", description: "/docs/concepts/oauth", value: "/docs/concepts/oauth" },
  { label: "Phase 2: Plugin catalog", description: "/docs/plugins", value: "/docs/plugins" },
  { label: "Phase 2: Organization", description: "/docs/plugins/organization", value: "/docs/plugins/organization" },
  { label: "Phase 2: Passkey", description: "/docs/plugins/passkey", value: "/docs/plugins/passkey" },
  { label: "Phase 2: Magic link", description: "/docs/plugins/magic-link", value: "/docs/plugins/magic-link" },
  { label: "Phase 2: API key", description: "/docs/plugins/api-key", value: "/docs/plugins/api-key" },
  { label: "Phase 2: API key advanced", description: "/docs/plugins/api-key/advanced", value: "/docs/plugins/api-key/advanced" },
  { label: "Phase 3: Infrastructure intro", description: "/docs/infrastructure/introduction", value: "/docs/infrastructure/introduction" },
  { label: "Phase 3: Infrastructure getting started", description: "/docs/infrastructure/getting-started", value: "/docs/infrastructure/getting-started" },
  { label: "Phase 3: Stripe", description: "/docs/plugins/stripe", value: "/docs/plugins/stripe" },
  { label: "Phase 3: SSO", description: "/docs/plugins/sso", value: "/docs/plugins/sso" },
  { label: "Phase 3: SCIM", description: "/docs/plugins/scim", value: "/docs/plugins/scim" },
  { label: "Phase 3: OIDC provider", description: "/docs/plugins/oidc-provider", value: "/docs/plugins/oidc-provider" },
];

const betterAuthTemplates = [
  {
    label: "Phase 1: Installation",
    description: "Open Better Auth installation guide",
    commandName: "get-page",
    values: { path: "/docs/installation" },
  },
  {
    label: "Phase 1: Client",
    description: "Open Better Auth client guide",
    commandName: "get-page",
    values: { path: "/docs/concepts/client" },
  },
  {
    label: "Phase 1: Session management",
    description: "Open session management guide",
    commandName: "get-page",
    values: { path: "/docs/concepts/session-management" },
  },
  {
    label: "Phase 1: Email & password",
    description: "Open email and password auth guide",
    commandName: "get-page",
    values: { path: "/docs/authentication/email-password" },
  },
  {
    label: "Phase 1: OAuth",
    description: "Open social OAuth guide",
    commandName: "get-page",
    values: { path: "/docs/concepts/oauth" },
  },
  {
    label: "Phase 2: Plugin catalog",
    description: "Browse Better Auth plugins",
    commandName: "get-page",
    values: { path: "/docs/plugins" },
  },
  {
    label: "Phase 2: Organization",
    description: "Open organization plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/organization" },
  },
  {
    label: "Phase 2: Passkey",
    description: "Open passkey plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/passkey" },
  },
  {
    label: "Phase 2: Magic link",
    description: "Open magic link plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/magic-link" },
  },
  {
    label: "Phase 2: API key",
    description: "Open API key plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/api-key" },
  },
  {
    label: "Phase 3: Infrastructure intro",
    description: "Open Better Auth Infrastructure overview",
    commandName: "get-page",
    values: { path: "/docs/infrastructure/introduction" },
  },
  {
    label: "Phase 3: Stripe",
    description: "Open Stripe billing plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/stripe" },
  },
  {
    label: "Phase 3: SSO",
    description: "Open SSO plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/sso" },
  },
  {
    label: "Phase 3: SCIM",
    description: "Open SCIM plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/scim" },
  },
  {
    label: "Phase 3: OIDC provider",
    description: "Open OIDC provider plugin docs",
    commandName: "get-page",
    values: { path: "/docs/plugins/oidc-provider" },
  },
  {
    label: "Phase 3: Search enterprise billing",
    description: "Search Better Auth docs for subscription and billing guidance",
    commandName: "search-docs",
    values: { query: "subscriptions payments billing" },
  },
];

const context7LibraryNamePresets = [
  createCustomPreset("Enter any library or framework name"),
  { label: "React", description: "Official React docs", value: "react" },
  { label: "Next.js", description: "Full-stack React framework", value: "next.js" },
  { label: "Hono", description: "Web framework for Workers, Bun, and Node", value: "hono" },
  { label: "Drizzle ORM", description: "Type-safe SQL ORM", value: "drizzle-orm" },
  { label: "Astro", description: "Content-driven web framework", value: "astro" },
  { label: "Better Auth", description: "TypeScript auth and authorization library", value: "better-auth" },
  { label: "AI SDK", description: "Vercel AI SDK docs", value: "ai sdk" },
  { label: "Assistant UI", description: "Chat UI components for React", value: "assistant-ui" },
  { label: "Zustand", description: "Lightweight React state management", value: "zustand" },
  { label: "TanStack Router", description: "Typesafe routing for React", value: "tanstack router" },
  { label: "Vitest", description: "Next-generation test runner", value: "vitest" },
  { label: "Playwright", description: "Browser automation and testing", value: "playwright" },
  { label: "Cloudflare Workers", description: "Cloudflare Workers platform docs", value: "cloudflare workers" },
];

const context7LibraryIdPresets = [
  createCustomPreset("Enter any Context7 library ID"),
  { label: "React", description: "/reactjs/react.dev", value: "/reactjs/react.dev" },
  { label: "Next.js", description: "/vercel/next.js", value: "/vercel/next.js" },
  { label: "Hono", description: "/websites/hono_dev", value: "/websites/hono_dev" },
  { label: "Drizzle ORM", description: "/drizzle-team/drizzle-orm-docs", value: "/drizzle-team/drizzle-orm-docs" },
  { label: "Astro", description: "/websites/astro_build", value: "/websites/astro_build" },
  { label: "Better Auth", description: "/better-auth/better-auth", value: "/better-auth/better-auth" },
  { label: "AI SDK", description: "/websites/ai-sdk_dev", value: "/websites/ai-sdk_dev" },
  { label: "Assistant UI", description: "/assistant-ui/assistant-ui", value: "/assistant-ui/assistant-ui" },
  { label: "Zustand", description: "/pmndrs/zustand", value: "/pmndrs/zustand" },
  { label: "TanStack Router", description: "/tanstack/router", value: "/tanstack/router" },
  { label: "Vitest", description: "/vitest-dev/vitest", value: "/vitest-dev/vitest" },
  { label: "Playwright", description: "/microsoft/playwright", value: "/microsoft/playwright" },
  { label: "Cloudflare Workers", description: "/websites/developers_cloudflare_workers", value: "/websites/developers_cloudflare_workers" },
];

const context7TopicPresets = [
  createCustomPreset("Enter any documentation topic"),
  { label: "Routing", description: "Routing and navigation APIs", value: "routing" },
  { label: "Middleware", description: "Middleware composition and execution", value: "middleware" },
  { label: "Hooks", description: "Hook APIs and lifecycle usage", value: "hooks" },
  { label: "Authentication", description: "Auth setup and flows", value: "authentication" },
  { label: "Configuration", description: "Project or runtime configuration", value: "configuration" },
  { label: "Deployment", description: "Build and deploy guidance", value: "deployment" },
  { label: "Streaming", description: "Streaming responses or UI patterns", value: "streaming" },
  { label: "Tool calling", description: "Tools, functions, and agent orchestration", value: "tool calling" },
  { label: "Testing", description: "Testing setup and APIs", value: "testing" },
  { label: "Migrations", description: "Schema and upgrade workflows", value: "migrations" },
];

const context7Templates = [
  {
    label: "Resolve Next.js library ID",
    description: "Search Context7 for the official Next.js library ID",
    commandName: "resolve-library-id",
    values: { libraryName: "next.js", query: "next.js app router official docs" },
  },
  {
    label: "Resolve Better Auth library ID",
    description: "Search Context7 for the official Better Auth library ID",
    commandName: "resolve-library-id",
    values: { libraryName: "better-auth", query: "better-auth official docs typescript auth" },
  },
  {
    label: "Next.js routing docs",
    description: "Fetch current Next.js routing documentation",
    commandName: "get-library-docs",
    values: { libraryId: "/vercel/next.js", topic: "routing" },
  },
  {
    label: "React hooks docs",
    description: "Fetch official React hooks guidance",
    commandName: "get-library-docs",
    values: { libraryId: "/reactjs/react.dev", topic: "hooks" },
  },
  {
    label: "Hono middleware docs",
    description: "Fetch Hono middleware patterns",
    commandName: "get-library-docs",
    values: { libraryId: "/websites/hono_dev", topic: "middleware" },
  },
  {
    label: "Drizzle relations docs",
    description: "Fetch Drizzle relations documentation",
    commandName: "get-library-docs",
    values: { libraryId: "/drizzle-team/drizzle-orm-docs", topic: "relations" },
  },
  {
    label: "Astro middleware docs",
    description: "Fetch Astro middleware guidance",
    commandName: "get-library-docs",
    values: { libraryId: "/websites/astro_build", topic: "middleware" },
  },
  {
    label: "Better Auth organization plugin docs",
    description: "Fetch Better Auth organization plugin docs",
    commandName: "get-library-docs",
    values: { libraryId: "/better-auth/better-auth", topic: "organization plugin" },
  },
  {
    label: "AI SDK tool calling docs",
    description: "Fetch AI SDK tool calling documentation",
    commandName: "get-library-docs",
    values: { libraryId: "/websites/ai-sdk_dev", topic: "tool calling" },
  },
  {
    label: "Assistant UI thread docs",
    description: "Fetch Assistant UI thread component docs",
    commandName: "get-library-docs",
    values: { libraryId: "/assistant-ui/assistant-ui", topic: "thread" },
  },
  {
    label: "Playwright locators docs",
    description: "Fetch Playwright locator guidance",
    commandName: "get-library-docs",
    values: { libraryId: "/microsoft/playwright", topic: "locators" },
  },
  {
    label: "Vitest mocking docs",
    description: "Fetch Vitest mocking documentation",
    commandName: "get-library-docs",
    values: { libraryId: "/vitest-dev/vitest", topic: "mocking" },
  },
];

const drizzlePathPresets = [
  createCustomPreset("Enter any Drizzle docs path"),
  { label: "SELECT queries", description: "/docs/select", value: "/docs/select" },
  { label: "INSERT queries", description: "/docs/insert", value: "/docs/insert" },
  { label: "UPDATE queries", description: "/docs/update", value: "/docs/update" },
  { label: "DELETE queries", description: "/docs/delete", value: "/docs/delete" },
  { label: "JOIN patterns", description: "/docs/joins", value: "/docs/joins" },
  { label: "Relations", description: "/docs/relations", value: "/docs/relations" },
  { label: "Transactions", description: "/docs/transactions", value: "/docs/transactions" },
  { label: "Migrations", description: "/docs/migrations", value: "/docs/migrations" },
  { label: "drizzle-kit generate", description: "/docs/drizzle-kit-generate", value: "/docs/drizzle-kit-generate" },
  { label: "drizzle-kit push", description: "/docs/drizzle-kit-push", value: "/docs/drizzle-kit-push" },
  { label: "SQL template tag", description: "/docs/sql", value: "/docs/sql" },
  { label: "Row-level security", description: "/docs/rls", value: "/docs/rls" },
  { label: "Indexes & constraints", description: "/docs/indexes-constraints", value: "/docs/indexes-constraints" },
  { label: "Schema definitions", description: "/docs/schemas", value: "/docs/schemas" },
  { label: "PostgreSQL column types", description: "/docs/column-types/pg", value: "/docs/column-types/pg" },
  { label: "Getting started (PostgreSQL)", description: "/docs/get-started-postgresql", value: "/docs/get-started-postgresql" },
  { label: "Connect Neon", description: "/docs/connect-neon", value: "/docs/connect-neon" },
  { label: "Connect Supabase", description: "/docs/connect-supabase", value: "/docs/connect-supabase" },
];

const drizzleQueryPresets = [
  createCustomPreset("Enter any Drizzle search query"),
  { label: "SELECT queries", description: "Query building with select()", value: "select query" },
  { label: "INSERT rows", description: "Inserting data with insert()", value: "insert values" },
  { label: "JOIN patterns", description: "Inner, left, right, and full joins", value: "joins" },
  { label: "Relations", description: "Relational queries and with clause", value: "relations" },
  { label: "Migrations", description: "Schema migration workflows", value: "migrations" },
  { label: "Row-level security", description: "RLS policies with Drizzle", value: "row level security" },
  { label: "Neon serverless", description: "Connecting to Neon PostgreSQL", value: "neon serverless" },
  { label: "Transactions", description: "Database transactions", value: "transactions" },
  { label: "Indexes", description: "Indexes and constraints", value: "indexes constraints" },
  { label: "Schema definitions", description: "Defining tables and columns", value: "schema table columns" },
  { label: "PostgreSQL types", description: "PostgreSQL-specific column types", value: "postgresql column types" },
  { label: "Raw SQL", description: "Using the sql template tag", value: "sql template raw" },
];

const drizzleTemplates = [
  {
    label: "SELECT queries",
    description: "Open Drizzle SELECT query docs",
    commandName: "get-page",
    values: { path: "/docs/select" },
  },
  {
    label: "INSERT queries",
    description: "Open Drizzle INSERT docs",
    commandName: "get-page",
    values: { path: "/docs/insert" },
  },
  {
    label: "JOIN patterns",
    description: "Open Drizzle JOIN docs",
    commandName: "get-page",
    values: { path: "/docs/joins" },
  },
  {
    label: "Relations",
    description: "Open Drizzle relational queries docs",
    commandName: "get-page",
    values: { path: "/docs/relations" },
  },
  {
    label: "Migrations",
    description: "Open Drizzle migrations docs",
    commandName: "get-page",
    values: { path: "/docs/migrations" },
  },
  {
    label: "Row-level security",
    description: "Open Drizzle RLS docs",
    commandName: "get-page",
    values: { path: "/docs/rls" },
  },
  {
    label: "Transactions",
    description: "Open Drizzle transactions docs",
    commandName: "get-page",
    values: { path: "/docs/transactions" },
  },
  {
    label: "Schema definitions",
    description: "Open Drizzle schema docs",
    commandName: "get-page",
    values: { path: "/docs/schemas" },
  },
  {
    label: "Connect Neon",
    description: "Open Neon serverless connection guide",
    commandName: "get-page",
    values: { path: "/docs/connect-neon" },
  },
  {
    label: "Search relations",
    description: "Search Drizzle docs for relational queries",
    commandName: "search-docs",
    values: { query: "relations" },
  },
  {
    label: "Search migrations",
    description: "Search Drizzle docs for migration workflows",
    commandName: "search-docs",
    values: { query: "migrations" },
  },
  {
    label: "Search row-level security",
    description: "Search Drizzle docs for RLS policies",
    commandName: "search-docs",
    values: { query: "row level security" },
  },
  {
    label: "Search indexes",
    description: "Search Drizzle docs for indexes and constraints",
    commandName: "search-docs",
    values: { query: "indexes constraints" },
  },
  {
    label: "Search Neon serverless",
    description: "Search Drizzle docs for Neon connection",
    commandName: "search-docs",
    values: { query: "neon serverless" },
  },
];

const livekitPathPresets = [
  createCustomPreset("Enter any LiveKit docs path"),
  { label: "Getting started", description: "/home/get-started", value: "/home/get-started" },
  { label: "LiveKit Cloud", description: "/home/cloud", value: "/home/cloud" },
  { label: "Self-hosting", description: "/home/self-hosting", value: "/home/self-hosting" },
  { label: "Agents overview", description: "/agents/overview", value: "/agents/overview" },
  { label: "Voice pipeline agent", description: "/agents/voice-pipeline-agent", value: "/agents/voice-pipeline-agent" },
  { label: "Multimodal agent", description: "/agents/multimodal-agent", value: "/agents/multimodal-agent" },
  { label: "Agent plugins overview", description: "/agents/plugins/overview", value: "/agents/plugins/overview" },
  { label: "OpenAI plugin", description: "/agents/plugins/openai", value: "/agents/plugins/openai" },
  { label: "Agent worker", description: "/agents/worker", value: "/agents/worker" },
  { label: "Deploying agents", description: "/agents/deployment", value: "/agents/deployment" },
  { label: "Realtime overview", description: "/realtime/overview", value: "/realtime/overview" },
  { label: "Rooms", description: "/realtime/rooms", value: "/realtime/rooms" },
  { label: "Tracks", description: "/realtime/tracks", value: "/realtime/tracks" },
  { label: "Data messages", description: "/realtime/data-messages", value: "/realtime/data-messages" },
  { label: "React SDK overview", description: "/sdk/js/react/overview", value: "/sdk/js/react/overview" },
  { label: "React components", description: "/sdk/js/react/components", value: "/sdk/js/react/components" },
  { label: "Token generation", description: "/reference/server/token-generation", value: "/reference/server/token-generation" },
];

const livekitQueryPresets = [
  createCustomPreset("Enter any LiveKit search query"),
  { label: "Voice agent", description: "Voice pipeline and conversational agents", value: "voice agent" },
  { label: "Rooms", description: "Room creation and management", value: "rooms" },
  { label: "Tracks", description: "Audio and video tracks", value: "tracks" },
  { label: "Token generation", description: "Server-side token creation", value: "token generation" },
  { label: "React components", description: "React SDK UI components", value: "react components" },
  { label: "Multimodal agent", description: "Multimodal agents with vision and audio", value: "multimodal agent" },
  { label: "Deployment", description: "Deploying LiveKit agents", value: "deployment" },
  { label: "Self-hosting", description: "Self-hosting LiveKit server", value: "self-hosting" },
  { label: "Plugins", description: "Agent plugins and extensions", value: "plugins" },
  { label: "Data messages", description: "Sending data messages in rooms", value: "data messages" },
  { label: "Webhooks", description: "LiveKit webhook events", value: "webhooks" },
];

const livekitTemplates = [
  {
    label: "Getting started",
    description: "Open LiveKit getting started guide",
    commandName: "get-page",
    values: { path: "/home/get-started" },
  },
  {
    label: "Agents overview",
    description: "Open LiveKit agents overview",
    commandName: "get-page",
    values: { path: "/agents/overview" },
  },
  {
    label: "Voice pipeline agent",
    description: "Open voice pipeline agent docs",
    commandName: "get-page",
    values: { path: "/agents/voice-pipeline-agent" },
  },
  {
    label: "Multimodal agent",
    description: "Open multimodal agent docs",
    commandName: "get-page",
    values: { path: "/agents/multimodal-agent" },
  },
  {
    label: "Agent plugins",
    description: "Browse agent plugins",
    commandName: "get-page",
    values: { path: "/agents/plugins/overview" },
  },
  {
    label: "Deploying agents",
    description: "Open agent deployment guide",
    commandName: "get-page",
    values: { path: "/agents/deployment" },
  },
  {
    label: "Realtime rooms",
    description: "Open realtime rooms docs",
    commandName: "get-page",
    values: { path: "/realtime/rooms" },
  },
  {
    label: "Realtime tracks",
    description: "Open realtime tracks docs",
    commandName: "get-page",
    values: { path: "/realtime/tracks" },
  },
  {
    label: "React SDK components",
    description: "Open React SDK components docs",
    commandName: "get-page",
    values: { path: "/sdk/js/react/components" },
  },
  {
    label: "Token generation",
    description: "Open server token generation docs",
    commandName: "get-page",
    values: { path: "/reference/server/token-generation" },
  },
  {
    label: "Search voice agent",
    description: "Search LiveKit docs for voice agent patterns",
    commandName: "search-docs",
    values: { query: "voice agent" },
  },
  {
    label: "Search React components",
    description: "Search LiveKit docs for React SDK components",
    commandName: "search-docs",
    values: { query: "react components" },
  },
  {
    label: "Search token generation",
    description: "Search LiveKit docs for token generation",
    commandName: "search-docs",
    values: { query: "token generation" },
  },
];

// ─── AR Android docs presets ─────────────────────────────────────────────────

const arAndroidPathPresets = [
  createCustomPreset("Enter any Android AR docs path"),
  { label: "Scene Viewer guide", description: "/ar/develop/scene-viewer", value: "/ar/develop/scene-viewer" },
  { label: "Runtime", description: "/ar/develop/runtime", value: "/ar/develop/runtime" },
  { label: "Performance", description: "/ar/develop/performance", value: "/ar/develop/performance" },
  { label: "model-viewer integration", description: "/ar/develop/webxr/model-viewer", value: "/ar/develop/webxr/model-viewer" },
  { label: "Supported devices", description: "/ar/discover/supported-devices", value: "/ar/discover/supported-devices" },
  { label: "Privacy requirements", description: "/ar/develop/privacy-requirements", value: "/ar/develop/privacy-requirements" },
];

const arAndroidQueryPresets = [
  createCustomPreset("Enter any Android AR search query"),
  { label: "AR-only intent", description: "Launch Scene Viewer directly in AR mode", value: "ar_only intent" },
  { label: "Fallback URL", description: "Behavior when AR is unavailable", value: "fallback URL" },
  { label: "model-viewer", description: "Web integration using model-viewer", value: "model-viewer" },
  { label: "Supported devices", description: "ARCore-compatible Android devices", value: "supported devices" },
  { label: "File limits", description: "Asset size and model constraints", value: "file size limits" },
  { label: "Privacy requirements", description: "User privacy and disclosure requirements", value: "privacy requirements" },
];

const arAndroidTemplates = [
  { label: "Scene Viewer guide", description: "Open Scene Viewer integration guide", commandName: "get-page", values: { path: "/ar/develop/scene-viewer" } },
  { label: "Runtime", description: "Open Android AR runtime guidance", commandName: "get-page", values: { path: "/ar/develop/runtime" } },
  { label: "model-viewer integration", description: "Open model-viewer integration guide", commandName: "get-page", values: { path: "/ar/develop/webxr/model-viewer" } },
  { label: "Search AR-only intent", description: "Search for AR-only launch intent usage", commandName: "search-docs", values: { query: "ar_only intent" } },
  { label: "Search fallback URL", description: "Search fallback URL behavior for unsupported devices", commandName: "search-docs", values: { query: "fallback URL" } },
];

// ─── AR iOS docs presets ─────────────────────────────────────────────────────

const arIosPathPresets = [
  createCustomPreset("Enter any Apple ARKit docs path"),
  { label: "ARKit root", description: "/documentation/arkit", value: "/documentation/arkit" },
  { label: "ARSession", description: "/documentation/arkit/arsession", value: "/documentation/arkit/arsession" },
  { label: "ARWorldTrackingConfiguration", description: "/documentation/arkit/arworldtrackingconfiguration", value: "/documentation/arkit/arworldtrackingconfiguration" },
  { label: "ARFaceTrackingConfiguration", description: "/documentation/arkit/arfacetrackingconfiguration", value: "/documentation/arkit/arfacetrackingconfiguration" },
  { label: "Content anchors", description: "/documentation/arkit/arkit_in_ios/content_anchors", value: "/documentation/arkit/arkit_in_ios/content_anchors" },
];

const arIosQueryPresets = [
  createCustomPreset("Enter any Apple ARKit search query"),
  { label: "ARSession lifecycle", description: "Session setup and lifecycle events", value: "ARSession lifecycle" },
  { label: "World tracking", description: "World tracking setup and best practices", value: "world tracking" },
  { label: "Face tracking", description: "Face tracking capabilities and requirements", value: "face tracking" },
  { label: "Content anchors", description: "Anchors and persistent AR content", value: "content anchors" },
  { label: "Device support", description: "Supported Apple devices for ARKit", value: "device support" },
];

const arIosTemplates = [
  { label: "ARKit root", description: "Open ARKit documentation landing page", commandName: "get-page", values: { path: "/documentation/arkit" } },
  { label: "ARSession", description: "Open ARSession API docs", commandName: "get-page", values: { path: "/documentation/arkit/arsession" } },
  { label: "Content anchors", description: "Open ARKit content anchor guidance", commandName: "get-page", values: { path: "/documentation/arkit/arkit_in_ios/content_anchors" } },
  { label: "Search ARSession lifecycle", description: "Search ARKit docs for session lifecycle guidance", commandName: "search-docs", values: { query: "ARSession lifecycle" } },
  { label: "Search world tracking", description: "Search ARKit docs for world tracking", commandName: "search-docs", values: { query: "world tracking" } },
];

const npmPackagePresets = [
  createCustomPreset("Enter any npm package name or URL"),
  { label: "hono", description: "Web framework for Workers, Bun, Node", value: "hono" },
  { label: "drizzle-orm", description: "Type-safe SQL ORM", value: "drizzle-orm" },
  { label: "better-auth", description: "TypeScript auth library", value: "better-auth" },
  { label: "@ai-sdk/openai", description: "AI SDK OpenAI provider", value: "@ai-sdk/openai" },
  { label: "@ai-sdk/anthropic", description: "AI SDK Anthropic provider", value: "@ai-sdk/anthropic" },
  { label: "@assistant-ui/react", description: "Chat UI components for React", value: "@assistant-ui/react" },
  { label: "@assistant-ui/react-ai-sdk", description: "Assistant UI AI SDK adapter", value: "@assistant-ui/react-ai-sdk" },
  { label: "zustand", description: "Lightweight React state management", value: "zustand" },
  { label: "@tanstack/react-router", description: "Typesafe routing for React", value: "@tanstack/react-router" },
  { label: "@tanstack/react-query", description: "Async state management for React", value: "@tanstack/react-query" },
  { label: "vitest", description: "Next-generation test runner", value: "vitest" },
  { label: "playwright", description: "Browser automation and testing", value: "playwright" },
  { label: "@astrojs/cloudflare", description: "Astro Cloudflare adapter", value: "@astrojs/cloudflare" },
  { label: "@astrojs/react", description: "Astro React integration", value: "@astrojs/react" },
  { label: "@cloudflare/workers-types", description: "Cloudflare Workers TypeScript types", value: "@cloudflare/workers-types" },
  { label: "wrangler", description: "Cloudflare Workers CLI", value: "wrangler" },
  { label: "livekit-client", description: "LiveKit client SDK", value: "livekit-client" },
  { label: "@livekit/components-react", description: "LiveKit React components", value: "@livekit/components-react" },
];

const npmSearchPresets = [
  createCustomPreset("Enter any search query"),
  { label: "hono middleware", description: "Search for Hono middleware packages", value: "hono middleware" },
  { label: "astro integration", description: "Search for Astro integrations", value: "astro integration" },
  { label: "react state management", description: "Search for React state libraries", value: "react state management" },
  { label: "ai sdk provider", description: "Search for AI SDK providers", value: "ai sdk provider" },
  { label: "drizzle postgres", description: "Search for Drizzle PostgreSQL helpers", value: "drizzle postgres" },
  { label: "auth library", description: "Search for auth libraries", value: "auth library" },
  { label: "livekit agent", description: "Search for LiveKit agent packages", value: "livekit agent" },
  { label: "cloudflare worker", description: "Search for Cloudflare Worker packages", value: "cloudflare worker" },
  { label: "testing library react", description: "Search for React testing libraries", value: "testing library react" },
  { label: "css-in-js", description: "Search for CSS-in-JS solutions", value: "css-in-js" },
];

const npmTemplates = [
  {
    label: "Get Hono README",
    description: "Fetch the Hono framework README",
    commandName: "get-readme",
    values: { packageName: "hono" },
  },
  {
    label: "Get Better Auth package info",
    description: "Fetch full metadata for better-auth",
    commandName: "get-package-info",
    values: { packageName: "better-auth" },
  },
  {
    label: "Search AI SDK providers",
    description: "Search npm for AI SDK provider packages",
    commandName: "search",
    values: { query: "ai sdk provider" },
  },
  {
    label: "Get drizzle-orm versions",
    description: "List all published drizzle-orm versions",
    commandName: "get-versions",
    values: { packageName: "drizzle-orm" },
  },
  {
    label: "Get hono downloads",
    description: "Get weekly and monthly download stats for hono",
    commandName: "get-downloads",
    values: { packageName: "hono" },
  },
  {
    label: "Get @ai-sdk/openai dependencies",
    description: "Get the dependency tree for @ai-sdk/openai",
    commandName: "get-dependencies",
    values: { packageName: "@ai-sdk/openai" },
  },
  {
    label: "Search React state management",
    description: "Search npm for React state management libraries",
    commandName: "search",
    values: { query: "react state management" },
  },
  {
    label: "Get wrangler README",
    description: "Fetch the Wrangler CLI README",
    commandName: "get-readme",
    values: { packageName: "wrangler" },
  },
  {
    label: "Get @astrojs/cloudflare info",
    description: "Fetch metadata for the Astro Cloudflare adapter",
    commandName: "get-package-info",
    values: { packageName: "@astrojs/cloudflare" },
  },
  {
    label: "Get vitest downloads",
    description: "Get download stats for vitest",
    commandName: "get-downloads",
    values: { packageName: "vitest" },
  },
  {
    label: "Search Hono middleware",
    description: "Search npm for Hono middleware packages",
    commandName: "search",
    values: { query: "hono middleware" },
  },
  {
    label: "Get zustand dependencies",
    description: "Get the dependency tree for zustand",
    commandName: "get-dependencies",
    values: { packageName: "zustand" },
  },
];

const githubOwnerPresets = [
  createCustomPreset("Enter any GitHub owner/org"),
  { label: "honojs", description: "Hono web framework", value: "honojs" },
  { label: "vercel", description: "Vercel — Next.js, AI SDK", value: "vercel" },
  { label: "better-auth", description: "Better Auth library", value: "better-auth" },
  { label: "drizzle-team", description: "Drizzle ORM", value: "drizzle-team" },
  { label: "cloudflare", description: "Cloudflare Workers SDK", value: "cloudflare" },
  { label: "tanstack", description: "TanStack Router, Query", value: "tanstack" },
  { label: "pmndrs", description: "Poimandres — Zustand, Jotai", value: "pmndrs" },
  { label: "microsoft", description: "Microsoft — Playwright, TypeScript", value: "microsoft" },
  { label: "vitest-dev", description: "Vitest test runner", value: "vitest-dev" },
  { label: "assistant-ui", description: "Assistant UI chat components", value: "assistant-ui" },
];

const githubPathPresets = [
  createCustomPreset("Enter any file path"),
  { label: "README.md", description: "Project readme", value: "README.md" },
  { label: "package.json", description: "Package manifest", value: "package.json" },
  { label: "src/index.ts", description: "Main entry point", value: "src/index.ts" },
  { label: "tsconfig.json", description: "TypeScript config", value: "tsconfig.json" },
  { label: "CHANGELOG.md", description: "Release changelog", value: "CHANGELOG.md" },
  { label: "LICENSE", description: "License file", value: "LICENSE" },
  { label: "src/lib/", description: "Library source directory", value: "src/lib/" },
  { label: "docs/", description: "Documentation directory", value: "docs/" },
];

const githubSearchPresets = [
  createCustomPreset("Enter a code search query"),
  { label: "DurableObject", description: "Search for Durable Object implementations", value: "DurableObject" },
  { label: "useAgentChat", description: "Agent chat hook usages", value: "useAgentChat" },
  { label: "Hono middleware", description: "Hono middleware patterns", value: "Hono middleware" },
  { label: "createRoute", description: "Hono OpenAPI route creation", value: "createRoute" },
  { label: "drizzle schema", description: "Drizzle schema definitions", value: "drizzle schema pgTable" },
  { label: "AI SDK streamText", description: "AI SDK streaming patterns", value: "streamText ai" },
  { label: "Better Auth plugin", description: "Better Auth plugin implementations", value: "betterAuth plugin" },
  { label: "Cloudflare Workers fetch", description: "Workers fetch handler pattern", value: "export default { fetch" },
];

const githubTemplates = [
  {
    label: "Read Hono README",
    description: "Fetch the Hono project README",
    commandName: "get-file",
    values: { owner: "honojs", repo: "hono", path: "README.md" },
  },
  {
    label: "Read AI SDK package.json",
    description: "Check AI SDK package manifest",
    commandName: "get-file",
    values: { owner: "vercel", repo: "ai", path: "package.json" },
  },
  {
    label: "Browse Better Auth source",
    description: "List Better Auth src directory",
    commandName: "list-dir",
    values: { owner: "better-auth", repo: "better-auth", path: "packages/better-auth/src" },
  },
  {
    label: "Get drizzle-orm releases",
    description: "Latest releases for Drizzle ORM",
    commandName: "get-releases",
    values: { owner: "drizzle-team", repo: "drizzle-orm" },
  },
  {
    label: "Get Next.js releases",
    description: "Latest releases for Next.js",
    commandName: "get-releases",
    values: { owner: "vercel", repo: "next.js" },
  },
  {
    label: "Search DurableObject implementations",
    description: "Find DurableObject code on GitHub",
    commandName: "search-code",
    values: { query: "DurableObject" },
  },
  {
    label: "Get hono/agents repo info",
    description: "Metadata for the Hono agents repo",
    commandName: "get-repo-info",
    values: { owner: "honojs", repo: "agents" },
  },
  {
    label: "Browse Cloudflare workers-sdk",
    description: "List workers-sdk root directory",
    commandName: "list-dir",
    values: { owner: "cloudflare", repo: "workers-sdk" },
  },
  {
    label: "Read TanStack Router README",
    description: "Fetch TanStack Router README",
    commandName: "get-file",
    values: { owner: "tanstack", repo: "router", path: "README.md" },
  },
  {
    label: "Get Zustand releases",
    description: "Latest releases for Zustand",
    commandName: "get-releases",
    values: { owner: "pmndrs", repo: "zustand" },
  },
  {
    label: "Get Playwright releases",
    description: "Latest releases for Playwright",
    commandName: "get-releases",
    values: { owner: "microsoft", repo: "playwright" },
  },
  {
    label: "Compare Hono releases",
    description: "Compare two Hono tags to see changes",
    commandName: "compare-tags",
    values: { owner: "honojs", repo: "hono", base: "v4.0.0", head: "v4.1.0" },
  },
];

// ─── Hono docs presets ────────────────────────────────────────────────────────

const honoPathPresets = [
  createCustomPreset("Enter any Hono docs path"),
  { label: "Getting started", description: "/docs/getting-started", value: "/docs/getting-started" },
  { label: "Hono API", description: "/docs/api/hono", value: "/docs/api/hono" },
  { label: "Context", description: "/docs/api/context", value: "/docs/api/context" },
  { label: "Routing", description: "/docs/api/routing", value: "/docs/api/routing" },
  { label: "Middleware", description: "/docs/guides/middleware", value: "/docs/guides/middleware" },
  { label: "Helpers", description: "/docs/helpers", value: "/docs/helpers" },
  { label: "JSX", description: "/docs/guides/jsx", value: "/docs/guides/jsx" },
  { label: "Testing", description: "/docs/guides/testing", value: "/docs/guides/testing" },
  { label: "Cloudflare Workers", description: "/docs/getting-started/cloudflare-workers", value: "/docs/getting-started/cloudflare-workers" },
  { label: "Bun", description: "/docs/getting-started/bun", value: "/docs/getting-started/bun" },
  { label: "Deno", description: "/docs/getting-started/deno", value: "/docs/getting-started/deno" },
];

const honoQueryPresets = [
  createCustomPreset("Enter any Hono search query"),
  { label: "Middleware", description: "Middleware composition and built-in middleware", value: "middleware" },
  { label: "Routing", description: "Route handling and parameters", value: "routing" },
  { label: "Context", description: "Context API and request/response helpers", value: "context" },
  { label: "Validation", description: "Input validation with Zod", value: "validation" },
  { label: "JSX", description: "JSX rendering and streaming", value: "jsx" },
  { label: "Testing", description: "Testing Hono apps", value: "testing" },
  { label: "CORS", description: "Cross-origin resource sharing", value: "cors" },
  { label: "Bearer Auth", description: "Bearer authentication middleware", value: "bearer auth" },
];

const honoTemplates = [
  { label: "Getting started", description: "Open Hono getting started guide", commandName: "get-page", values: { path: "/docs/getting-started" } },
  { label: "Hono API", description: "Open Hono core API docs", commandName: "get-page", values: { path: "/docs/api/hono" } },
  { label: "Middleware guide", description: "Open Hono middleware guide", commandName: "get-page", values: { path: "/docs/guides/middleware" } },
  { label: "Search middleware", description: "Search Hono docs for middleware patterns", commandName: "search-docs", values: { query: "middleware" } },
  { label: "Search routing", description: "Search Hono docs for routing", commandName: "search-docs", values: { query: "routing" } },
  { label: "Search Cloudflare Workers", description: "Search Hono docs for Cloudflare Workers setup", commandName: "search-docs", values: { query: "cloudflare workers" } },
];

// ─── React docs presets ───────────────────────────────────────────────────────

const reactPathPresets = [
  createCustomPreset("Enter any React docs path"),
  { label: "useState", description: "/reference/react/useState", value: "/reference/react/useState" },
  { label: "useEffect", description: "/reference/react/useEffect", value: "/reference/react/useEffect" },
  { label: "useContext", description: "/reference/react/useContext", value: "/reference/react/useContext" },
  { label: "useRef", description: "/reference/react/useRef", value: "/reference/react/useRef" },
  { label: "useMemo", description: "/reference/react/useMemo", value: "/reference/react/useMemo" },
  { label: "useCallback", description: "/reference/react/useCallback", value: "/reference/react/useCallback" },
  { label: "Thinking in React", description: "/learn/thinking-in-react", value: "/learn/thinking-in-react" },
  { label: "Tutorial", description: "/learn/tutorial-tic-tac-toe", value: "/learn/tutorial-tic-tac-toe" },
  { label: "Managing state", description: "/learn/managing-state", value: "/learn/managing-state" },
  { label: "Server Components", description: "/reference/rsc/server-components", value: "/reference/rsc/server-components" },
];

const reactQueryPresets = [
  createCustomPreset("Enter any React search query"),
  { label: "Hooks", description: "React hooks API reference", value: "hooks" },
  { label: "State management", description: "Managing component state", value: "state management" },
  { label: "Effects", description: "Side effects and lifecycle", value: "effects" },
  { label: "Context", description: "Sharing data with context", value: "context" },
  { label: "Server Components", description: "React Server Components", value: "server components" },
  { label: "Suspense", description: "Suspense for data loading", value: "suspense" },
  { label: "Forms", description: "Form handling and actions", value: "forms" },
  { label: "Refs", description: "Refs and the DOM", value: "refs" },
];

const reactTemplates = [
  { label: "useState reference", description: "Open useState docs", commandName: "get-page", values: { path: "/reference/react/useState" } },
  { label: "useEffect reference", description: "Open useEffect docs", commandName: "get-page", values: { path: "/reference/react/useEffect" } },
  { label: "Thinking in React", description: "Open Thinking in React tutorial", commandName: "get-page", values: { path: "/learn/thinking-in-react" } },
  { label: "Search hooks", description: "Search React docs for hooks", commandName: "search-docs", values: { query: "hooks" } },
  { label: "Search Server Components", description: "Search for Server Components", commandName: "search-docs", values: { query: "server components" } },
  { label: "Search Suspense", description: "Search for Suspense patterns", commandName: "search-docs", values: { query: "suspense" } },
];

// ─── Next.js docs presets ─────────────────────────────────────────────────────

const nextjsPathPresets = [
  createCustomPreset("Enter any Next.js docs path"),
  { label: "Installation", description: "/docs/getting-started/installation", value: "/docs/getting-started/installation" },
  { label: "App Router", description: "/docs/app", value: "/docs/app" },
  { label: "Pages Router", description: "/docs/pages", value: "/docs/pages" },
  { label: "Routing", description: "/docs/app/building-your-application/routing", value: "/docs/app/building-your-application/routing" },
  { label: "Data fetching", description: "/docs/app/building-your-application/data-fetching", value: "/docs/app/building-your-application/data-fetching" },
  { label: "Server Actions", description: "/docs/app/building-your-application/data-fetching/server-actions-and-mutations", value: "/docs/app/building-your-application/data-fetching/server-actions-and-mutations" },
  { label: "Middleware", description: "/docs/app/building-your-application/routing/middleware", value: "/docs/app/building-your-application/routing/middleware" },
  { label: "API Routes", description: "/docs/app/building-your-application/routing/route-handlers", value: "/docs/app/building-your-application/routing/route-handlers" },
  { label: "Deployment", description: "/docs/app/building-your-application/deploying", value: "/docs/app/building-your-application/deploying" },
];

const nextjsQueryPresets = [
  createCustomPreset("Enter any Next.js search query"),
  { label: "App Router", description: "App Router concepts and APIs", value: "app router" },
  { label: "Server Actions", description: "Server-side mutations", value: "server actions" },
  { label: "Data fetching", description: "Data fetching patterns", value: "data fetching" },
  { label: "Middleware", description: "Edge middleware", value: "middleware" },
  { label: "Caching", description: "Caching strategies", value: "caching" },
  { label: "Streaming", description: "Streaming and Suspense", value: "streaming" },
  { label: "Deployment", description: "Deployment options", value: "deployment" },
  { label: "Image optimization", description: "next/image component", value: "image optimization" },
];

const nextjsTemplates = [
  { label: "Installation", description: "Open Next.js installation guide", commandName: "get-page", values: { path: "/docs/getting-started/installation" } },
  { label: "Routing", description: "Open App Router docs", commandName: "get-page", values: { path: "/docs/app/building-your-application/routing" } },
  { label: "Server Actions", description: "Open Server Actions docs", commandName: "get-page", values: { path: "/docs/app/building-your-application/data-fetching/server-actions-and-mutations" } },
  { label: "Search App Router", description: "Search for App Router patterns", commandName: "search-docs", values: { query: "app router" } },
  { label: "Search caching", description: "Search for caching strategies", commandName: "search-docs", values: { query: "caching" } },
  { label: "Search middleware", description: "Search for middleware usage", commandName: "search-docs", values: { query: "middleware" } },
];

// ─── Zod docs presets ─────────────────────────────────────────────────────────

const zodPathPresets = [
  createCustomPreset("Enter any Zod docs path"),
  { label: "Introduction", description: "/introduction", value: "/introduction" },
  { label: "Primitives", description: "/primitives", value: "/primitives" },
  { label: "Objects", description: "/objects", value: "/objects" },
  { label: "Arrays", description: "/arrays", value: "/arrays" },
  { label: "Unions", description: "/unions", value: "/unions" },
  { label: "Functions", description: "/functions", value: "/functions" },
  { label: "Error handling", description: "/error-handling", value: "/error-handling" },
  { label: "Guides", description: "/guides", value: "/guides" },
];

const zodQueryPresets = [
  createCustomPreset("Enter any Zod search query"),
  { label: "Validation", description: "Schema validation patterns", value: "validation" },
  { label: "Objects", description: "Object schema definitions", value: "objects" },
  { label: "Transform", description: "Schema transformations", value: "transform" },
  { label: "Infer", description: "Type inference from schemas", value: "infer" },
  { label: "Error handling", description: "Custom error messages", value: "error handling" },
  { label: "Coercion", description: "Type coercion", value: "coercion" },
];

const zodTemplates = [
  { label: "Introduction", description: "Open Zod introduction", commandName: "get-page", values: { path: "/introduction" } },
  { label: "Objects", description: "Open Zod object schemas docs", commandName: "get-page", values: { path: "/objects" } },
  { label: "Error handling", description: "Open error handling docs", commandName: "get-page", values: { path: "/error-handling" } },
  { label: "Search validation", description: "Search for validation patterns", commandName: "search-docs", values: { query: "validation" } },
  { label: "Search infer", description: "Search for type inference", commandName: "search-docs", values: { query: "infer" } },
];

// ─── Bun docs presets ─────────────────────────────────────────────────────────

const bunPathPresets = [
  createCustomPreset("Enter any Bun docs path"),
  { label: "Installation", description: "/docs/installation", value: "/docs/installation" },
  { label: "Quickstart", description: "/docs/quickstart", value: "/docs/quickstart" },
  { label: "Runtime", description: "/docs/runtime/modules", value: "/docs/runtime/modules" },
  { label: "Bundler", description: "/docs/bundler", value: "/docs/bundler" },
  { label: "Test runner", description: "/docs/test/writing", value: "/docs/test/writing" },
  { label: "Package manager", description: "/docs/cli/install", value: "/docs/cli/install" },
  { label: "File I/O", description: "/docs/api/file-io", value: "/docs/api/file-io" },
  { label: "HTTP server", description: "/docs/api/http", value: "/docs/api/http" },
  { label: "WebSocket", description: "/docs/api/websockets", value: "/docs/api/websockets" },
  { label: "SQLite", description: "/docs/api/sqlite", value: "/docs/api/sqlite" },
];

const bunQueryPresets = [
  createCustomPreset("Enter any Bun search query"),
  { label: "Runtime", description: "Runtime features and modules", value: "runtime" },
  { label: "Test runner", description: "Testing with Bun", value: "test runner" },
  { label: "Bundler", description: "Bundling apps", value: "bundler" },
  { label: "HTTP server", description: "HTTP and fetch APIs", value: "http server" },
  { label: "WebSocket", description: "WebSocket support", value: "websocket" },
  { label: "File I/O", description: "Reading and writing files", value: "file io" },
  { label: "SQLite", description: "Built-in SQLite", value: "sqlite" },
  { label: "Node.js compatibility", description: "Node.js API compatibility", value: "node.js compatibility" },
];

const bunTemplates = [
  { label: "Quickstart", description: "Open Bun quickstart guide", commandName: "get-page", values: { path: "/docs/quickstart" } },
  { label: "HTTP server", description: "Open HTTP server docs", commandName: "get-page", values: { path: "/docs/api/http" } },
  { label: "Test runner", description: "Open test runner docs", commandName: "get-page", values: { path: "/docs/test/writing" } },
  { label: "Search runtime", description: "Search for runtime features", commandName: "search-docs", values: { query: "runtime" } },
  { label: "Search WebSocket", description: "Search for WebSocket support", commandName: "search-docs", values: { query: "websocket" } },
];

// ─── Stripe docs presets ──────────────────────────────────────────────────────

const stripePathPresets = [
  createCustomPreset("Enter any Stripe docs path"),
  { label: "Accept a payment", description: "/payments/accept-a-payment", value: "/payments/accept-a-payment" },
  { label: "Checkout", description: "/payments/checkout", value: "/payments/checkout" },
  { label: "Subscriptions", description: "/billing/subscriptions/overview", value: "/billing/subscriptions/overview" },
  { label: "Webhooks", description: "/webhooks", value: "/webhooks" },
  { label: "Stripe.js", description: "/stripe-js", value: "/stripe-js" },
  { label: "Connect", description: "/connect", value: "/connect" },
  { label: "API reference", description: "/api", value: "/api" },
  { label: "Elements", description: "/payments/elements", value: "/payments/elements" },
  { label: "Customer portal", description: "/billing/subscriptions/customer-portal", value: "/billing/subscriptions/customer-portal" },
  { label: "Testing", description: "/testing", value: "/testing" },
];

const stripeQueryPresets = [
  createCustomPreset("Enter any Stripe search query"),
  { label: "Payments", description: "Payment processing flows", value: "payments" },
  { label: "Subscriptions", description: "Recurring billing", value: "subscriptions" },
  { label: "Webhooks", description: "Webhook events and handling", value: "webhooks" },
  { label: "Checkout", description: "Hosted checkout page", value: "checkout" },
  { label: "Connect", description: "Multi-party payments", value: "connect" },
  { label: "Elements", description: "Embeddable UI components", value: "elements" },
  { label: "Invoices", description: "Invoice management", value: "invoices" },
  { label: "Testing", description: "Test mode and test cards", value: "testing" },
];

const stripeTemplates = [
  { label: "Accept a payment", description: "Open payment acceptance guide", commandName: "get-page", values: { path: "/payments/accept-a-payment" } },
  { label: "Subscriptions", description: "Open subscriptions overview", commandName: "get-page", values: { path: "/billing/subscriptions/overview" } },
  { label: "Webhooks", description: "Open webhooks guide", commandName: "get-page", values: { path: "/webhooks" } },
  { label: "Search payments", description: "Search for payment flows", commandName: "search-docs", values: { query: "payments" } },
  { label: "Search subscriptions", description: "Search for subscription billing", commandName: "search-docs", values: { query: "subscriptions" } },
  { label: "Search Connect", description: "Search for Connect platform", commandName: "search-docs", values: { query: "connect" } },
];

// ─── TanStack docs presets ────────────────────────────────────────────────────

const tanstackPathPresets = [
  createCustomPreset("Enter any TanStack docs path"),
  { label: "Query overview", description: "/query/latest/docs/overview", value: "/query/latest/docs/overview" },
  { label: "Query quick start", description: "/query/latest/docs/framework/react/quick-start", value: "/query/latest/docs/framework/react/quick-start" },
  { label: "Router overview", description: "/router/latest/docs/framework/react/overview", value: "/router/latest/docs/framework/react/overview" },
  { label: "Router quick start", description: "/router/latest/docs/framework/react/quick-start", value: "/router/latest/docs/framework/react/quick-start" },
  { label: "Table overview", description: "/table/latest/docs/introduction", value: "/table/latest/docs/introduction" },
  { label: "Form overview", description: "/form/latest/docs/overview", value: "/form/latest/docs/overview" },
  { label: "Virtual overview", description: "/virtual/latest/docs/introduction", value: "/virtual/latest/docs/introduction" },
  { label: "Store overview", description: "/store/latest/docs/overview", value: "/store/latest/docs/overview" },
  { label: "Start overview", description: "/start/latest/docs/overview", value: "/start/latest/docs/overview" },
];

const tanstackQueryPresets = [
  createCustomPreset("Enter any TanStack search query"),
  { label: "useQuery", description: "useQuery hook usage", value: "useQuery" },
  { label: "useMutation", description: "Mutation patterns", value: "useMutation" },
  { label: "Router", description: "TanStack Router setup", value: "router" },
  { label: "Table", description: "Data table patterns", value: "table" },
  { label: "Form", description: "Form management", value: "form" },
  { label: "Suspense", description: "Suspense integration", value: "suspense" },
  { label: "Caching", description: "Query caching strategies", value: "caching" },
  { label: "SSR", description: "Server-side rendering", value: "ssr" },
];

const tanstackTemplates = [
  { label: "Query overview", description: "Open TanStack Query docs", commandName: "get-page", values: { path: "/query/latest/docs/overview" } },
  { label: "Router quick start", description: "Open TanStack Router quick start", commandName: "get-page", values: { path: "/router/latest/docs/framework/react/quick-start" } },
  { label: "Table introduction", description: "Open TanStack Table docs", commandName: "get-page", values: { path: "/table/latest/docs/introduction" } },
  { label: "Search useQuery", description: "Search for useQuery patterns", commandName: "search-docs", values: { query: "useQuery" } },
  { label: "Search router", description: "Search for Router setup", commandName: "search-docs", values: { query: "router" } },
  { label: "Search form", description: "Search for Form management", commandName: "search-docs", values: { query: "form" } },
];

// ─── shadcn/ui docs presets ───────────────────────────────────────────────────

const shadcnPathPresets = [
  createCustomPreset("Enter any shadcn/ui docs path"),
  { label: "Installation", description: "/docs/installation", value: "/docs/installation" },
  { label: "Theming", description: "/docs/theming", value: "/docs/theming" },
  { label: "Dark mode", description: "/docs/dark-mode", value: "/docs/dark-mode" },
  { label: "CLI", description: "/docs/cli", value: "/docs/cli" },
  { label: "Button", description: "/docs/components/button", value: "/docs/components/button" },
  { label: "Dialog", description: "/docs/components/dialog", value: "/docs/components/dialog" },
  { label: "Form", description: "/docs/components/form", value: "/docs/components/form" },
  { label: "Data Table", description: "/docs/components/data-table", value: "/docs/components/data-table" },
  { label: "Select", description: "/docs/components/select", value: "/docs/components/select" },
  { label: "Toast", description: "/docs/components/toast", value: "/docs/components/toast" },
  { label: "Sidebar", description: "/docs/components/sidebar", value: "/docs/components/sidebar" },
];

const shadcnQueryPresets = [
  createCustomPreset("Enter any shadcn/ui search query"),
  { label: "Components", description: "Available UI components", value: "components" },
  { label: "Theming", description: "Theme customization", value: "theming" },
  { label: "Dark mode", description: "Dark mode setup", value: "dark mode" },
  { label: "Forms", description: "Form components and validation", value: "forms" },
  { label: "Data table", description: "Table with sorting and filtering", value: "data table" },
  { label: "Installation", description: "Setup and CLI", value: "installation" },
];

const shadcnTemplates = [
  { label: "Installation", description: "Open installation guide", commandName: "get-page", values: { path: "/docs/installation" } },
  { label: "Button component", description: "Open button component docs", commandName: "get-page", values: { path: "/docs/components/button" } },
  { label: "Dialog component", description: "Open dialog component docs", commandName: "get-page", values: { path: "/docs/components/dialog" } },
  { label: "Search components", description: "Search for components", commandName: "search-docs", values: { query: "components" } },
  { label: "Search theming", description: "Search for theming options", commandName: "search-docs", values: { query: "theming" } },
];

// ─── Neon docs presets ────────────────────────────────────────────────────────

const neonPathPresets = [
  createCustomPreset("Enter any Neon docs path"),
  { label: "Introduction", description: "/docs/introduction", value: "/docs/introduction" },
  { label: "Connect", description: "/docs/connect/connect-intro", value: "/docs/connect/connect-intro" },
  { label: "Branching", description: "/docs/guides/branching-intro", value: "/docs/guides/branching-intro" },
  { label: "Serverless driver", description: "/docs/serverless/serverless-driver", value: "/docs/serverless/serverless-driver" },
  { label: "API Reference", description: "/docs/reference/api-reference", value: "/docs/reference/api-reference" },
  { label: "Import from Postgres", description: "/docs/import/import-from-postgres", value: "/docs/import/import-from-postgres" },
  { label: "Autoscaling", description: "/docs/introduction/autoscaling", value: "/docs/introduction/autoscaling" },
  { label: "Drizzle ORM", description: "/docs/guides/drizzle", value: "/docs/guides/drizzle" },
  { label: "Prisma", description: "/docs/guides/prisma", value: "/docs/guides/prisma" },
];

const neonQueryPresets = [
  createCustomPreset("Enter any Neon search query"),
  { label: "Branching", description: "Database branching workflows", value: "branching" },
  { label: "Serverless driver", description: "Neon serverless driver", value: "serverless driver" },
  { label: "Connection pooling", description: "Connection pooling config", value: "connection pooling" },
  { label: "Autoscaling", description: "Compute autoscaling", value: "autoscaling" },
  { label: "Extensions", description: "PostgreSQL extensions", value: "extensions" },
  { label: "Drizzle", description: "Using Drizzle ORM with Neon", value: "drizzle" },
  { label: "Prisma", description: "Using Prisma with Neon", value: "prisma" },
  { label: "Import", description: "Importing data to Neon", value: "import" },
];

const neonTemplates = [
  { label: "Introduction", description: "Open Neon introduction", commandName: "get-page", values: { path: "/docs/introduction" } },
  { label: "Serverless driver", description: "Open serverless driver docs", commandName: "get-page", values: { path: "/docs/serverless/serverless-driver" } },
  { label: "Branching", description: "Open branching guide", commandName: "get-page", values: { path: "/docs/guides/branching-intro" } },
  { label: "Search branching", description: "Search for branching workflows", commandName: "search-docs", values: { query: "branching" } },
  { label: "Search serverless", description: "Search for serverless driver usage", commandName: "search-docs", values: { query: "serverless driver" } },
  { label: "Search Drizzle", description: "Search for Drizzle ORM integration", commandName: "search-docs", values: { query: "drizzle" } },
];

// ─── Deno docs presets ────────────────────────────────────────────────────────

const denoPathPresets = [
  createCustomPreset("Enter any Deno docs path"),
  { label: "Runtime", description: "/runtime/", value: "/runtime/" },
  { label: "TypeScript", description: "/runtime/fundamentals/typescript/", value: "/runtime/fundamentals/typescript/" },
  { label: "Permissions", description: "/runtime/fundamentals/security/", value: "/runtime/fundamentals/security/" },
  { label: "Node.js compat", description: "/runtime/fundamentals/node/", value: "/runtime/fundamentals/node/" },
  { label: "Deploy", description: "/deploy/", value: "/deploy/" },
  { label: "Subhosting", description: "/subhosting/", value: "/subhosting/" },
  { label: "Examples", description: "/examples/", value: "/examples/" },
  { label: "Testing", description: "/runtime/fundamentals/testing/", value: "/runtime/fundamentals/testing/" },
  { label: "HTTP server", description: "/runtime/fundamentals/http_server/", value: "/runtime/fundamentals/http_server/" },
];

const denoQueryPresets = [
  createCustomPreset("Enter any Deno search query"),
  { label: "TypeScript", description: "TypeScript support", value: "typescript" },
  { label: "Permissions", description: "Security and permissions", value: "permissions" },
  { label: "Node.js compatibility", description: "Node.js API support", value: "node.js compatibility" },
  { label: "HTTP server", description: "HTTP server APIs", value: "http server" },
  { label: "Testing", description: "Testing with Deno", value: "testing" },
  { label: "Deploy", description: "Deno Deploy platform", value: "deploy" },
  { label: "KV", description: "Deno KV database", value: "kv" },
  { label: "Modules", description: "Module system and imports", value: "modules" },
];

const denoTemplates = [
  { label: "Runtime overview", description: "Open Deno runtime docs", commandName: "get-page", values: { path: "/runtime/" } },
  { label: "TypeScript", description: "Open TypeScript guide", commandName: "get-page", values: { path: "/runtime/fundamentals/typescript/" } },
  { label: "Deploy", description: "Open Deno Deploy docs", commandName: "get-page", values: { path: "/deploy/" } },
  { label: "Search TypeScript", description: "Search for TypeScript features", commandName: "search-docs", values: { query: "typescript" } },
  { label: "Search permissions", description: "Search for security permissions", commandName: "search-docs", values: { query: "permissions" } },
  { label: "Search deploy", description: "Search for Deploy platform", commandName: "search-docs", values: { query: "deploy" } },
];

// ─── Vitest docs presets ──────────────────────────────────────────────────────

const vitestPathPresets = [
  createCustomPreset("Enter any Vitest docs path"),
  { label: "Guide", description: "/guide/", value: "/guide/" },
  { label: "API Reference", description: "/api/", value: "/api/" },
  { label: "Config Reference", description: "/config/", value: "/config/" },
  { label: "Browser Mode", description: "/guide/browser/", value: "/guide/browser/" },
  { label: "Mocking", description: "/guide/mocking", value: "/guide/mocking" },
  { label: "Snapshot", description: "/guide/snapshot", value: "/guide/snapshot" },
  { label: "Coverage", description: "/guide/coverage", value: "/guide/coverage" },
];

const vitestQueryPresets = [
  createCustomPreset("Enter any Vitest search query"),
  { label: "Snapshot testing", description: "Snapshot assertions and inline snapshots", value: "snapshot testing" },
  { label: "Mock functions", description: "Mocking and spying", value: "mock functions" },
  { label: "Coverage", description: "Code coverage configuration", value: "coverage" },
  { label: "Browser mode", description: "Browser-based testing", value: "browser mode" },
  { label: "TypeScript", description: "TypeScript support", value: "typescript" },
  { label: "Config", description: "Configuration options", value: "config" },
];

const vitestTemplates = [
  { label: "Guide", description: "Open Vitest guide", commandName: "get-page", values: { path: "/guide/" } },
  { label: "API Reference", description: "Open Vitest API docs", commandName: "get-page", values: { path: "/api/" } },
  { label: "Config", description: "Open Vitest config reference", commandName: "get-page", values: { path: "/config/" } },
  { label: "Search mocking", description: "Search for mocking patterns", commandName: "search-docs", values: { query: "mock functions" } },
  { label: "Search snapshot", description: "Search for snapshot testing", commandName: "search-docs", values: { query: "snapshot" } },
  { label: "Search coverage", description: "Search for coverage setup", commandName: "search-docs", values: { query: "coverage" } },
];

// ─── Svelte docs presets ──────────────────────────────────────────────────────

const sveltePathPresets = [
  createCustomPreset("Enter any Svelte docs path"),
  { label: "Svelte overview", description: "/docs/svelte/overview", value: "/docs/svelte/overview" },
  { label: "SvelteKit intro", description: "/docs/kit/introduction", value: "/docs/kit/introduction" },
  { label: "Reactivity", description: "/docs/svelte/reactivity", value: "/docs/svelte/reactivity" },
  { label: "Routing", description: "/docs/kit/routing", value: "/docs/kit/routing" },
  { label: "Stores", description: "/docs/svelte/stores", value: "/docs/svelte/stores" },
  { label: "Components", description: "/docs/svelte/components", value: "/docs/svelte/components" },
];

const svelteQueryPresets = [
  createCustomPreset("Enter any Svelte search query"),
  { label: "Reactivity", description: "Svelte reactivity system", value: "reactivity" },
  { label: "Stores", description: "Svelte stores", value: "stores" },
  { label: "SvelteKit routing", description: "SvelteKit routing and pages", value: "sveltekit routing" },
  { label: "Server load", description: "Server load functions", value: "server load functions" },
  { label: "Actions", description: "Form actions", value: "actions" },
  { label: "Transitions", description: "Transitions and animations", value: "transitions" },
];

const svelteTemplates = [
  { label: "Svelte overview", description: "Open Svelte overview", commandName: "get-page", values: { path: "/docs/svelte/overview" } },
  { label: "SvelteKit intro", description: "Open SvelteKit introduction", commandName: "get-page", values: { path: "/docs/kit/introduction" } },
  { label: "Search reactivity", description: "Search for reactivity", commandName: "search-docs", values: { query: "reactivity" } },
  { label: "Search routing", description: "Search for routing", commandName: "search-docs", values: { query: "routing" } },
  { label: "Search stores", description: "Search for stores", commandName: "search-docs", values: { query: "stores" } },
];

// ─── Vue docs presets ─────────────────────────────────────────────────────────

const vuePathPresets = [
  createCustomPreset("Enter any Vue docs path"),
  { label: "Introduction", description: "/guide/introduction", value: "/guide/introduction" },
  { label: "Reactivity", description: "/guide/essentials/reactivity-fundamentals", value: "/guide/essentials/reactivity-fundamentals" },
  { label: "Composition API", description: "/api/composition-api-setup", value: "/api/composition-api-setup" },
  { label: "Components", description: "/guide/components/props", value: "/guide/components/props" },
  { label: "Computed", description: "/guide/essentials/computed", value: "/guide/essentials/computed" },
  { label: "Watchers", description: "/guide/essentials/watchers", value: "/guide/essentials/watchers" },
];

const vueQueryPresets = [
  createCustomPreset("Enter any Vue search query"),
  { label: "Reactivity", description: "Vue reactivity system", value: "reactivity" },
  { label: "Composition API", description: "Composition API patterns", value: "composition api" },
  { label: "Computed", description: "Computed properties", value: "computed properties" },
  { label: "Watchers", description: "Watchers and effects", value: "watchers" },
  { label: "Pinia", description: "State management with Pinia", value: "pinia" },
  { label: "Vue Router", description: "Vue Router integration", value: "vue router" },
];

const vueTemplates = [
  { label: "Introduction", description: "Open Vue introduction", commandName: "get-page", values: { path: "/guide/introduction" } },
  { label: "Reactivity", description: "Open Vue reactivity guide", commandName: "get-page", values: { path: "/guide/essentials/reactivity-fundamentals" } },
  { label: "Search composition", description: "Search for Composition API", commandName: "search-docs", values: { query: "composition api" } },
  { label: "Search reactivity", description: "Search for reactivity", commandName: "search-docs", values: { query: "reactivity" } },
  { label: "Search router", description: "Search for Vue Router", commandName: "search-docs", values: { query: "vue router" } },
];

// ─── Angular docs presets ─────────────────────────────────────────────────────

const angularPathPresets = [
  createCustomPreset("Enter any Angular docs path"),
  { label: "Components", description: "/guide/components", value: "/guide/components" },
  { label: "Signals", description: "/guide/signals", value: "/guide/signals" },
  { label: "DI", description: "/guide/di", value: "/guide/di" },
  { label: "Routing", description: "/guide/routing", value: "/guide/routing" },
  { label: "Forms", description: "/guide/forms", value: "/guide/forms" },
  { label: "Testing", description: "/guide/testing", value: "/guide/testing" },
];

const angularQueryPresets = [
  createCustomPreset("Enter any Angular search query"),
  { label: "Signals", description: "Angular Signals API", value: "signals" },
  { label: "Dependency injection", description: "DI and providers", value: "dependency injection" },
  { label: "Routing", description: "Router and navigation", value: "routing" },
  { label: "Reactive forms", description: "Reactive forms", value: "reactive forms" },
  { label: "Standalone", description: "Standalone components", value: "standalone components" },
  { label: "SSR", description: "Server-side rendering", value: "server side rendering" },
];

const angularTemplates = [
  { label: "Components", description: "Open Angular components guide", commandName: "get-page", values: { path: "/guide/components" } },
  { label: "Signals", description: "Open Angular signals guide", commandName: "get-page", values: { path: "/guide/signals" } },
  { label: "Search signals", description: "Search for signals", commandName: "search-docs", values: { query: "signals" } },
  { label: "Search DI", description: "Search for dependency injection", commandName: "search-docs", values: { query: "dependency injection" } },
  { label: "Search routing", description: "Search for routing", commandName: "search-docs", values: { query: "routing" } },
];

// ─── Nuxt docs presets ────────────────────────────────────────────────────────

const nuxtPathPresets = [
  createCustomPreset("Enter any Nuxt docs path"),
  { label: "Introduction", description: "/docs/getting-started/introduction", value: "/docs/getting-started/introduction" },
  { label: "Auto imports", description: "/docs/guide/concepts/auto-imports", value: "/docs/guide/concepts/auto-imports" },
  { label: "useFetch", description: "/docs/api/composables/use-fetch", value: "/docs/api/composables/use-fetch" },
  { label: "Pages", description: "/docs/guide/directory-structure/pages", value: "/docs/guide/directory-structure/pages" },
  { label: "Middleware", description: "/docs/guide/directory-structure/middleware", value: "/docs/guide/directory-structure/middleware" },
  { label: "Server routes", description: "/docs/guide/directory-structure/server", value: "/docs/guide/directory-structure/server" },
];

const nuxtQueryPresets = [
  createCustomPreset("Enter any Nuxt search query"),
  { label: "Auto imports", description: "Automatic imports", value: "auto imports" },
  { label: "useFetch", description: "Data fetching composable", value: "useFetch" },
  { label: "Middleware", description: "Route middleware", value: "middleware" },
  { label: "Server routes", description: "Nitro server routes", value: "server routes" },
  { label: "Nitro", description: "Nitro server engine", value: "nitro" },
  { label: "Plugins", description: "Nuxt plugins system", value: "plugins" },
];

const nuxtTemplates = [
  { label: "Introduction", description: "Open Nuxt introduction", commandName: "get-page", values: { path: "/docs/getting-started/introduction" } },
  { label: "Auto imports", description: "Open auto imports guide", commandName: "get-page", values: { path: "/docs/guide/concepts/auto-imports" } },
  { label: "Search useFetch", description: "Search for useFetch", commandName: "search-docs", values: { query: "useFetch" } },
  { label: "Search middleware", description: "Search for middleware", commandName: "search-docs", values: { query: "middleware" } },
  { label: "Search server routes", description: "Search for server routes", commandName: "search-docs", values: { query: "server routes" } },
];

// ─── Clerk docs presets ───────────────────────────────────────────────────────

const clerkPathPresets = [
  createCustomPreset("Enter any Clerk docs path"),
  { label: "Next.js quickstart", description: "/docs/quickstarts/nextjs", value: "/docs/quickstarts/nextjs" },
  { label: "Authentication", description: "/docs/authentication/overview", value: "/docs/authentication/overview" },
  { label: "Organizations", description: "/docs/organizations/overview", value: "/docs/organizations/overview" },
  { label: "Webhooks", description: "/docs/integrations/webhooks", value: "/docs/integrations/webhooks" },
  { label: "JS reference", description: "/docs/references/javascript/overview", value: "/docs/references/javascript/overview" },
  { label: "React components", description: "/docs/components/overview", value: "/docs/components/overview" },
];

const clerkQueryPresets = [
  createCustomPreset("Enter any Clerk search query"),
  { label: "Authentication", description: "Auth methods and flows", value: "authentication" },
  { label: "Organizations", description: "Multi-tenant organizations", value: "organizations" },
  { label: "Webhooks", description: "Webhook events", value: "webhooks" },
  { label: "Sessions", description: "Session management", value: "session management" },
  { label: "Next.js", description: "Next.js integration", value: "next.js integration" },
  { label: "Middleware", description: "Auth middleware", value: "middleware" },
];

const clerkTemplates = [
  { label: "Next.js quickstart", description: "Open Next.js quickstart", commandName: "get-page", values: { path: "/docs/quickstarts/nextjs" } },
  { label: "Authentication", description: "Open authentication overview", commandName: "get-page", values: { path: "/docs/authentication/overview" } },
  { label: "Search auth", description: "Search for authentication", commandName: "search-docs", values: { query: "authentication" } },
  { label: "Search organizations", description: "Search for organizations", commandName: "search-docs", values: { query: "organizations" } },
  { label: "Search webhooks", description: "Search for webhooks", commandName: "search-docs", values: { query: "webhooks" } },
];

// ─── Convex docs presets ──────────────────────────────────────────────────────

const convexPathPresets = [
  createCustomPreset("Enter any Convex docs path"),
  { label: "Quickstart", description: "/quickstart", value: "/quickstart" },
  { label: "Functions", description: "/functions", value: "/functions" },
  { label: "Database", description: "/database", value: "/database" },
  { label: "Auth", description: "/auth", value: "/auth" },
  { label: "AI", description: "/ai", value: "/ai" },
  { label: "Search", description: "/search", value: "/search" },
];

const convexQueryPresets = [
  createCustomPreset("Enter any Convex search query"),
  { label: "Mutations", description: "Database mutations", value: "mutations" },
  { label: "Queries", description: "Database queries", value: "queries" },
  { label: "Schema", description: "Database schema", value: "database schema" },
  { label: "Authentication", description: "Auth setup", value: "authentication" },
  { label: "Real-time", description: "Real-time subscriptions", value: "real-time" },
  { label: "File storage", description: "File storage system", value: "file storage" },
];

const convexTemplates = [
  { label: "Quickstart", description: "Open Convex quickstart", commandName: "get-page", values: { path: "/quickstart" } },
  { label: "Functions", description: "Open Convex functions guide", commandName: "get-page", values: { path: "/functions" } },
  { label: "Search mutations", description: "Search for mutations", commandName: "search-docs", values: { query: "mutations" } },
  { label: "Search schema", description: "Search for database schema", commandName: "search-docs", values: { query: "database schema" } },
  { label: "Search auth", description: "Search for authentication", commandName: "search-docs", values: { query: "authentication" } },
];

// ─── Turso docs presets ───────────────────────────────────────────────────────

const tursoPathPresets = [
  createCustomPreset("Enter any Turso docs path"),
  { label: "CLI", description: "/cli", value: "/cli" },
  { label: "TypeScript SDK", description: "/sdk/ts", value: "/sdk/ts" },
  { label: "Go SDK", description: "/sdk/go", value: "/sdk/go" },
  { label: "Cloud", description: "/cloud", value: "/cloud" },
  { label: "SQL reference", description: "/reference/sql", value: "/reference/sql" },
  { label: "API reference", description: "/reference/api", value: "/reference/api" },
];

const tursoQueryPresets = [
  createCustomPreset("Enter any Turso search query"),
  { label: "Embedded replicas", description: "Local embedded replicas", value: "embedded replicas" },
  { label: "TypeScript SDK", description: "TypeScript/JS client", value: "typescript SDK" },
  { label: "libSQL", description: "libSQL database", value: "libSQL" },
  { label: "Multi-db schemas", description: "Multi-database schemas", value: "multi-db schemas" },
  { label: "Edge database", description: "Edge database features", value: "edge database" },
  { label: "Branching", description: "Database branching", value: "branching" },
];

const tursoTemplates = [
  { label: "CLI", description: "Open Turso CLI docs", commandName: "get-page", values: { path: "/cli" } },
  { label: "TypeScript SDK", description: "Open TypeScript SDK docs", commandName: "get-page", values: { path: "/sdk/ts" } },
  { label: "Search replicas", description: "Search for embedded replicas", commandName: "search-docs", values: { query: "embedded replicas" } },
  { label: "Search SDK", description: "Search for TypeScript SDK", commandName: "search-docs", values: { query: "typescript SDK" } },
  { label: "Search branching", description: "Search for database branching", commandName: "search-docs", values: { query: "branching" } },
];

// ─── Supabase docs presets ────────────────────────────────────────────────────

const supabasePathPresets = [
  createCustomPreset("Enter any Supabase docs path"),
  { label: "Getting started", description: "/docs/guides/getting-started", value: "/docs/guides/getting-started" },
  { label: "Auth", description: "/docs/guides/auth", value: "/docs/guides/auth" },
  { label: "Database", description: "/docs/guides/database", value: "/docs/guides/database" },
  { label: "Edge Functions", description: "/docs/guides/functions", value: "/docs/guides/functions" },
  { label: "Storage", description: "/docs/guides/storage", value: "/docs/guides/storage" },
  { label: "JS reference", description: "/docs/reference/javascript/introduction", value: "/docs/reference/javascript/introduction" },
];

const supabaseQueryPresets = [
  createCustomPreset("Enter any Supabase search query"),
  { label: "Authentication", description: "Auth setup and providers", value: "authentication" },
  { label: "RLS", description: "Row level security", value: "row level security" },
  { label: "Edge Functions", description: "Serverless functions", value: "edge functions" },
  { label: "Realtime", description: "Realtime subscriptions", value: "realtime" },
  { label: "Storage", description: "File storage", value: "storage" },
  { label: "Postgres", description: "PostgreSQL features", value: "postgres" },
];

const supabaseTemplates = [
  { label: "Getting started", description: "Open Supabase getting started", commandName: "get-page", values: { path: "/docs/guides/getting-started" } },
  { label: "Auth", description: "Open auth guide", commandName: "get-page", values: { path: "/docs/guides/auth" } },
  { label: "Search auth", description: "Search for authentication", commandName: "search-docs", values: { query: "authentication" } },
  { label: "Search RLS", description: "Search for row level security", commandName: "search-docs", values: { query: "row level security" } },
  { label: "Search edge functions", description: "Search for edge functions", commandName: "search-docs", values: { query: "edge functions" } },
];

// ─── Prisma docs presets ──────────────────────────────────────────────────────

const prismaPathPresets = [
  createCustomPreset("Enter any Prisma docs path"),
  { label: "Getting started", description: "/docs/getting-started", value: "/docs/getting-started" },
  { label: "Prisma Client", description: "/docs/concepts/components/prisma-client", value: "/docs/concepts/components/prisma-client" },
  { label: "Schema", description: "/docs/concepts/components/prisma-schema", value: "/docs/concepts/components/prisma-schema" },
  { label: "Migrations", description: "/docs/concepts/components/prisma-migrate", value: "/docs/concepts/components/prisma-migrate" },
  { label: "Database guide", description: "/docs/guides/database", value: "/docs/guides/database" },
  { label: "API reference", description: "/docs/reference/api-reference", value: "/docs/reference/api-reference" },
];

const prismaQueryPresets = [
  createCustomPreset("Enter any Prisma search query"),
  { label: "Prisma Client", description: "Client queries and operations", value: "prisma client" },
  { label: "Migrations", description: "Database migrations", value: "migrations" },
  { label: "Relations", description: "Data model relations", value: "relations" },
  { label: "Schema", description: "Prisma schema language", value: "schema" },
  { label: "Raw queries", description: "Raw SQL queries", value: "raw queries" },
  { label: "Transactions", description: "Database transactions", value: "transactions" },
];

const prismaTemplates = [
  { label: "Getting started", description: "Open Prisma getting started", commandName: "get-page", values: { path: "/docs/getting-started" } },
  { label: "Prisma Client", description: "Open Prisma Client docs", commandName: "get-page", values: { path: "/docs/concepts/components/prisma-client" } },
  { label: "Search client", description: "Search for Prisma Client", commandName: "search-docs", values: { query: "prisma client" } },
  { label: "Search migrations", description: "Search for migrations", commandName: "search-docs", values: { query: "migrations" } },
  { label: "Search relations", description: "Search for relations", commandName: "search-docs", values: { query: "relations" } },
];

// ─── Turborepo docs presets ───────────────────────────────────────────────────

const turborepoPathPresets = [
  createCustomPreset("Enter any Turborepo docs path"),
  { label: "Getting started", description: "/getting-started", value: "/getting-started" },
  { label: "Core concepts", description: "/core-concepts", value: "/core-concepts" },
  { label: "Caching", description: "/crafting-your-repository/caching", value: "/crafting-your-repository/caching" },
  { label: "Configuration", description: "/reference/configuration", value: "/reference/configuration" },
  { label: "CI vendors", description: "/guides/ci-vendors", value: "/guides/ci-vendors" },
  { label: "Running tasks", description: "/crafting-your-repository/running-tasks", value: "/crafting-your-repository/running-tasks" },
];

const turborepoQueryPresets = [
  createCustomPreset("Enter any Turborepo search query"),
  { label: "Caching", description: "Task caching system", value: "caching" },
  { label: "Remote cache", description: "Remote caching setup", value: "remote cache" },
  { label: "Task graph", description: "Task dependency graph", value: "task graph" },
  { label: "Configuration", description: "turbo.json config", value: "turbo.json configuration" },
  { label: "CI setup", description: "CI/CD integration", value: "CI setup" },
  { label: "Docker", description: "Docker with Turborepo", value: "docker" },
];

const turborepoTemplates = [
  { label: "Getting started", description: "Open Turborepo getting started", commandName: "get-page", values: { path: "/getting-started" } },
  { label: "Caching", description: "Open caching guide", commandName: "get-page", values: { path: "/crafting-your-repository/caching" } },
  { label: "Configuration", description: "Open turbo.json reference", commandName: "get-page", values: { path: "/reference/configuration" } },
  { label: "Search caching", description: "Search for caching", commandName: "search-docs", values: { query: "caching" } },
  { label: "Search remote cache", description: "Search for remote cache", commandName: "search-docs", values: { query: "remote cache" } },
  { label: "Search CI", description: "Search for CI setup", commandName: "search-docs", values: { query: "CI setup" } },
];

// ─── ElevenLabs docs presets ──────────────────────────────────────────────────

const elevenlabsPathPresets = [
  createCustomPreset("Enter any ElevenLabs docs path"),
  { label: "Introduction", description: "/overview/intro", value: "/overview/intro" },
  { label: "Agents overview", description: "/eleven-agents/overview", value: "/eleven-agents/overview" },
  { label: "API quickstart", description: "/eleven-api/quickstart", value: "/eleven-api/quickstart" },
  { label: "Voice cloning", description: "/eleven-creative/voices/voice-cloning", value: "/eleven-creative/voices/voice-cloning" },
  { label: "Text to speech", description: "/overview/capabilities/text-to-speech", value: "/overview/capabilities/text-to-speech" },
  { label: "API reference", description: "/api-reference/introduction", value: "/api-reference/introduction" },
];

const elevenlabsQueryPresets = [
  createCustomPreset("Enter any ElevenLabs search query"),
  { label: "Text to speech", description: "TTS capabilities", value: "text to speech" },
  { label: "Voice cloning", description: "Voice cloning features", value: "voice cloning" },
  { label: "Agents", description: "Conversational AI agents", value: "conversational agents" },
  { label: "Voice design", description: "Design custom voices", value: "voice design" },
  { label: "WebSocket", description: "Real-time WebSocket API", value: "websocket" },
  { label: "SDKs", description: "Client SDKs and libraries", value: "SDKs" },
];

const elevenlabsTemplates = [
  { label: "Introduction", description: "Open ElevenLabs introduction", commandName: "get-page", values: { path: "/overview/intro" } },
  { label: "Agents overview", description: "Open agents overview", commandName: "get-page", values: { path: "/eleven-agents/overview" } },
  { label: "Search TTS", description: "Search for text to speech", commandName: "search-docs", values: { query: "text to speech" } },
  { label: "Search agents", description: "Search for conversational agents", commandName: "search-docs", values: { query: "conversational agents" } },
  { label: "Search voice cloning", description: "Search for voice cloning", commandName: "search-docs", values: { query: "voice cloning" } },
];

// ─── tRPC ────────────────────────────────────────────────────────────────────
const trpcPathPresets = [
  { label: "Getting Started", value: "/docs/getting-started" },
  { label: "React Query", value: "/docs/client/react" },
  { label: "Server Routes", value: "/docs/server/routers" },
  createCustomPreset("Enter a tRPC doc path"),
];
const trpcQueryPresets = [
  { label: "Router", value: "router" },
  { label: "Middleware", value: "middleware" },
  { label: "React Query", value: "react query" },
  createCustomPreset("Enter a search query"),
];
const trpcTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/docs/getting-started" } },
  { label: "Search router", commandName: "search-docs", values: { query: "router" } },
];

// ─── SolidJS ─────────────────────────────────────────────────────────────────
const solidPathPresets = [
  { label: "Getting Started", value: "/guides/getting-started" },
  { label: "Signals", value: "/concepts/signals" },
  { label: "Stores", value: "/concepts/stores" },
  createCustomPreset("Enter a SolidJS doc path"),
];
const solidQueryPresets = [
  { label: "Signals", value: "signals" },
  { label: "Reactivity", value: "reactivity" },
  { label: "Components", value: "components" },
  createCustomPreset("Enter a search query"),
];
const solidTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/guides/getting-started" } },
  { label: "Search signals", commandName: "search-docs", values: { query: "signals" } },
];

// ─── Elysia ──────────────────────────────────────────────────────────────────
const elysiaPathPresets = [
  { label: "Getting Started", value: "/quick-start" },
  { label: "Route", value: "/route" },
  { label: "Plugin", value: "/plugin" },
  createCustomPreset("Enter an Elysia doc path"),
];
const elysiaQueryPresets = [
  { label: "Plugin", value: "plugin" },
  { label: "Validation", value: "validation" },
  { label: "WebSocket", value: "websocket" },
  createCustomPreset("Enter a search query"),
];
const elysiaTemplates = [
  { label: "Quick Start", commandName: "get-page", values: { path: "/quick-start" } },
  { label: "Search plugin", commandName: "search-docs", values: { query: "plugin" } },
];

// ─── Fastify ─────────────────────────────────────────────────────────────────
const fastifyPathPresets = [
  { label: "Getting Started", value: "/docs/latest/Guides/Getting-Started" },
  { label: "Hooks", value: "/docs/latest/Reference/Hooks" },
  { label: "Plugins", value: "/docs/latest/Reference/Plugins" },
  createCustomPreset("Enter a Fastify doc path"),
];
const fastifyQueryPresets = [
  { label: "Hooks", value: "hooks" },
  { label: "Plugins", value: "plugins" },
  { label: "Validation", value: "validation" },
  createCustomPreset("Enter a search query"),
];
const fastifyTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/docs/latest/Guides/Getting-Started" } },
  { label: "Search hooks", commandName: "search-docs", values: { query: "hooks" } },
];

// ─── Effect ──────────────────────────────────────────────────────────────────
const effectPathPresets = [
  { label: "Introduction", value: "/docs/introduction" },
  { label: "Getting Started", value: "/docs/getting-started" },
  { label: "Pipes", value: "/docs/pipes" },
  createCustomPreset("Enter an Effect doc path"),
];
const effectQueryPresets = [
  { label: "Pipe", value: "pipe" },
  { label: "Effect", value: "Effect type" },
  { label: "Schema", value: "schema" },
  createCustomPreset("Enter a search query"),
];
const effectTemplates = [
  { label: "Introduction", commandName: "get-page", values: { path: "/docs/introduction" } },
  { label: "Search pipe", commandName: "search-docs", values: { query: "pipe" } },
];

// ─── XState ──────────────────────────────────────────────────────────────────
const xstatePathPresets = [
  { label: "Getting Started", value: "/docs/quick-start" },
  { label: "State Machines", value: "/docs/state-machines-and-statecharts" },
  { label: "Actors", value: "/docs/actors" },
  createCustomPreset("Enter an XState doc path"),
];
const xstateQueryPresets = [
  { label: "State machine", value: "state machine" },
  { label: "Actions", value: "actions" },
  { label: "Guards", value: "guards" },
  createCustomPreset("Enter a search query"),
];
const xstateTemplates = [
  { label: "Quick Start", commandName: "get-page", values: { path: "/docs/quick-start" } },
  { label: "Search state machine", commandName: "search-docs", values: { query: "state machine" } },
];

// ─── Vite ────────────────────────────────────────────────────────────────────
const vitePathPresets = [
  { label: "Getting Started", value: "/guide/" },
  { label: "Features", value: "/guide/features" },
  { label: "Config", value: "/config/" },
  createCustomPreset("Enter a Vite doc path"),
];
const viteQueryPresets = [
  { label: "Plugins", value: "plugins" },
  { label: "HMR", value: "hot module replacement" },
  { label: "Build", value: "build" },
  createCustomPreset("Enter a search query"),
];
const viteTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/guide/" } },
  { label: "Search plugins", commandName: "search-docs", values: { query: "plugins" } },
];

// ─── Vercel ──────────────────────────────────────────────────────────────────
const vercelPathPresets = [
  { label: "Getting Started", value: "/docs/getting-started-with-vercel" },
  { label: "Deployments", value: "/docs/deployments/overview" },
  { label: "Edge Functions", value: "/docs/functions/edge-functions" },
  createCustomPreset("Enter a Vercel doc path"),
];
const vercelQueryPresets = [
  { label: "Deployment", value: "deployment" },
  { label: "Serverless", value: "serverless functions" },
  { label: "Edge", value: "edge functions" },
  createCustomPreset("Enter a search query"),
];
const vercelTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/docs/getting-started-with-vercel" } },
  { label: "Search deployment", commandName: "search-docs", values: { query: "deployment" } },
];

// ─── Payload ─────────────────────────────────────────────────────────────────
const payloadPathPresets = [
  { label: "Getting Started", value: "/docs/getting-started/what-is-payload" },
  { label: "Collections", value: "/docs/configuration/collections" },
  { label: "Fields", value: "/docs/fields/overview" },
  createCustomPreset("Enter a Payload doc path"),
];
const payloadQueryPresets = [
  { label: "Collections", value: "collections" },
  { label: "Fields", value: "fields" },
  { label: "Access control", value: "access control" },
  createCustomPreset("Enter a search query"),
];
const payloadTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/docs/getting-started/what-is-payload" } },
  { label: "Search collections", commandName: "search-docs", values: { query: "collections" } },
];

// ─── Resend ──────────────────────────────────────────────────────────────────
const resendPathPresets = [
  { label: "Introduction", value: "/docs/introduction" },
  { label: "Send Email", value: "/docs/send-email" },
  { label: "API Reference", value: "/docs/api-reference/emails/send-email" },
  createCustomPreset("Enter a Resend doc path"),
];
const resendQueryPresets = [
  { label: "Send email", value: "send email" },
  { label: "React email", value: "react email" },
  { label: "Domains", value: "domains" },
  createCustomPreset("Enter a search query"),
];
const resendTemplates = [
  { label: "Introduction", commandName: "get-page", values: { path: "/docs/introduction" } },
  { label: "Search send email", commandName: "search-docs", values: { query: "send email" } },
];

// ─── Mantine ─────────────────────────────────────────────────────────────────
const mantinePathPresets = [
  { label: "Getting Started", value: "/getting-started/" },
  { label: "Button", value: "/core/button/" },
  { label: "Hooks", value: "/hooks/use-disclosure/" },
  createCustomPreset("Enter a Mantine doc path"),
];
const mantineQueryPresets = [
  { label: "Button", value: "button" },
  { label: "Form", value: "form" },
  { label: "Theming", value: "theming" },
  createCustomPreset("Enter a search query"),
];
const mantineTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/getting-started/" } },
  { label: "Search button", commandName: "search-docs", values: { query: "button" } },
];

// ─── LangChain ───────────────────────────────────────────────────────────────
const langchainPathPresets = [
  { label: "Getting Started", value: "/docs/introduction" },
  { label: "LLMs", value: "/docs/integrations/llms" },
  { label: "Chains", value: "/docs/modules/chains" },
  createCustomPreset("Enter a LangChain doc path"),
];
const langchainQueryPresets = [
  { label: "Chain", value: "chain" },
  { label: "Retrieval", value: "retrieval" },
  { label: "Agents", value: "agents" },
  createCustomPreset("Enter a search query"),
];
const langchainTemplates = [
  { label: "Introduction", commandName: "get-page", values: { path: "/docs/introduction" } },
  { label: "Search chain", commandName: "search-docs", values: { query: "chain" } },
];

// ─── Nitro ───────────────────────────────────────────────────────────────────
const nitroPathPresets = [
  { label: "Getting Started", value: "/guide/getting-started" },
  { label: "Routing", value: "/guide/routing" },
  { label: "Storage", value: "/guide/storage" },
  createCustomPreset("Enter a Nitro doc path"),
];
const nitroQueryPresets = [
  { label: "Routes", value: "routes" },
  { label: "Storage", value: "storage" },
  { label: "Deploy", value: "deploy" },
  createCustomPreset("Enter a search query"),
];
const nitroTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/guide/getting-started" } },
  { label: "Search routes", commandName: "search-docs", values: { query: "routes" } },
];

// ─── Panda CSS ───────────────────────────────────────────────────────────────
const pandaCssPathPresets = [
  { label: "Getting Started", value: "/docs/installation/astro" },
  { label: "Tokens", value: "/docs/theming/tokens" },
  { label: "Patterns", value: "/docs/concepts/patterns" },
  createCustomPreset("Enter a Panda CSS doc path"),
];
const pandaCssQueryPresets = [
  { label: "Tokens", value: "tokens" },
  { label: "Recipes", value: "recipes" },
  { label: "Patterns", value: "patterns" },
  createCustomPreset("Enter a search query"),
];
const pandaCssTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/docs/installation/astro" } },
  { label: "Search tokens", commandName: "search-docs", values: { query: "tokens" } },
];

// ─── Expo ────────────────────────────────────────────────────────────────────
const expoPathPresets = [
  { label: "Getting Started", value: "/get-started/introduction" },
  { label: "Navigation", value: "/router/introduction" },
  { label: "Push Notifications", value: "/push-notifications/overview" },
  createCustomPreset("Enter an Expo doc path"),
];
const expoQueryPresets = [
  { label: "Navigation", value: "navigation" },
  { label: "Push notifications", value: "push notifications" },
  { label: "EAS Build", value: "eas build" },
  createCustomPreset("Enter a search query"),
];
const expoTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/get-started/introduction" } },
  { label: "Search navigation", commandName: "search-docs", values: { query: "navigation" } },
];

// ─── Zustand ─────────────────────────────────────────────────────────────────
const zustandPathPresets = [
  { label: "Introduction", value: "/learn/getting-started/introduction" },
  { label: "Updating State", value: "/learn/updating-state" },
  { label: "Middleware", value: "/learn/guides/middleware" },
  createCustomPreset("Enter a Zustand doc path"),
];
const zustandQueryPresets = [
  { label: "Store", value: "store" },
  { label: "Middleware", value: "middleware" },
  { label: "Persist", value: "persist" },
  createCustomPreset("Enter a search query"),
];
const zustandTemplates = [
  { label: "Introduction", commandName: "get-page", values: { path: "/learn/getting-started/introduction" } },
  { label: "Search store", commandName: "search-docs", values: { query: "store" } },
];

// ─── Storybook ───────────────────────────────────────────────────────────────
const storybookPathPresets = [
  { label: "Getting Started", value: "/docs/get-started" },
  { label: "Writing Stories", value: "/docs/writing-stories" },
  { label: "Addons", value: "/docs/addons" },
  createCustomPreset("Enter a Storybook doc path"),
];
const storybookQueryPresets = [
  { label: "Addon", value: "addon" },
  { label: "Stories", value: "stories" },
  { label: "Testing", value: "testing" },
  createCustomPreset("Enter a search query"),
];
const storybookTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/docs/get-started" } },
  { label: "Search addon", commandName: "search-docs", values: { query: "addon" } },
];

// ─── Tauri ───────────────────────────────────────────────────────────────────
const tauriPathPresets = [
  { label: "Getting Started", value: "/start/" },
  { label: "Configuration", value: "/reference/config/" },
  { label: "Plugins", value: "/plugin/" },
  createCustomPreset("Enter a Tauri doc path"),
];
const tauriQueryPresets = [
  { label: "Window", value: "window" },
  { label: "Plugin", value: "plugin" },
  { label: "IPC", value: "inter-process communication" },
  createCustomPreset("Enter a search query"),
];
const tauriTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/start/" } },
  { label: "Search window", commandName: "search-docs", values: { query: "window" } },
];

// ─── Rspack ──────────────────────────────────────────────────────────────────
const rspackPathPresets = [
  { label: "Getting Started", value: "/guide/start/quick-start" },
  { label: "Configuration", value: "/config/" },
  { label: "Loaders", value: "/guide/features/loader" },
  createCustomPreset("Enter an Rspack doc path"),
];
const rspackQueryPresets = [
  { label: "Loader", value: "loader" },
  { label: "Plugin", value: "plugin" },
  { label: "Performance", value: "performance" },
  createCustomPreset("Enter a search query"),
];
const rspackTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/guide/start/quick-start" } },
  { label: "Search loader", commandName: "search-docs", values: { query: "loader" } },
];

// ─── WXT ─────────────────────────────────────────────────────────────────────
const wxtPathPresets = [
  { label: "Getting Started", value: "/guide/installation" },
  { label: "Entrypoints", value: "/guide/essentials/entrypoints" },
  { label: "Storage", value: "/guide/essentials/storage" },
  createCustomPreset("Enter a WXT doc path"),
];
const wxtQueryPresets = [
  { label: "Manifest", value: "manifest" },
  { label: "Content scripts", value: "content scripts" },
  { label: "Background", value: "background" },
  createCustomPreset("Enter a search query"),
];
const wxtTemplates = [
  { label: "Getting Started", commandName: "get-page", values: { path: "/guide/installation" } },
  { label: "Search manifest", commandName: "search-docs", values: { query: "manifest" } },
];

const presetsByParam = new Map([
  ["cloudflare-docs:get-product-index:product", cloudflareProductPresets],
  ["cloudflare-docs:search-docs:product", cloudflareProductPresets],
  ["cloudflare-docs:get-page:path", cloudflarePathPresets],
  ["astro-docs:get-page:path", astroPathPresets],
  ["better-auth-docs:get-page:path", betterAuthPathPresets],
  ["drizzle-docs:get-page:path", drizzlePathPresets],
  ["drizzle-docs:search-docs:query", drizzleQueryPresets],
  ["context7:resolve-library-id:libraryName", context7LibraryNamePresets],
  ["context7:get-library-docs:libraryId", context7LibraryIdPresets],
  ["context7:get-library-docs:topic", context7TopicPresets],
  ["livekit-docs:get-page:path", livekitPathPresets],
  ["livekit-docs:search-docs:query", livekitQueryPresets],
  ["ar-android-docs:get-page:path", arAndroidPathPresets],
  ["ar-android-docs:search-docs:query", arAndroidQueryPresets],
  ["ar-ios-docs:get-page:path", arIosPathPresets],
  ["ar-ios-docs:search-docs:query", arIosQueryPresets],
  ["npm:search:query", npmSearchPresets],
  ["npm:get-readme:packageName", npmPackagePresets],
  ["npm:get-package-info:packageName", npmPackagePresets],
  ["npm:get-versions:packageName", npmPackagePresets],
  ["npm:get-downloads:packageName", npmPackagePresets],
  ["npm:get-dependencies:packageName", npmPackagePresets],
  ["github:get-file:owner", githubOwnerPresets],
  ["github:get-file:path", githubPathPresets],
  ["github:list-dir:owner", githubOwnerPresets],
  ["github:get-releases:owner", githubOwnerPresets],
  ["github:get-repo-info:owner", githubOwnerPresets],
  ["github:compare-tags:owner", githubOwnerPresets],
  ["github:search-code:query", githubSearchPresets],
  ["hono-docs:get-page:path", honoPathPresets],
  ["hono-docs:search-docs:query", honoQueryPresets],
  ["react-docs:get-page:path", reactPathPresets],
  ["react-docs:search-docs:query", reactQueryPresets],
  ["nextjs-docs:get-page:path", nextjsPathPresets],
  ["nextjs-docs:search-docs:query", nextjsQueryPresets],
  ["zod-docs:get-page:path", zodPathPresets],
  ["zod-docs:search-docs:query", zodQueryPresets],
  ["bun-docs:get-page:path", bunPathPresets],
  ["bun-docs:search-docs:query", bunQueryPresets],
  ["stripe-docs:get-page:path", stripePathPresets],
  ["stripe-docs:search-docs:query", stripeQueryPresets],
  ["tanstack-docs:get-page:path", tanstackPathPresets],
  ["tanstack-docs:search-docs:query", tanstackQueryPresets],
  ["shadcn-docs:get-page:path", shadcnPathPresets],
  ["shadcn-docs:search-docs:query", shadcnQueryPresets],
  ["neon-docs:get-page:path", neonPathPresets],
  ["neon-docs:search-docs:query", neonQueryPresets],
  ["deno-docs:get-page:path", denoPathPresets],
  ["deno-docs:search-docs:query", denoQueryPresets],
  ["vitest-docs:get-page:path", vitestPathPresets],
  ["vitest-docs:search-docs:query", vitestQueryPresets],
  ["svelte-docs:get-page:path", sveltePathPresets],
  ["svelte-docs:search-docs:query", svelteQueryPresets],
  ["vue-docs:get-page:path", vuePathPresets],
  ["vue-docs:search-docs:query", vueQueryPresets],
  ["angular-docs:get-page:path", angularPathPresets],
  ["angular-docs:search-docs:query", angularQueryPresets],
  ["nuxt-docs:get-page:path", nuxtPathPresets],
  ["nuxt-docs:search-docs:query", nuxtQueryPresets],
  ["clerk-docs:get-page:path", clerkPathPresets],
  ["clerk-docs:search-docs:query", clerkQueryPresets],
  ["convex-docs:get-page:path", convexPathPresets],
  ["convex-docs:search-docs:query", convexQueryPresets],
  ["turso-docs:get-page:path", tursoPathPresets],
  ["turso-docs:search-docs:query", tursoQueryPresets],
  ["supabase-docs:get-page:path", supabasePathPresets],
  ["supabase-docs:search-docs:query", supabaseQueryPresets],
  ["prisma-docs:get-page:path", prismaPathPresets],
  ["prisma-docs:search-docs:query", prismaQueryPresets],
  ["turborepo-docs:get-page:path", turborepoPathPresets],
  ["turborepo-docs:search-docs:query", turborepoQueryPresets],
  ["elevenlabs-docs:get-page:path", elevenlabsPathPresets],
  ["elevenlabs-docs:search-docs:query", elevenlabsQueryPresets],
  ["trpc-docs:get-page:path", trpcPathPresets],
  ["trpc-docs:search-docs:query", trpcQueryPresets],
  ["solid-docs:get-page:path", solidPathPresets],
  ["solid-docs:search-docs:query", solidQueryPresets],
  ["elysia-docs:get-page:path", elysiaPathPresets],
  ["elysia-docs:search-docs:query", elysiaQueryPresets],
  ["fastify-docs:get-page:path", fastifyPathPresets],
  ["fastify-docs:search-docs:query", fastifyQueryPresets],
  ["effect-docs:get-page:path", effectPathPresets],
  ["effect-docs:search-docs:query", effectQueryPresets],
  ["xstate-docs:get-page:path", xstatePathPresets],
  ["xstate-docs:search-docs:query", xstateQueryPresets],
  ["vite-docs:get-page:path", vitePathPresets],
  ["vite-docs:search-docs:query", viteQueryPresets],
  ["vercel-docs:get-page:path", vercelPathPresets],
  ["vercel-docs:search-docs:query", vercelQueryPresets],
  ["payload-docs:get-page:path", payloadPathPresets],
  ["payload-docs:search-docs:query", payloadQueryPresets],
  ["resend-docs:get-page:path", resendPathPresets],
  ["resend-docs:search-docs:query", resendQueryPresets],
  ["mantine-docs:get-page:path", mantinePathPresets],
  ["mantine-docs:search-docs:query", mantineQueryPresets],
  ["langchain-docs:get-page:path", langchainPathPresets],
  ["langchain-docs:search-docs:query", langchainQueryPresets],
  ["nitro-docs:get-page:path", nitroPathPresets],
  ["nitro-docs:search-docs:query", nitroQueryPresets],
  ["panda-css-docs:get-page:path", pandaCssPathPresets],
  ["panda-css-docs:search-docs:query", pandaCssQueryPresets],
  ["expo-docs:get-page:path", expoPathPresets],
  ["expo-docs:search-docs:query", expoQueryPresets],
  ["zustand-docs:get-page:path", zustandPathPresets],
  ["zustand-docs:search-docs:query", zustandQueryPresets],
  ["storybook-docs:get-page:path", storybookPathPresets],
  ["storybook-docs:search-docs:query", storybookQueryPresets],
  ["tauri-docs:get-page:path", tauriPathPresets],
  ["tauri-docs:search-docs:query", tauriQueryPresets],
  ["rspack-docs:get-page:path", rspackPathPresets],
  ["rspack-docs:search-docs:query", rspackQueryPresets],
  ["wxt-docs:get-page:path", wxtPathPresets],
  ["wxt-docs:search-docs:query", wxtQueryPresets],
]);

const templatesByTool = new Map([
  ["cloudflare-docs", cloudflareTemplates],
  ["astro-docs", astroTemplates],
  ["better-auth-docs", betterAuthTemplates],
  ["drizzle-docs", drizzleTemplates],
  ["context7", context7Templates],
  ["livekit-docs", livekitTemplates],
  ["ar-android-docs", arAndroidTemplates],
  ["ar-ios-docs", arIosTemplates],
  ["npm", npmTemplates],
  ["github", githubTemplates],
  ["hono-docs", honoTemplates],
  ["react-docs", reactTemplates],
  ["nextjs-docs", nextjsTemplates],
  ["zod-docs", zodTemplates],
  ["bun-docs", bunTemplates],
  ["stripe-docs", stripeTemplates],
  ["tanstack-docs", tanstackTemplates],
  ["shadcn-docs", shadcnTemplates],
  ["neon-docs", neonTemplates],
  ["deno-docs", denoTemplates],
  ["vitest-docs", vitestTemplates],
  ["svelte-docs", svelteTemplates],
  ["vue-docs", vueTemplates],
  ["angular-docs", angularTemplates],
  ["nuxt-docs", nuxtTemplates],
  ["clerk-docs", clerkTemplates],
  ["convex-docs", convexTemplates],
  ["turso-docs", tursoTemplates],
  ["supabase-docs", supabaseTemplates],
  ["prisma-docs", prismaTemplates],
  ["turborepo-docs", turborepoTemplates],
  ["elevenlabs-docs", elevenlabsTemplates],
  ["trpc-docs", trpcTemplates],
  ["solid-docs", solidTemplates],
  ["elysia-docs", elysiaTemplates],
  ["fastify-docs", fastifyTemplates],
  ["effect-docs", effectTemplates],
  ["xstate-docs", xstateTemplates],
  ["vite-docs", viteTemplates],
  ["vercel-docs", vercelTemplates],
  ["payload-docs", payloadTemplates],
  ["resend-docs", resendTemplates],
  ["mantine-docs", mantineTemplates],
  ["langchain-docs", langchainTemplates],
  ["nitro-docs", nitroTemplates],
  ["panda-css-docs", pandaCssTemplates],
  ["expo-docs", expoTemplates],
  ["zustand-docs", zustandTemplates],
  ["storybook-docs", storybookTemplates],
  ["tauri-docs", tauriTemplates],
  ["rspack-docs", rspackTemplates],
  ["wxt-docs", wxtTemplates],
]);

export function getParamPresets(toolId, commandName, paramName) {
  const presets = presetsByParam.get(`${toolId}:${commandName}:${paramName}`);
  return presets ? presets.map((preset) => ({ ...preset })) : [];
}

export function getToolTemplates(toolId) {
  const templates = templatesByTool.get(toolId);
  return templates
    ? templates.map((template) => ({ ...template, values: { ...template.values } }))
    : [];
}