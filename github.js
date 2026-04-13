/**
 * tools/github.js
 *
 * GitHub public API — no auth needed for public repos.
 * Read files, search code, list releases, browse repo structure, compare tags.
 *
 * Tools:
 *   - get-file      → read a raw file from any public repo
 *   - list-dir      → list directory contents of a repo
 *   - search-code   → search code across GitHub (public repos)
 *   - get-releases  → list releases for a repo
 *   - get-repo-info → metadata about a repo (stars, description, topics)
 *   - compare-tags  → compare two tags/refs to see what changed
 */

const API  = "https://api.github.com";
const RAW  = "https://raw.githubusercontent.com";

const HEADERS = {
  Accept:     "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "axie-studio-tools/1.0",
};

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".avif", ".svg",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".flac",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".exe", ".dll", ".so", ".dylib", ".wasm",
]);

/**
 * Normalize various GitHub URL formats into { owner, repo, path?, ref? }.
 *
 * Supports:
 *   - Full URLs:  https://github.com/honojs/hono/blob/main/src/index.ts
 *   - Raw URLs:   https://raw.githubusercontent.com/honojs/hono/main/README.md
 *   - Short form: "honojs/hono", "honojs/hono/src/index.ts"
 */
export function normalizeGitHubUrl(url) {
  if (!url || typeof url !== "string") throw new Error("normalizeGitHubUrl requires a non-empty string");

  const trimmed = url.trim();

  // Full GitHub URL: https://github.com/owner/repo/blob/ref/path...
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/(?:blob|tree)\/([^/]+)(?:\/(.+))?)?$/,
  );
  if (ghMatch) {
    const result = { owner: ghMatch[1], repo: ghMatch[2] };
    if (ghMatch[3]) result.ref = ghMatch[3];
    if (ghMatch[4]) result.path = ghMatch[4];
    return result;
  }

  // Raw URL: https://raw.githubusercontent.com/owner/repo/ref/path...
  const rawMatch = trimmed.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.+))?$/,
  );
  if (rawMatch) {
    const result = { owner: rawMatch[1], repo: rawMatch[2], ref: rawMatch[3] };
    if (rawMatch[4]) result.path = rawMatch[4];
    return result;
  }

  // Simple strings: "owner/repo" or "owner/repo/path/to/file"
  const parts = trimmed.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2) throw new Error(`Cannot parse GitHub reference: "${url}"`);

  const result = { owner: parts[0], repo: parts[1] };
  if (parts.length > 2) result.path = parts.slice(2).join("/");
  return result;
}

/**
 * Extract rate limit info from GitHub API response headers.
 * Returns { remaining, limit, resetAt, message } or null if headers are absent.
 */
export function parseGitHubRateLimit(response) {
  if (!response || !response.headers) return null;

  const remaining = response.headers.get("x-ratelimit-remaining");
  const limit     = response.headers.get("x-ratelimit-limit");
  const reset     = response.headers.get("x-ratelimit-reset");

  if (remaining == null && limit == null) return null;

  const info = {
    remaining: remaining != null ? Number(remaining) : null,
    limit:     limit != null ? Number(limit) : null,
    resetAt:   reset ? new Date(Number(reset) * 1000).toISOString() : null,
  };

  if (info.remaining === 0) {
    info.message = `GitHub API rate limit exhausted. Resets at ${info.resetAt}. Use a GITHUB_TOKEN for higher limits.`;
  } else if (info.remaining != null && info.limit != null) {
    info.message = `${info.remaining}/${info.limit} requests remaining. Resets at ${info.resetAt}.`;
  }

  return info;
}

