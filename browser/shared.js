/**
 * Shared helper for browser tools.
 * Lazy-loads puppeteer-core with a friendly error if it's missing.
 * Works with Node.js, Bun, and Deno.
 */

let _puppeteer;

async function load() {
  if (_puppeteer) return _puppeteer;
  try {
    _puppeteer = (await import("puppeteer-core")).default;
    return _puppeteer;
  } catch {
    console.error(
      "puppeteer-core is required for browser tools but is not installed.\n\n" +
        "Install it with your preferred runtime:\n" +
        "  npm install puppeteer-core\n" +
        "  bun add puppeteer-core\n" +
        "  pnpm add puppeteer-core\n" +
        "  yarn add puppeteer-core\n"
    );
    process.exit(1);
  }
}

export async function connect() {
  const puppeteer = await load();
  try {
    return await puppeteer.connect({
      browserURL: "http://127.0.0.1:9222",
      defaultViewport: null,
    });
  } catch {
    console.error(
      "Cannot connect to Chrome on port 9222.\n" +
        "Start Chrome first:\n" +
        "  node browser/start.js\n" +
        "  bun browser/start.js\n"
    );
    process.exit(1);
  }
}

export async function activePage(browser) {
  const pages = await browser.pages();
  return pages[pages.length - 1] || (await browser.newPage());
}

export { load as loadPuppeteer };
