# draw.ai — Test & Validation Plan

Living checklist of everything that must be tested, organized by user flow.

**Coverage legend**
- 🟢 Automated (Vitest unit/integration or Playwright e2e)
- 🟡 Partial (core logic unit-tested; UI/interaction via e2e or manual)
- 🔴 Manual only
- ⛔ Out of scope / not built

## Run commands
```
corepack pnpm@9.15.9 install --frozen-lockfile
corepack pnpm@9.15.9 test -- --run     # unit/integration (Vitest)
corepack pnpm@9.15.9 build
corepack pnpm@9.15.9 lint
corepack pnpm@9.15.9 build && corepack pnpm@9.15.9 test:e2e   # Playwright
```
E2E runs the production server with `OPENAI_API_KEY=""` so the AI path is always
the offline fallback — no credits are ever spent and results are deterministic.

## Environments
- Viewports: desktop 1280×720, mobile 390×844 (+ manual: 1440×900, 768×1024).
- Browsers: Chromium + WebKit automated (Playwright projects); Firefox manual.
- AI: offline (no key) automated; live key manual/opt-in only.
- Data: empty, small, large (100+), legacy JSON (no `shapeKind`).

---

## Flows & coverage

### A. Canvas navigation
- [x] A1 Pan by dragging empty canvas — 🟢 canvas.spec
- [x] A2 Zoom with wheel — 🟢 canvas.spec
- [x] A3 Change grid size in inspector — 🟢 inspector.spec
- [x] A4 Toggle snap — 🟢 inspector.spec

### B. Add shapes / render parity (P0)
- [x] B1 Add all 16 palette shapes, assert `data-shape-kind` — 🟢 shapes.spec
- [x] B2 SVG export primitive parity per kind — 🟢 svg.test
- [x] B3 `resolveShapeKind` legacy fallback — 🟢 render.test
- [x] B4 Text node renders/selectable — 🟢 shapes.spec
- [x] B5 Connector palette item enters connect mode, adds no node — 🟢 connectors.spec

### C. Select & manipulate nodes
- [x] C1 Click selects (handles appear) — 🟢 nodes.spec
- [x] C2 Shift-click multi-select — 🟢 nodes.spec
- [x] C3 Drag to move — 🟢 nodes.spec / smoke
- [x] C4 Resize via corner handle (min sizes) — 🟢 nodes.spec
- [x] C5 Double-click to edit text — 🟢 nodes.spec
- [x] C6 Click empty deselects — 🟢 nodes.spec

### D. Connectors (P0)
- [x] D1 Connector tool click-click creates edge — 🟢 smoke/connectors.spec
- [x] D2 Preview follows pointer — 🟢 connectors.spec
- [x] D3 Drag from green handle — 🟢 connectors.spec
- [x] D4 Self-connect rejected — 🟢 store.test + connectors.spec
- [x] D5 Release over empty cancels — 🟢 connectors.spec
- [x] D6 Esc exits connect mode — 🟢 connectors.spec
- [x] D7 Select edge → delete → undo — 🟢 connectors.spec
- [x] D8 Border clipping / move re-routes — 🟡 edges.test geometry

### E. Editing operations
- [x] E1 Delete/Backspace cascade — 🟢 store.test + smoke
- [x] E2 Copy/paste — 🟢 editing.spec + store.test
- [x] E3 Duplicate (⌘D) — 🟢 editing.spec + store.test
- [x] E4 Undo/Redo — 🟢 smoke + editing.spec
- [x] E5 Select all (⌘A) — 🟢 store.test + editing.spec
- [x] E6 Group/ungroup (⌘G/⇧⌘G) — 🟢 store.test
- [x] E7 Z-order bring/send — 🟢 editing.spec + store.test
- [x] E8 Arrow-key nudge — 🟢 editing.spec + store.test