export const tools = [
  {
    name: "get-file",
    description:
      "Reads the raw content of a file in a public GitHub repo. " +
      "Great for checking source code of libraries like hono, ai SDK, drizzle. " +
      "Auto-detects binary files and warns instead of returning garbled text.",
    parameters: {
      owner:  "string — GitHub owner, e.g. 'honojs'",
      repo:   "string — repo name, e.g. 'hono'",
      path:   "string — file path inside repo, e.g. 'src/index.ts'",
      ref:    "string (optional) — branch/tag/commit, defaults to HEAD",
    },
  },
  {
    name: "list-dir",
    description:
      "Lists the contents of a directory in a public GitHub repo. " +
      "Returns file names, types, and sizes.",
    parameters: {
      owner: "string — GitHub owner",
      repo:  "string — repo name",
      path:  "string (optional) — directory path, defaults to root '/'",
      ref:   "string (optional) — branch/tag/commit, defaults to HEAD",
    },
  },
  {
    name: "search-code",
    description:
      "Searches code across GitHub public repos. " +
      "Use to find examples, implementations, or usages of specific APIs.",
    parameters: {
      query: "string — GitHub code search query, e.g. 'useAgentChat repo:honojs/agents'",
      language: "string (optional) — filter by programming language, e.g. 'typescript'",
      perPage: "number (optional) — results to return (default 10, max 30)",
    },
  },
  {
    name: "get-releases",
    description:
      "Lists releases for a GitHub repo, newest first. " +
      "Good for checking changelogs and what's new in a library.",
    parameters: {
      owner:   "string — GitHub owner",
      repo:    "string — repo name",
      perPage: "number (optional) — releases to return (default 10)",
    },
  },
  {
    name: "get-repo-info",
    description:
      "Returns metadata for a public GitHub repo: description, stars, topics, language, homepage.",
    parameters: {
      owner: "string — GitHub owner",
      repo:  "string — repo name",
    },
  },
  {
    name: "compare-tags",
    description:
      "Compare two tags, branches, or commits to see what changed between them. " +
      "Useful for checking what's new between releases.",
    parameters: {
      owner: "string — GitHub owner",
      repo:  "string — repo name",
      base:  "string — base tag/branch/commit, e.g. 'v4.0.0'",
      head:  "string — head tag/branch/commit, e.g. 'v4.1.0'",
    },
  },
];

/**
 * invoke(toolName, args)
 *
 * @example
 * const { content }  = await invoke("get-file", { owner: "honojs", repo: "hono", path: "src/index.ts" });
 * const { entries }  = await invoke("list-dir", { owner: "honojs", repo: "agents", path: "src" });
 * const { items }    = await invoke("search-code", { query: "DurableObject agents hono" });
 * const { releases } = await invoke("get-releases", { owner: "better-auth", repo: "better-auth" });
 * const { repo }     = await invoke("get-repo-info", { owner: "drizzle-team", repo: "drizzle-orm" });
 */
export async function invoke(toolName, args = {}) {
  switch (toolName) {
    case "get-file":
      return getFile(args);
    case "list-dir":
      return listDir(args);
    case "search-code":
      return searchCode(args);
    case "get-releases":
      return getReleases(args);
    case "get-repo-info":
      return getRepoInfo(args);
    case "compare-tags":
      return compareTags(args);
    default:
      throw new Error(`Unknown github tool: "${toolName}"`);
  }
}

// ─── Internal handlers ────────────────────────────────────────────────────────

function isBinaryPath(filePath) {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return false;
  return BINARY_EXTENSIONS.has(filePath.slice(dot).toLowerCase());
}

async function getFile({ owner, repo, path, ref = "HEAD" }) {
  if (!owner || !repo || !path) throw new Error("get-file requires `owner`, `repo`, and `path`");

  if (isBinaryPath(path)) {
    return {
      owner, repo, path, ref,
      content: null,
      binary: true,
      warning: `Skipped binary file: ${path}. Use the GitHub web UI or download it directly.`,
    };
  }

  // Use raw endpoint — simpler, no base64 decoding needed
  const url = `${RAW}/${owner}/${repo}/${ref}/${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "axie-studio-tools/1.0" } });

  if (!res.ok) throw new Error(`File not found: ${owner}/${repo}/${path} (${res.status})`);

  const content = await res.text();
  const size = res.headers.get("content-length");
  const result = { owner, repo, path, ref, content };
  if (size) result.size = Number(size);
  return result;
}

async function listDir({ owner, repo, path = "", ref }) {
  if (!owner || !repo) throw new Error("list-dir requires `owner` and `repo`");

  const encodedPath = path ? `/${encodeURIComponent(path).replace(/%2F/g, "/")}` : "";
  const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const url = `${API}/repos/${owner}/${repo}/contents${encodedPath}${refParam}`;

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Directory not found: ${owner}/${repo}/${path} (${res.status})`);

  const data = await res.json();
  const entries = (Array.isArray(data) ? data : [data]).map((item) => ({
    name: item.name,
    type: item.type,
    size: item.size,
    path: item.path,
  }));

  return { owner, repo, path, entries };
}

