# draw.ai — Status

## Product Completion Pass

This document reflects the real, verified state of the app after the product
completion pass. It supersedes the earlier "MVP complete" claims.

## Verification (reproduce locally)

```bash
corepack pnpm@9.15.9 install --frozen-lockfile   # ✅ lockfile up to date
corepack pnpm@9.15.9 test -- --run                # ✅ 91 unit/integration tests
corepack pnpm@9.15.9 build                        # ✅ production build + type check
corepack pnpm@9.15.9 lint                         # ✅ ESLint flat config, 0 problems
corepack pnpm@9.15.9 test:e2e                     # ✅ 108 Playwright tests (Chromium + WebKit; build first)
```

Browser-validated at desktop 1280×720 and mobile 390×844, on Chromium and WebKit.

## Production hardening (Phase 0)

Correctness blockers fixed so the editor is safe for real work:

- **Undo/redo coalescing** — a drag, resize, color-picker sweep, or slider is now
  a *single* undo step (was one entry per mousemove). History is capped at 100.
  (`beginInteraction`/`updateLive`/`commitInteraction` in the store; `diffDiagrams`.)
- **Autosave + restore** — the diagram is debounced-saved to localStorage and
  restored on reload (`lib/persistence.ts`); corrupt/invalid data is ignored.
- **Touch support** — the canvas uses pointer events (`touch-action: none`) so
  drag/select/connect/resize work on touch devices, plus two-finger pinch-zoom.
- **AI endpoint hardening** — `/api/chat` is rate-limited per client
  (`lib/rateLimit.ts`) and the diagram is sent to the model as a compact,
  size-capped payload so prompt tokens stay bounded.
- **Resilience** — failed diffs surface a toast instead of vanishing; an
  app-level `ErrorBoundary` replaces white-screens with a recovery UI.
- **Mobile drop position (K5)** — new shapes drop clear of the toolbar/sheet.

## What was completed (P0)

- **Manual connectors** — connector tool (toolbar + palette) and drag-from-handle;
  pointer-tracked preview; edges are selectable, stylable, copyable, deletable,
  and undoable; self-connections rejected. Unit tests + a browser test.
- **Honest shape library** — model extended with `shapeKind`; the palette only
  advertises shapes the renderer draws, identically on canvas and in SVG export;
  connector palette items enter connect mode (no transparent rectangles). Legacy
  `type: rect|ellipse|diamond|text` diagrams still load.
- **AI consolidation** — single streaming route `/api/chat` (the old `/api/agent`
  route was removed). The panel exposes Generate, Cleanup Layout, and Explain
  with loading/error/preview/applied/rejected states. Cleanup uses local ELK
  (no key). Mocked route tests run without `OPENAI_API_KEY`.
- **Import/Export** — PNG (canvas raster), Mermaid export and import
  (`flowchart TD/LR`), SVG with XML escaping. Invalid inputs surface non-crashing
  toast errors. Unit tests for escaping, PNG, Mermaid round-trip, and invalid inputs.

## What was completed (P1)

- **ELK layout** (`lib/layout/elk.ts`) — hierarchical layout honoring node sizes,
  edge direction, spacing, and selected-subset scope; deterministic; grid fallback.
- **Keyboard shortcuts** — Delete/Backspace, ⌘Z / ⇧⌘Z / Ctrl+Y, ⌘C/V/A/S/D,
  ⌘G/⇧⌘G, arrow-key nudge; disabled while typing.
- **Inspector** — node (text, x/y, w/h, fill, stroke, stroke width, font size,
  font family, opacity) and edge (stroke, width, label, arrowheads, route, dashed)
  with multi-select mixed values and batch edits; z-order menu replaces the dead
  Layers button.
- **Tooling** — `packageManager: pnpm@9.15.9`, ESLint migrated to a flat config
  (`eslint.config.mjs`) and CLI, `next.config.js` is CommonJS (no module warning),
  Playwright smoke suite added.

## What was completed (P2, partial)

- **Error handling** — toast notifications replace `alert()` for JSON/AI/export/
  layout failures, with success states.
- **Responsive** — mobile (390×844) bottom-sheet inspector + compact palette;
  add/select/style/Agent all reachable.

## Launch hardening (done)

- **Dependencies** — removed `streamdown` (it pulled in mermaid + dompurify):
  vulnerabilities **9 → 1** (the last is a build-time `@babel/core` advisory inside
  Next, not runtime-exploitable). 0 moderate/high/critical.
- **Bundle** — first-load JS **670 KB → 484 KB** (streamdown removal + the AI
  panel is now `next/dynamic` code-split).
- **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, HSTS, Permissions-Policy (`next.config.js`), verified live.
- **SEO/branding** — favicon (`app/icon.svg`), dynamic OG image
  (`app/opengraph-image.tsx`), `app/robots.ts`, full metadata + `metadataBase`.
- **Dead UI removed** — palette search is now functional; the fake scratchpad and
  "More Shapes" button are gone.
- **Dark mode** — forced light (canvas is light-only) to avoid a half-themed UI.
- **CI** — `.github/workflows/ci.yml` runs lint + unit + build + Playwright
  (Chromium & WebKit) with the AI key cleared.

## Remaining before a public launch (needs your accounts / Phase 2)

See `DEPLOYMENT.md` for exact commands.

- **Deploy to Vercel** + **Sentry** error monitoring (account-gated).
- **Live LLM verification** — one manual run with a real key; add a repair/retry
  loop on invalid AI diffs.
- **Rate limiter** is per-instance (in-memory) — add a shared store for scale.
- Phase 2 UX/a11y: text wrapping, edge waypoints/reconnect, marquee select,
  fit-to-view, drag-from-palette, focusable nodes + ARIA + contrast.

## Not in scope

- Force-directed / circular / tree layouts, multi-page, real-time collaboration,
  comments, version history, PDF export, Excalidraw, and embed mode.
- Group/ungroup have store actions + shortcuts but no on-canvas grouping visuals.
