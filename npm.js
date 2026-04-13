/**
 * tools/npm.js
 *
 * npm registry API — no API key needed.
 * Search packages, get READMEs, version info, changelogs, downloads, dependencies.
 *
 * Tools:
 *   - search           → search npm packages by keyword
 *   - get-readme       → fetch the README for a package as Markdown
 *   - get-package-info → full package metadata (latest or pinned version)
 *   - get-versions     → list all published versions with dates
 *   - get-downloads    → weekly and monthly download stats
 *   - get-dependencies → flattened dependency tree for a package
 */

const REGISTRY  = "https://registry.npmjs.org";
const SEARCH    = "https://registry.npmjs.org/-/v1/search";
const DOWNLOADS = "https://api.npmjs.org/downloads/point";

/**
 * Normalize a package name from various input formats.
 * Handles npm URLs, scoped URLs, GitHub shorthand, trimming, lowercasing.
 */
export function normalizeNpmPackageName(input) {
  if (!input || typeof input !== "string") return input;
  let name = input.trim();

  // npm URLs: https://www.npmjs.com/package/@scope/name or https://www.npmjs.com/package/name
  const npmUrlMatch = name.match(/^https?:\/\/(?:www\.)?npmjs\.com\/package\/(.+?)(?:[?#].*)?$/);
  if (npmUrlMatch) {
    name = decodeURIComponent(npmUrlMatch[1]).replace(/\/+$/, "");
    return name.toLowerCase();
  }

  // GitHub shorthand: owner/repo (but NOT scoped packages like @scope/name)
  if (!name.startsWith("@") && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(name)) {
    // Use the repo part as the package name guess
    name = name.split("/")[1];
  }

  return name.toLowerCase();
}

export const tools = [
  {
    name: "search",
    description:
      "Search the npm registry for packages. Returns name, description, version, weekly downloads, sorted by relevance.",
    parameters: {
      query: "string — e.g. 'hono middleware', 'astro integration'",
      size:  "number (optional) — results to return (default 10, max 250)",
    },
  },
  {
    name: "get-readme",
    description:
      "Fetches the README for a specific npm package as Markdown. " +
      "Great for understanding a library's API without installing it.",
    parameters: {
      packageName: "string — e.g. 'hono', 'drizzle-orm', or an npm URL",
      version:     "string (optional) — specific version, defaults to latest",
    },
  },
  {
    name: "get-package-info",
    description:
      "Returns full metadata for a package: description, homepage, repository, " +
      "dependencies, peer dependencies, exports, keywords, license, bin, scripts, type.",
    parameters: {
      packageName: "string — e.g. 'better-auth', 'ai', or an npm URL",
      version:     "string (optional) — specific version, defaults to latest",
    },
  },
  {
    name: "get-versions",
    description:
      "Lists all published versions of a package with their publish dates. " +
      "Useful for checking what's new or finding the latest stable release.",
    parameters: {
      packageName: "string — e.g. 'drizzle-orm'",
    },
  },
  {
    name: "get-downloads",
    description:
      "Get weekly and monthly download stats for a package from the npm API.",
    parameters: {
      packageName: "string — e.g. 'hono', '@ai-sdk/openai'",
    },
  },
  {
    name: "get-dependencies",
    description:
      "Get the flattened dependency tree for a package: dependencies, devDependencies, " +
      "peerDependencies, optionalDependencies, and total count.",
    parameters: {
      packageName: "string — e.g. 'hono', 'drizzle-orm'",
      version:     "string (optional) — specific version, defaults to latest",
    },
  },
];

/**
 * invoke(toolName, args)
 *
 * @example
 * const results  = await invoke("search", { query: "astro integration" });
 * const readme   = await invoke("get-readme", { packageName: "hono" });
 * const info     = await invoke("get-package-info", { packageName: "drizzle-orm" });
 * const versions = await invoke("get-versions", { packageName: "better-auth" });
 * const dl       = await invoke("get-downloads", { packageName: "hono" });
 * const deps     = await invoke("get-dependencies", { packageName: "hono" });
 */
export async function invoke(toolName, args = {}) {
  switch (toolName) {
    case "search":
      return search(args);
    case "get-readme":
      return getReadme(args);
    case "get-package-info":
      return getPackageInfo(args);
    case "get-versions":
      return getVersions(args);
    case "get-downloads":
      return getDownloads(args);
    case "get-dependencies":
      return getDependencies(args);
    default:
      throw new Error(`Unknown npm tool: "${toolName}"`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodePkgName(name) {
  // Scoped packages: @scope/name → @scope%2fname (npm registry convention)
  if (name.startsWith("@")) {
    return `@${encodeURIComponent(name.slice(1))}`;
  }
  return encodeURIComponent(name);
}

// ─── Internal handlers ────────────────────────────────────────────────────────

async function search({ query, size = 10 }) {
  if (!query) throw new Error("search requires `query`");

  const params = new URLSearchParams({ text: query, size: String(Math.min(size, 250)) });
  const res = await fetch(`${SEARCH}?${params}`);
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`);

  const data = await res.json();
  const packages = (data.objects || [])
    .map(({ package: pkg, score }) => ({
      name:        pkg.name,
      version:     pkg.version,
      description: pkg.description,
      keywords:    pkg.keywords,
      homepage:    pkg.links?.homepage,
      npm:         pkg.links?.npm,
      score:       score?.final,
      downloads:   pkg.downloads?.weekly,
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  return { total: data.total, packages };
}

async function getReadme({ packageName, version }) {
  if (!packageName) throw new Error("get-readme requires `packageName`");
  const name = normalizeNpmPackageName(packageName);

  const url = version
    ? `${REGISTRY}/${encodePkgName(name)}/${version}`
    : `${REGISTRY}/${encodePkgName(name)}/latest`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Package "${name}" not found (${res.status})`);

  const data = await res.json();
  let readme = data.readme;

  // Fallback: if readme is missing or too short, try the full doc endpoint
  if (!readme || readme === "No README available." || readme.length < 20) {
    try {
      const fullRes = await fetch(`${REGISTRY}/${encodePkgName(name)}`, {
        headers: { Accept: "application/json" },
      });
      if (fullRes.ok) {
        const fullData = await fullRes.json();
        if (fullData.readme && fullData.readme.length > (readme || "").length) {
          readme = fullData.readme;
        }
      }
    } catch {
      // ignore fallback errors
    }
  }

  return {
    name:    data.name,
    version: data.version,
    readme:  readme || "No README available.",
  };
}

async function getPackageInfo({ packageName, version }) {
  if (!packageName) throw new Error("get-package-info requires `packageName`");
  const name = normalizeNpmPackageName(packageName);

  const url = version
    ? `${REGISTRY}/${encodePkgName(name)}/${version}`
    : `${REGISTRY}/${encodePkgName(name)}/latest`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Package "${name}" not found (${res.status})`);

  const d = await res.json();
  return {
    name:             d.name,
    version:          d.version,
    description:      d.description,
    license:          d.license,
    homepage:         d.homepage,
    repository:       d.repository,
    keywords:         d.keywords,
    exports:          d.exports,
    main:             d.main,
    module:           d.module,
    types:            d.types,
    type:             d.type,
    bin:              d.bin,
    scripts:          d.scripts,
    files:            d.files,
    dependencies:     d.dependencies,
    peerDependencies: d.peerDependencies,
    devDependencies:  d.devDependencies,
    engines:          d.engines,
  };
}

async function getVersions({ packageName }) {
  if (!packageName) throw new Error("get-versions requires `packageName`");
  const name = normalizeNpmPackageName(packageName);

  const res = await fetch(`${REGISTRY}/${encodePkgName(name)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Package "${name}" not found (${res.status})`);

  const data = await res.json();
  const time = data.time || {};

  const versions = Object.keys(data.versions || {})
    .map((v) => ({ version: v, published: time[v] || null }))
    .sort((a, b) => (a.published > b.published ? -1 : 1));

  return {
    name:    data.name,
    latest:  data["dist-tags"]?.latest,
    distTags: data["dist-tags"],
    versions,
  };
}

async function getDownloads({ packageName }) {
  if (!packageName) throw new Error("get-downloads requires `packageName`");
  const name = normalizeNpmPackageName(packageName);

  const [weeklyRes, monthlyRes] = await Promise.all([
    fetch(`${DOWNLOADS}/last-week/${encodePkgName(name)}`),
    fetch(`${DOWNLOADS}/last-month/${encodePkgName(name)}`),
  ]);

  if (!weeklyRes.ok && !monthlyRes.ok) {
    throw new Error(`Download stats for "${name}" not found (${weeklyRes.status})`);
  }

  const weekly  = weeklyRes.ok  ? (await weeklyRes.json()).downloads  : null;
  const monthly = monthlyRes.ok ? (await monthlyRes.json()).downloads : null;

  return { package: name, weekly, monthly };
}

async function getDependencies({ packageName, version }) {
  if (!packageName) throw new Error("get-dependencies requires `packageName`");
  const name = normalizeNpmPackageName(packageName);

  const url = version
    ? `${REGISTRY}/${encodePkgName(name)}/${version}`
    : `${REGISTRY}/${encodePkgName(name)}/latest`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Package "${name}" not found (${res.status})`);

  const d = await res.json();
  const deps     = d.dependencies || {};
  const devDeps  = d.devDependencies || {};
  const peerDeps = d.peerDependencies || {};
  const optDeps  = d.optionalDependencies || {};
  const totalDeps = Object.keys(deps).length + Object.keys(devDeps).length
    + Object.keys(peerDeps).length + Object.keys(optDeps).length;

  return {
    name:                 d.name,
    version:              d.version,
    dependencies:         deps,
    devDependencies:      devDeps,
    peerDependencies:     peerDeps,
    optionalDependencies: optDeps,
    totalDeps,
  };
}
