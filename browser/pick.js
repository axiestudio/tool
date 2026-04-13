#!/usr/bin/env node
/**
 * tools/browser/pick.js
 *
 * Interactive DOM element picker. Click elements to get their selectors,
 * text, and parent info — then hand that context to the agent.
 *
 * Usage:
 *   bun tools/browser/pick.js "Click the submit button"
 *   bun tools/browser/pick.js "Select all product cards"  # Ctrl+Click for multi-select
 *
 * Controls:
 *   Click           — select single element (done immediately)
 *   Ctrl/Cmd+Click  — add to multi-selection
 *   Enter           — finish multi-selection
 *   Escape          — cancel
 */

import { connect } from "./shared.js";

const message = process.argv.slice(2).join(" ");
if (!message) {
  console.log("Usage: pick.js '<instruction>'");
  console.log("Example: pick.js \"Click the login button\"");
  process.exit(1);
}

const b = await connect();
const p = (await b.pages()).at(-1);

if (!p) {
  console.error("✗ No active tab found");
  await b.disconnect();
  process.exit(1);
}

// Inject the picker UI into the page
await p.evaluate(() => {
  if (window.__axie_pick__) return; // already injected

  window.__axie_pick__ = async (msg) => {
    return new Promise((resolve) => {
      const selections = [];
      const selectedEls = new Set();

      // Overlay captures events
      const overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;";

      // Hover highlight box
      const hl = document.createElement("div");
      hl.style.cssText =
        "position:absolute;border:2px solid #6366f1;background:rgba(99,102,241,0.08);transition:all 0.08s;pointer-events:none;";
      overlay.appendChild(hl);

      // Info banner
      const banner = document.createElement("div");
      banner.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);" +
        "background:#1e1b4b;color:#e0e7ff;padding:12px 22px;border-radius:10px;" +
        "font:500 13px/1.5 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4);" +
        "pointer-events:auto;z-index:2147483647;white-space:nowrap;";
      const updateBanner = () => {
        banner.textContent = selections.length > 0
          ? `${msg} (${selections.length} selected • Ctrl+Click to add • Enter to finish • Esc to cancel)`
          : `${msg} (Click to pick • Ctrl+Click for multi-select • Esc to cancel)`;
      };
      updateBanner();

      document.body.append(overlay, banner);

      const cleanup = () => {
        overlay.remove();
        banner.remove();
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKey, true);
        for (const el of selectedEls) el.style.outline = "";
      };

      const buildInfo = (el) => {
        // Build CSS selector
        const parts = [];
        let cur = el;
        while (cur && cur !== document.body) {
          let part = cur.tagName.toLowerCase();
          if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
          if (cur.className) {
            const cls = [...cur.classList].slice(0, 3).join(".");
            if (cls) part += `.${cls}`;
          }
          const siblings = Array.from(cur.parentElement?.children ?? []).filter(c => c.tagName === cur.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
          parts.unshift(part);
          cur = cur.parentElement;
        }
        const rect = el.getBoundingClientRect();
        return {
          tag:      el.tagName.toLowerCase(),
          id:       el.id || null,
          classes:  el.className || null,
          selector: parts.join(" > "),
          text:     el.textContent?.trim().replace(/\s+/g, " ").slice(0, 200) || null,
          html:     el.outerHTML.slice(0, 500),
          x:        Math.round(rect.x),
          y:        Math.round(rect.y),
          width:    Math.round(rect.width),
          height:   Math.round(rect.height),
        };
      };

      const onMove = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || overlay.contains(el) || banner.contains(el)) return;
        const r = el.getBoundingClientRect();
        hl.style.cssText = hl.style.cssText.replace(/top:[^;]+;left:[^;]+;width:[^;]+;height:[^;]+/, "")
          + `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;`;
      };

      const onClick = (e) => {
        if (banner.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || overlay.contains(el) || banner.contains(el)) return;

        if (e.metaKey || e.ctrlKey) {
          if (!selectedEls.has(el)) {
            selectedEls.add(el);
            el.style.outline = "3px solid #10b981";
            selections.push(buildInfo(el));
            updateBanner();
          }
        } else {
          cleanup();
          resolve(selections.length ? [...selections, buildInfo(el)] : buildInfo(el));
        }
      };

      const onKey = (e) => {
        if (e.key === "Escape")  { e.preventDefault(); cleanup(); resolve(null); }
        if (e.key === "Enter" && selections.length > 0) { e.preventDefault(); cleanup(); resolve(selections); }
      };

      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKey, true);
    });
  };
});

const result = await p.evaluate((msg) => window.__axie_pick__(msg), message);

if (result === null) {
  console.log("(cancelled)");
} else if (Array.isArray(result)) {
  for (let i = 0; i < result.length; i++) {
    if (i > 0) console.log("");
    for (const [k, v] of Object.entries(result[i])) {
      if (v !== null) console.log(`${k}: ${v}`);
    }
  }
} else {
  for (const [k, v] of Object.entries(result)) {
    if (v !== null) console.log(`${k}: ${v}`);
  }
}

await b.disconnect();
