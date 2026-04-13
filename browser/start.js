#!/usr/bin/env node
/**
 * tools/browser/start.js
 *
 * Launch Chrome with remote debugging on :9222.
 * Cross-platform: Windows / macOS / Linux.
 *
 * Usage:
 *   bun tools/browser/start.js              # Fresh profile
 *   bun tools/browser/start.js --profile    # Copy your real Chrome profile
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir, platform, tmpdir } from "node:os";
import { join } from "node:path";
import { loadPuppeteer } from "./shared.js";

const useProfile = process.argv[2] === "--profile";
const IS_WIN = platform() === "win32";
const IS_MAC = platform() === "darwin";

// ── Chrome executable ────────────────────────────────────────────────────────

function findChrome() {
  if (IS_WIN) {
    const candidates = [
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      join(homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
    ];
    for (const c of candidates) if (existsSync(c)) return c;
    throw new Error("Chrome not found. Install Google Chrome from https://google.com/chrome");
  }
  if (IS_MAC) {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  // Linux
  for (const bin of ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"]) {
    if (existsSync(bin)) return bin;
  }
  throw new Error("Chrome/Chromium not found. Install via your package manager.");
}

// ── Profile paths ────────────────────────────────────────────────────────────

function profileSource() {
  if (IS_WIN) {
    return join(
      process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
      "Google", "Chrome", "User Data",
    );
  }
  if (IS_MAC) return join(homedir(), "Library", "Application Support", "Google", "Chrome");
  return join(homedir(), ".config", "google-chrome");
}

const cacheDir = IS_WIN
  ? join(tmpdir(), "scraping-profile")
  : join(homedir(), ".cache", "scraping");

// ── Kill existing Chrome ──────────────────────────────────────────────────────

function killChrome() {
  try {
    if (IS_WIN) {
      execSync("taskkill /F /IM chrome.exe /T", { stdio: "ignore" });
    } else {
      execSync("killall 'Google Chrome' 2>/dev/null; killall google-chrome 2>/dev/null; true", { stdio: "ignore", shell: true });
    }
  } catch {}
}

// ── Copy profile ─────────────────────────────────────────────────────────────

function copyProfile() {
  const src = profileSource();
  if (!existsSync(src)) {
    throw new Error(`Chrome profile not found at: ${src}`);
  }
  console.log("Copying Chrome profile (first run may take a moment)...");
  mkdirSync(cacheDir, { recursive: true });

  // Exclude heavy cache dirs that don't help with auth
  const exclude = ["ShaderCache", "GPUCache", "Code Cache", "GrShaderCache", "DawnCache"];

  if (IS_WIN) {
    const excludeArgs = exclude.map(d => `/XD "${d}"`).join(" ");
    // robocopy returns non-zero even on success — ignore exit code
    try {
      execSync(
        `robocopy "${src}" "${cacheDir}" /E /NFL /NDL /NJH /NJS /NC /NS /NP ${excludeArgs}`,
        { stdio: "pipe" },
      );
    } catch {}
  } else {
    const excludeArgs = exclude.map(d => `--exclude="${d}/"`).join(" ");
    execSync(`rsync -a --delete ${excludeArgs} "${src}/" "${cacheDir}/"`, { stdio: "pipe" });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

killChrome();
await new Promise(r => setTimeout(r, 1000));

mkdirSync(cacheDir, { recursive: true });

if (useProfile) {
  copyProfile();
}

const chrome = findChrome();
spawn(chrome, ["--remote-debugging-port=9222", `--user-data-dir=${cacheDir}`], {
  detached: true,
  stdio: "ignore",
}).unref();

// Poll until Chrome is ready
const puppeteer = await loadPuppeteer();
let connected = false;
for (let i = 0; i < 30; i++) {
  try {
    const browser = await puppeteer.connect({ browserURL: "http://localhost:9222", defaultViewport: null });
    await browser.disconnect();
    connected = true;
    break;
  } catch {
    await new Promise(r => setTimeout(r, 500));
  }
}

if (!connected) {
  console.error("✗ Failed to connect to Chrome after 15 seconds");
  process.exit(1);
}

console.log(`✓ Chrome started on :9222${useProfile ? " with your profile" : " (fresh profile)"}`);
