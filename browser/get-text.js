#!/usr/bin/env node
/**
 * tools/browser/get-text.js
 *
 * Extract readable text content from the active tab.
 * Strips scripts, styles, and markup noise — great for reading page content.
 *
 * Usage:
 *   bun tools/browser/get-text.js              # Full page text
 *   bun tools/browser/get-text.js '#main'      # Text from CSS selector
 *   bun tools/browser/get-text.js --markdown   # Convert headings/links to Markdown
 */

import { connect } from "./shared.js";

const args = process.argv.slice(2);
const markdownMode = args.includes("--markdown");
const selector = args.find(a => !a.startsWith("--"));

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

const text = await p.evaluate((sel, md) => {
  // Remove noisy elements
  const noisy = ["script", "style", "noscript", "iframe", "svg", "nav", "footer", "header"];

  function getMarkdown(el) {
    const tag = el.tagName?.toLowerCase();
    if (noisy.includes(tag)) return "";

    if (tag === "a") {
      const href = el.getAttribute("href");
      const text = el.innerText?.trim();
      return href && text ? `[${text}](${href})` : text || "";
    }
    if (tag?.match(/^h[1-6]$/)) {
      const level = int(tag[1]);
      return `${"#".repeat(level)} ${el.innerText?.trim()}\n`;
    }
    if (tag === "li") return `• ${el.innerText?.trim()}\n`;
    if (tag === "code" || tag === "pre") return `\`${el.innerText?.trim()}\``;

    return Array.from(el.childNodes).map(n => {
      if (n.nodeType === 3) return n.textContent?.trim() || "";
      if (n.nodeType === 1) return getMarkdown(n);
      return "";
    }).filter(Boolean).join(" ");
  }

  const int = Number.parseInt;

  const root = sel ? document.querySelector(sel) : document.body;
  if (!root) return `(selector not found: ${sel})`;

  if (md) {
    return getMarkdown(root)
      .replace(/ +/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Plain text: use innerText which respects CSS display
  const clone = root.cloneNode(true);
  for (const el of clone.querySelectorAll(noisy.join(","))) el.remove();
  return (clone.innerText ?? clone.textContent ?? "")
    .replace(/ +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}, selector || null, markdownMode);

console.log(text);
await b.disconnect();