async function searchCode({ query, language, perPage = 10 }) {
  if (!query) throw new Error("search-code requires `query`");

  let q = query;
  if (language) q += ` language:${language}`;

  const params = new URLSearchParams({
    q:        q,
    per_page: String(Math.min(perPage, 30)),
  });

  const searchHeaders = {
    ...HEADERS,
    Accept: "application/vnd.github.text-match+json",
  };

  const res = await fetch(`${API}/search/code?${params}`, { headers: searchHeaders });

  if (res.status === 403) {
    const rateInfo = parseGitHubRateLimit(res);
    const data = await res.json();
    const msg = rateInfo?.message || data.message;
    throw new Error(`GitHub rate limit or auth required: ${msg}`);
  }
  if (!res.ok) throw new Error(`GitHub code search failed: ${res.status}`);

  const data = await res.json();
  const items = (data.items || []).map((item) => {
    const mapped = {
      name:       item.name,
      path:       item.path,
      repo:       item.repository.full_name,
      url:        item.html_url,
      score:      item.score,
    };
    if (item.text_matches?.length) {
      mapped.text_matches = item.text_matches.map((m) => ({
        fragment: m.fragment,
        matches:  m.matches?.map((mm) => ({ text: mm.text, indices: mm.indices })),
      }));
    }
    return mapped;
  });

  return { total: data.total_count, items };
}

async function getReleases({ owner, repo, perPage = 10 }) {
  if (!owner || !repo) throw new Error("get-releases requires `owner` and `repo`");

  const params = new URLSearchParams({ per_page: String(Math.min(perPage, 100)) });
  const res = await fetch(`${API}/repos/${owner}/${repo}/releases?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Could not fetch releases for ${owner}/${repo}: ${res.status}`);

  const data = await res.json();
  const releases = data.map((r) => ({
    tag:         r.tag_name,
    name:        r.name,
    published:   r.published_at,
    prerelease:  r.prerelease,
    body:        r.body,
    url:         r.html_url,
  }));

  return { owner, repo, releases };
}

async function getRepoInfo({ owner, repo }) {
  if (!owner || !repo) throw new Error("get-repo-info requires `owner` and `repo`");

  const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Repo ${owner}/${repo} not found: ${res.status}`);

  const d = await res.json();
  return {
    fullName:    d.full_name,
    description: d.description,
    homepage:    d.homepage,
    language:    d.language,
    stars:       d.stargazers_count,
    forks:       d.forks_count,
    topics:      d.topics,
    defaultBranch: d.default_branch,
    license:     d.license?.name,
    updatedAt:   d.updated_at,
    url:         d.html_url,
  };
}

async function compareTags({ owner, repo, base, head }) {
  if (!owner || !repo || !base || !head) {
    throw new Error("compare-tags requires `owner`, `repo`, `base`, and `head`");
  }

  const url = `${API}/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Compare failed for ${owner}/${repo} ${base}...${head}: ${res.status}`);

  const d = await res.json();
  return {
    owner,
    repo,
    base,
    head,
    status:        d.status,
    ahead_by:      d.ahead_by,
    behind_by:     d.behind_by,
    total_commits: d.total_commits,
    files_changed: d.files?.length ?? 0,
    commits:       (d.commits || []).map((c) => ({
      sha:     c.sha?.slice(0, 7),
      message: c.commit?.message?.split("\n")[0],
      author:  c.commit?.author?.name,
      date:    c.commit?.author?.date,
    })),
  };
}
