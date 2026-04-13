# Browser Tools

Minimal CDP tools for site exploration and scraping. Use `puppeteer-core` via Chrome on `:9222`.
All scripts: `bun tools/browser/<script>.js`

## Start Chrome

```bash
bun tools/browser/start.js              # Fresh profile
bun tools/browser/start.js --profile    # Copy your Chrome profile (cookies, logins)
```

## Navigate

```bash
bun tools/browser/nav.js https://example.com        # Current tab
bun tools/browser/nav.js https://example.com --new  # New tab
```

## Execute JavaScript

```bash
bun tools/browser/eval.js 'document.title'
bun tools/browser/eval.js 'document.querySelectorAll("a").length'
bun tools/browser/eval.js 'await fetch("/api").then(r=>r.json())'
```

## Screenshot

```bash
bun tools/browser/screenshot.js           # Viewport → returns temp PNG path
bun tools/browser/screenshot.js --full    # Full-page
bun tools/browser/screenshot.js '#hero'  # Specific element
```

## Get Page Text

```bash
bun tools/browser/get-text.js             # Full readable page text
bun tools/browser/get-text.js '#main'    # From CSS selector
bun tools/browser/get-text.js --markdown # Convert to Markdown
```

## Wait for Element

```bash
bun tools/browser/wait.js '.loaded'       # Wait up to 5s
bun tools/browser/wait.js '#btn' 15       # Custom timeout (seconds)
```

## Scroll

```bash
bun tools/browser/scroll.js bottom              # Scroll to bottom
bun tools/browser/scroll.js top                 # Scroll to top
bun tools/browser/scroll.js 500                 # Scroll down by px
bun tools/browser/scroll.js '#footer'          # Scroll element into view
bun tools/browser/scroll.js bottom --wait 2    # Wait 2s after (infinite scroll)
```

## Pick DOM Elements

```bash
bun tools/browser/pick.js "Click the submit button"
```

Interactive picker. Click = single select (done). Ctrl+Click = multi-select. Enter = finish. Esc = cancel.
Returns: `tag`, `selector`, `text`, `html`, `x/y/width/height`.

## Extract Links

```bash
bun tools/browser/links.js               # All links: "text :: href"
bun tools/browser/links.js 'product'    # Filter by text or href pattern
bun tools/browser/links.js --json       # JSON output
bun tools/browser/links.js --absolute   # Force absolute URLs
```

## Fill Form / Click

```bash
bun tools/browser/fill.js '#email' user@example.com         # Type into field
bun tools/browser/fill.js '#email' user@example.com --submit # Type + press Enter
bun tools/browser/fill.js '#submit' --click                  # Click element
bun tools/browser/fill.js '#lang' 'English' --select        # Select dropdown
```

## Get Cookies

```bash
bun tools/browser/cookies.js              # All cookies as JSON (incl. HTTP-only)
bun tools/browser/cookies.js 'session'   # Filter by name pattern
bun tools/browser/cookies.js --curl      # Output as curl --cookie flag
bun tools/browser/cookies.js --env       # Output as shell export statements
```
