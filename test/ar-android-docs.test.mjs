import assert from "node:assert/strict";
import test from "node:test";

import {
  extractAndroidDocMarkdownFromHtml,
  normalizeAndroidDocumentationPath,
} from "../ar-android-docs.js";

test("normalizeAndroidDocumentationPath accepts full URLs and repo-style paths", () => {
  assert.equal(
    normalizeAndroidDocumentationPath("https://developers.google.com/ar/develop/scene-viewer"),
    "/ar/develop/scene-viewer",
  );
  assert.equal(
    normalizeAndroidDocumentationPath("ar/develop/runtime"),
    "/ar/develop/runtime",
  );
});

test("extractAndroidDocMarkdownFromHtml converts Google docs HTML into readable markdown", () => {
  const markdown = extractAndroidDocMarkdownFromHtml(`
    <!DOCTYPE html>
    <html>
      <body>
        <main>
          <h1>Using Scene Viewer</h1>
          <p>Launch immersive AR from Android.</p>
          <h2>Launch Scene Viewer using an explicit intent</h2>
          <pre><code>&lt;a href="intent://arvr.google.com/scene-viewer/1.1"&gt;Open&lt;/a&gt;</code></pre>
        </main>
      </body>
    </html>
  `, "/ar/develop/scene-viewer");

  assert.ok(markdown.includes("# Using Scene Viewer"));
  assert.ok(markdown.includes("## Launch Scene Viewer using an explicit intent"));
  assert.ok(markdown.includes("Launch immersive AR from Android."));
  assert.ok(markdown.includes("```text"));
  assert.ok(markdown.includes("intent://arvr.google.com/scene-viewer/1.1"));
});