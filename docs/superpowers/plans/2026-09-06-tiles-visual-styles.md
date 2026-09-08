# TILES Visual Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render one unchanged Gaea `RenderScene` as ASCII, Geometric, Glyph, Flat, Procedural, or Pseudo-3D and produce one comparison still containing the complete interface.

**Architecture:** Keep `BaseRenderer` responsible for the shared Canvas lifecycle, culling, layer order, interpolation, selection, and picking. Add one shared styled renderer that delegates semantic marks to five small `VisualStyle` modules selected through a registry; ASCII remains its existing renderer.

**Tech Stack:** Browser-native ES modules and Canvas 2D, Python stdlib HTTP server, Node test runner, Playwright for browser validation.

**Spec:** `docs/superpowers/specs/2026-09-06-tiles-visual-styles-design.md`

## Global Constraints

- Do not change `PopulationSimulation`, cognition, physical rules, scene schema, simulation RNG, camera coordinates, or grid geometry.
- Render only semantic data present in `RenderScene`; gaianos have no clothes, hair, equipment, class, profession, or invented culture.
- Preserve ASCII and expose exactly ASCII, Geometric, Glyph, Flat, Procedural, and Pseudo-3D.
- Procedural variation is deterministic and never calls `Math.random`.
- Switching style preserves scene, camera, zoom, pan, selection, follow state, and tick.
- Use only sober, desaturated earth, mineral, water, and organic colors; no external assets, neon, cyan, magenta, glow, decorative gradients, or glass effects.

---

### Task 1: Shared visual contract and registry

**Files:**
- Create: `core/interface/static/renderers/visual-primitives.mjs`
- Create: `core/interface/static/renderers/styled-canvas-renderer.mjs`
- Create: `core/interface/static/renderers/style-registry.mjs`
- Test: `tests/js/visual-styles.test.mjs`

**Interfaces:**
- Produces: `visualHash(...parts): number`, `orientedPoint(orientation, forward, lateral): {x,y}`, `withCell(ctx,item,camera,draw)`, `StyledCanvasRenderer`, `STYLE_IDS`, `styleMetadata(id)`, `createRenderer(id)`, `nextStyleId(id)`, and `paintStylePreview(canvas,item,id)`.
- Consumes: `BaseRenderer`, `AsciiRenderer`, and the five style objects added in Task 2.

- [ ] **Step 1: Write failing registry, orientation, determinism, and shared-picking tests**

Create literal assertions that `STYLE_IDS` equals `['ascii','geometric','glyph','flat','procedural','pseudo3d']`; cardinal orientations map forward points to north/east/south/west; repeated hashes match; replacing `Math.random` with a throwing function does not affect hashing; and every renderer returns all four records from a populated cell without mutating a frozen scene.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/js/visual-styles.test.mjs`

Expected: module-not-found for `style-registry.mjs`.

- [ ] **Step 3: Implement the shared geometry and renderer boundary**

Implement a 32-bit integer hash over strings/numbers, cardinal rotation helpers, cell-local drawing, stack offsets/counts, carried-object placement, and preview painting. `StyledCanvasRenderer.tile/object/agent` delegates to `style.terrain/object/agent`; all Canvas and scene infrastructure remains inherited.

- [ ] **Step 4: Implement registry behavior with temporary complete style stubs**

Register immutable metadata (`id`, human label, renderer factory). Reject unknown IDs with `TypeError`. `nextStyleId` wraps after `pseudo3d`. Keep ASCII creation separate and route the five graphics IDs through `StyledCanvasRenderer`.

- [ ] **Step 5: Run focused and existing foundation tests**

Run: `node --test tests/js/visual-styles.test.mjs tests/js/foundation.test.mjs`

Expected: all pass, with identical picking and unchanged scenes.

### Task 2: Five visual style implementations

**Files:**
- Create: `core/interface/static/renderers/styles/geometric.mjs`
- Create: `core/interface/static/renderers/styles/glyph.mjs`
- Create: `core/interface/static/renderers/styles/flat.mjs`
- Create: `core/interface/static/renderers/styles/procedural.mjs`
- Create: `core/interface/static/renderers/styles/pseudo3d.mjs`
- Modify: `core/interface/static/renderers/style-registry.mjs`
- Modify: `tests/js/visual-styles.test.mjs`

**Interfaces:**
- Each style produces `{id, background, terrain(ctx,item,visual), object(ctx,item,visual), agent(ctx,item,visual)}`.
- `visual` supplies cell-local `x`, `y`, `size`, `orientation`, deterministic `variant`, `presentationTime`, and primitive helpers.

- [ ] **Step 1: Add failing semantic coverage tests**

For each style, render grass/water/stone terrain, food/water/stone objects, four gaian orientations, a carried object, and stacked objects at cell sizes 8, 24, and 72. Assert drawing operations exist, coordinates remain finite, each cardinal gaian extends a foreground mark toward the expected side, and `Math.random` is never invoked.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/js/visual-styles.test.mjs`

Expected: failures naming missing or incomplete style drawing operations.

- [ ] **Step 3: Implement Geometric and Glyph**

Geometric uses consistent primitives: low-detail grass blades, two water curves, angular stone, rounded organic food, drop-shaped water resource, and a circle/limb/body gaian with a triangular nose. Glyph uses compact authored marks and silhouettes with no ASCII letters; its gaian is a central body mark plus directional nose.

- [ ] **Step 4: Implement Flat and Procedural**

