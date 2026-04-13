import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAppleDocumentationDataUrl,
  normalizeAppleDocumentationPath,
  renderAppleDocMarkdown,
} from "../ar-ios-docs.js";

test("normalizeAppleDocumentationPath accepts URLs and bare documentation paths", () => {
  assert.equal(
    normalizeAppleDocumentationPath("https://developer.apple.com/documentation/arkit/arsession"),
    "/documentation/arkit/arsession",
  );
  assert.equal(
    normalizeAppleDocumentationPath("documentation/arkit"),
    "/documentation/arkit",
  );
});

test("buildAppleDocumentationDataUrl maps documentation paths to Apple's JSON endpoint", () => {
  assert.equal(
    buildAppleDocumentationDataUrl("/documentation/arkit/arsession"),
    "https://developer.apple.com/tutorials/data/documentation/arkit/arsession.json",
  );
});

test("renderAppleDocMarkdown converts structured Apple documentation JSON into readable markdown", () => {
  const markdown = renderAppleDocMarkdown({
    metadata: { title: "ARSession" },
    abstract: [{ type: "text", text: "Coordinates the main AR lifecycle." }],
    primaryContentSections: [
      {
        kind: "content",
        content: [
          { type: "heading", level: 2, text: "Overview" },
          {
            type: "paragraph",
            inlineContent: [
              { type: "text", text: "Use " },
              { type: "codeVoice", code: "ARSession" },
              { type: "text", text: " to drive tracking." },
            ],
          },
          {
            type: "codeListing",
            syntax: "swift",
            code: ["let session = ARSession()"],
          },
        ],
      },
    ],
  });

  assert.ok(markdown.includes("# ARSession"));
  assert.ok(markdown.includes("## Overview"));
  assert.ok(markdown.includes("`ARSession`"));
  assert.ok(markdown.includes("```swift"));
});