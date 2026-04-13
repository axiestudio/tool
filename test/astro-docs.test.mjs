import assert from "node:assert/strict";
import test from "node:test";

import { extractAstroMarkdownFromHtml, normalizeAstroDocPath } from "../astro-docs.js";

test("normalizeAstroDocPath rewrites known Astro guide aliases", () => {
  assert.equal(normalizeAstroDocPath("/en/guides/integrations-guide/"), "/en/guides/integrations/");
  assert.equal(normalizeAstroDocPath("en/guides/integrations-guide"), "/en/guides/integrations/");
});

test("extractAstroMarkdownFromHtml converts Astro docs HTML to readable markdown", () => {
  const markdown = extractAstroMarkdownFromHtml(`
    <!DOCTYPE html>
    <html>
      <body>
        <main data-pagefind-body>
          <div class="content-panel">
            <div class="sl-container">
              <h1 id="_top">Content collections</h1>
            </div>
          </div>
          <div class="content-panel">
            <div class="sl-container">
              <div class="sl-markdown-content">
                <p><strong>Content collections</strong> help organize content.</p>
                <div class="sl-heading-wrapper level-h2">
                  <h2 id="what-are-content-collections">What are Content Collections?</h2>
                </div>
                <p>They provide type-safe content APIs.</p>
                <pre data-language="js"><code><div class="ec-line"><div class="code">const value = 1;</div></div><div class="ec-line"><div class="code">console.log(value);</div></div></code></pre>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  `, "/en/guides/content-collections/");

  assert.ok(markdown.includes("# Content collections"));
  assert.ok(markdown.includes("## What are Content Collections?"));
  assert.ok(markdown.includes("**Content collections** help organize content."));
  assert.ok(markdown.includes("```js"));
  assert.ok(markdown.includes("const value = 1;"));
  assert.ok(!markdown.includes("<!DOCTYPE html>"));
});