Flat uses solid blocks and high-contrast silhouettes without decorative shading. Procedural uses `visualHash(layer,kind,id,x,y)` for fixed blade placement, polygon vertices, organic lobes, and minor body proportion variation; only water-line phase may consume presentation time.

- [ ] **Step 5: Implement Pseudo-3D**

Use short down-right shadows, top/side polygon faces, and controlled overlap inside the same rectangular cell. Do not change camera transformation, hit testing, world coordinates, or logical occlusion.

- [ ] **Step 6: Run focused tests and all JavaScript tests**

Run: `node --test tests/js/*.test.mjs`

Expected: all pass with no warnings or non-finite Canvas inputs.

### Task 3: Runtime style switcher and restrained chrome

**Files:**
- Modify: `core/interface/static/app.mjs`
- Modify: `core/interface/static/index.html`
- Modify: `core/interface/static/style.css`
- Modify: `core/interface/static/ui/inspector.mjs`
- Modify: `tests/js/foundation.test.mjs`
- Modify: `tests/browser/observer-smoke.mjs`
- Modify: `ReadME.md`

**Interfaces:**
- `app.mjs` consumes `STYLE_IDS`, `createRenderer`, `nextStyleId`, and `paintStylePreview`.
- The DOM exposes `#renderer-select` with six options. `R` cycles without issuing transport commands.

- [ ] **Step 1: Change browser expectations first and confirm RED**

Update the smoke flow to select all six mode values, retain an agent selection, and compare the HTTP frame before/after the cycle. Record camera offset/cell and assert exact equality after the cycle. Update JS tests to expect previews through the active style.

Run: `node --test tests/js/*.test.mjs`

Expected: failure because the selector and registry integration do not exist.

- [ ] **Step 2: Integrate the registry without moving state**

Replace the binary toggle with a compact select. `installRenderer(id)` may modify only `renderer`, `ui.mode`, preview canvases, and `dirty`; it must reuse the existing `canvas`, `store.scene`, `ui.camera`, `ui.selection`, `ui.following`, polling loop, and animation state. Pass presentation time only in renderer options.

- [ ] **Step 3: Make legend and inspector previews style-aware**

Use `paintStylePreview` for map-key and inspector canvases. Repaint them when the mode changes. ASCII previews use their existing semantic characters; graphical previews use the selected style.

- [ ] **Step 4: Apply the small interface adjustment**

Keep the existing layout. Make the mode selector, play/pause/step/burst, and speed controls compact, matte, and visually subordinate to the world. Preserve responsive behavior and keyboard focus.

- [ ] **Step 5: Update user documentation**

Document the six values, selector, cyclic `R` shortcut, preserved state, deterministic procedural source, and extension point. Do not rank styles.

- [ ] **Step 6: Run unit and browser validation**

Run: `python -m pytest -q`

Run: `node --test tests/js/*.test.mjs`

Run: `GAEA_PLAYWRIGHT_MODULE=/tmp/gaea-playwright/node_modules/playwright/index.mjs GAEA_CHROMIUM=/home/russophone/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node tests/browser/observer-smoke.mjs`

Expected: Python and JavaScript suites pass; Chromium reports all six swaps, selection/camera/tick preservation, and no page errors.

### Task 4: One complete comparison still

**Files:**
- Create: `tests/browser/visual-styles-still.mjs`
- Create: `docs/interface/visual-styles-comparison.png`
- Modify: `docs/interface/visual-language.md`

**Interfaces:**
- The browser fixture uses the real `PopulationSimulation`, projector, HTTP server, client, and renderers.
- It outputs one composite PNG containing six views of one fixed physical scene.

- [ ] **Step 1: Write the failing still validation**

Build a controlled paused runtime with all three terrain kinds, all three object kinds, a stack/quantity, four real gaianos assigned the four cardinal orientations, and one real carried object. Before capture, open the legend and select a gaiano so the inspector, status header, map tools, and time controls are visible.

Assert the bootstrap/frame fixture contains every required kind/orientation and save a baseline `{frame,camera,selection,tick}`. Attempt the six captures through the production selector; initially fail because full switch support or output is missing.

- [ ] **Step 2: Capture six views from the unchanged state**

At a fixed 1366×768 viewport, set each style, wait for one animation frame, and screenshot the entire application. Between screenshots assert frame/tick, camera and selection equal the baseline. Keep legend and inspector open in every view.

- [ ] **Step 3: Produce one comparison artifact**

Compose the six complete application screenshots in a labeled 2×3 HTML sheet and screenshot it as `docs/interface/visual-styles-comparison.png`. Delete only temporary images created under `/tmp`; retain the single final still.

- [ ] **Step 4: Document style-specific limits and extension recipe**

Add the exact shared infrastructure, new files, instructions for registering another style, still path, and the known limits of all five graphic implementations to `docs/interface/visual-language.md`.

- [ ] **Step 5: Run final verification**

Run: `python -m pytest -q`

Run: `node --test tests/js/*.test.mjs`

Run: `GAEA_PLAYWRIGHT_MODULE=/tmp/gaea-playwright/node_modules/playwright/index.mjs GAEA_CHROMIUM=/home/russophone/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node tests/browser/observer-smoke.mjs`

Run: `GAEA_PLAYWRIGHT_MODULE=/tmp/gaea-playwright/node_modules/playwright/index.mjs GAEA_CHROMIUM=/home/russophone/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node tests/browser/visual-styles-still.mjs`

Run: `git diff --check`

Expected: every command exits 0, the still exists, and the fixture confirms unchanged state across all six renderings.