### F. Inspector & styling (P1)
- [x] F1 Node geometry/text edits — 🟢 inspector.spec
- [x] F2 Node fill/stroke/width/font/opacity — 🟢 inspector.spec
- [x] F3 Multi-select mixed values + batch — 🟢 inspector.spec
- [x] F4 Edge inspector fields — 🟢 inspector.spec
- [x] F5 Route change redraws — 🟢 inspector.spec
- [x] F6 Dashed / arrowheads + export — 🟡 svg.test
- [x] F7 Node↔edge inspector swap — 🟢 inspector.spec
- [x] F8 Diagram counts/grid/snap — 🟢 inspector.spec

### G. Keyboard shortcuts (P1)
- [x] G1 Core shortcuts fire — 🟢 editing.spec/shortcuts.spec
- [x] G2 Typing guard (no fire while in input) — 🟢 shortcuts.spec
- [x] G3 ⌘S saves — 🟢 files.spec

### H. AI agent (P0) — offline automated, live manual
- [x] H1 Generate fallback diff preview — 🟢 ai.spec + chat-route.test
- [x] H2 Cleanup Layout (no key) — 🟢 ai.spec + chat-route.test
- [x] H3 Explain (offline guidance) — 🟢 ai.spec + chat-route.test
- [x] H4 Apply diff → canvas + undo — 🟢 ai.spec
- [x] H5 Reject diff — 🟢 ai.spec
- [ ] H6 Streaming disables inputs — 🔴
- [x] H7 Error path (400) — 🟢 chat-route.test
- [ ] H8 Live LLM generate (with key) — 🔴 manual/opt-in
- [ ] H9 History panel — 🔴

### I. File operations (P0)
- [x] I1 Save JSON download — 🟢 files.spec
- [x] I2 Open JSON round-trip — 🟢 files.spec
- [x] I3 Open invalid JSON → toast — 🟢 files.spec
- [x] I4 Import Mermaid (file) — 🟢 files.spec + mermaid.test
- [x] I5 Import invalid Mermaid → toast — 🟢 files.spec + mermaid.test
- [x] I6 Export SVG download (escaped) — 🟢 files.spec + svg.test
- [x] I7 Export PNG download (raster) — 🟢 files.spec + png.test
- [x] I8 Export Mermaid + round-trip — 🟢 files.spec + mermaid.test
- [x] I9 New (confirm) resets — 🟢 files.spec
- [x] I10 Menus open/close — 🟢 files.spec

### J. Error handling & toasts (P2)
- [x] J1 Error toasts (not alert) — 🟢 files.spec
- [x] J2 Success toasts — 🟢 files.spec
- [ ] J3 Auto-dismiss / manual dismiss / stacking — 🟡 files.spec (appearance)

### K. Responsive / mobile (P2)
- [x] K1 Mobile add shape — 🟢 smoke/responsive.spec
- [x] K2 Mobile inspector + Agent reachable — 🟢 responsive.spec
- [x] K3 Mobile node selection on canvas — 🟢 responsive.spec
- [x] K4 Palette/inspector collapse — 🟢 responsive.spec
- [x] K5 Mobile drop position clears toolbar/sheet — 🟢 fixed (ShapePalette responsive drop + cascade)

### L. Data model / backward compat (P0)
- [x] L1 Legacy JSON (type only) loads — 🟢 render.test + files.spec
- [x] L2 Groups preserved on load — 🟡 schema.test
- [x] L3 New optional fields back-compatible — 🟢 schema.test

### Non-functional
- [x] Console clean on load — 🟢 smoke
- [x] XSS: labels escaped in SVG (PNG inherits) — 🟢 svg.test/render.test
- [x] Perf: 100-node ELK completes/scales — 🟢 layout.test
- [ ] Accessibility (focus, aria, contrast) — 🔴
- [x] Cross-browser: full e2e on Chromium + WebKit — 🟢 (Firefox still 🔴)
- [ ] State loss on refresh is expected (local-first) — 🔴

## Exit criteria
- Vitest + Playwright suites green.
- P0/P1 flows walked on desktop + mobile, no console errors.
- AI offline mandatory; live key once (manual).
- No `alert()`; failures show toasts.
- XSS label test passes; legacy JSON loads.
