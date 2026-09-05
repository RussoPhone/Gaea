# World Observer Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard interface with a readable, world-first top-down simulator observer.

**Architecture:** Preserve `PopulationSimulation.snapshot()` as the read-only boundary and add only spatial event metadata. Split the native browser client into pure camera/presentation/graph modules plus canvas and DOM adapters, keeping the project dependency-free.

**Tech Stack:** Python 3.11+, standard-library HTTP server, HTML/CSS, Canvas 2D, native ES modules, `pytest`, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-world-observer-interface-design.md`

## Global Constraints

- Work on branch `AGENT`.
- The world is the dominant screen element.
- Do not expose object effects or invent semantic labels.
- Browser code remains dependency-free and has no build step.
- Snapshot reads, selection, camera, and animation never mutate simulation state or consume RNG.

---

### Task 1: Spatial event contract

**Files:**
- Modify: `core/simulation/population.py`
- Test: `tests/test_population_interface.py`

**Interfaces:**
- Produces: event fields `position: tuple[int, int]` and optional `target_position: tuple[int, int]`.

- [ ] **Step 1: Write the failing public snapshot test**

Add an ingest action against a nearby object, then assert the snapshot event contains literal actor/target coordinates and still omits `effect`:

```python
from core.cognition.records import Action

def test_snapshot_localiza_evento_sem_expor_efeito_fisico():
    simulation = PopulationSimulation(PopulationConfig(
        width=5, height=5, population=1, objects=0, stones=0,
        metabolism=0, reproduction=False,
    ))
    agent = next(iter(simulation.agents.values()))
    target = simulation.add_object(agent.x, agent.y, (7, 8, 9), effect=(-20, 0))

    simulation.step({agent.uid: Action("ingest", target.uid)})

    event = simulation.snapshot()["events"][-1]
    assert event["position"] == (agent.x, agent.y)
    assert event["target_position"] == (agent.x, agent.y)
    assert "effect" not in event
```

- [ ] **Step 2: Run it and verify RED**

Run: `python -m pytest tests/test_population_interface.py::test_snapshot_localiza_evento_sem_expor_efeito_fisico -q`

Expected: FAIL because spatial fields are absent.

- [ ] **Step 3: Capture observable positions when emitting events**

In `step()`, preserve a visible target position before `_apply()` and pass it with the actor's post-action position. Add explicit positions to birth; retain death's existing position:

```python
target_position = None
if obj is not None:
    target_position = (obj.x, obj.y)
elif action.target in self.agents:
    other = self.agents[action.target]
    target_position = (other.x, other.y)

# after successful observable action
self._event(
    a.uid, action.verb, target=action.target, delta=delta,
    position=(a.x, a.y), target_position=target_position,
)
```

- [ ] **Step 4: Verify GREEN and regression coverage**

Run: `python -m pytest tests/test_population_interface.py tests/test_population_runtime.py -q`

- [ ] **Step 5: Commit**

```bash
git add core/simulation/population.py tests/test_population_interface.py
git commit -m "feat: locate observable world events"
```

### Task 2: Pure browser view model

**Files:**
- Create: `core/interface/static/camera.mjs`
- Create: `core/interface/static/presentation.mjs`
- Create: `core/interface/static/memory-graph.mjs`
- Create: `tests/js/world-observer.test.mjs`

**Interfaces:**
- Produces: `fitCamera`, `panCamera`, `zoomCameraAt`, `worldToScreen`, `visibleBounds`.
- Produces: `reconcileSelection`, `deriveWorldEffects`, `actionGlyph`, `appearanceStyle`.
- Produces: `buildMemoryGraph(memory)` returning `{nodes, edges}`.

- [ ] **Step 1: Write failing tests for camera, selection, events, and memories**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { fitCamera, worldToScreen, zoomCameraAt } from "../../core/interface/static/camera.mjs";
import { deriveWorldEffects, reconcileSelection } from "../../core/interface/static/presentation.mjs";
import { buildMemoryGraph } from "../../core/interface/static/memory-graph.mjs";

test("fitCamera keeps the complete world inside the viewport", () => {
  const camera = fitCamera(20, 10, 1000, 600, 32);
  assert.deepEqual(worldToScreen(camera, 0, 0), { x: 32, y: 66 });
  assert.deepEqual(worldToScreen(camera, 20, 10), { x: 968, y: 534 });
});

test("zoomCameraAt preserves the world point below the pointer", () => {
  const before = fitCamera(20, 10, 1000, 600, 32);
  const after = zoomCameraAt(before, 500, 300, 1.5);
  assert.deepEqual(worldToScreen(after, 10, 5), { x: 500, y: 300 });
});

test("effects contain movement and new spatial events only", () => {
  const previous = { tick: 4, agents: [{ id: 1, x: 1, y: 1 }] };
  const next = { tick: 5, agents: [{ id: 1, x: 2, y: 1 }], events: [
    { tick: 3, actor: 1, action: "signal", position: [1, 1] },
    { tick: 5, actor: 1, action: "signal", position: [2, 1] },
  ] };
  assert.deepEqual(deriveWorldEffects(previous, next), [
    { kind: "move", actor: 1, from: [1, 1], to: [2, 1], tick: 5 },
    { kind: "signal", actor: 1, at: [2, 1], target: null, tick: 5 },
  ]);
});

test("a vanished selection retains its last observation for one update", () => {
  const selected = { id: 3, body: { hunger: 90, thirst: 80 } };
  assert.deepEqual(reconcileSelection(3, selected, { agents: [], events: [
    { tick: 8, actor: 3, action: "death", position: [4, 2] },
  ] }), { id: 3, detail: selected, dead: true, following: false });
});

test("memory graph joins relations to their evidence without semantic labels", () => {
  const graph = buildMemoryGraph({ relations: [{
    id: 7, signature: [2, 4, 6], action: "ingest", weight: 0.8,
    confidence: 0.5, contradictions: 2, evidence: [
      { tick: 9, source: "self", actor: 1, target: 4, action: "ingest", signature: [2, 4, 6] },
    ],
  }], experiences: [
    { tick: 9, source: "self", actor: 1, target: 4, action: "ingest", signature: [2, 4, 6] },
  ] });
  assert.deepEqual(graph.nodes.map(({ id, kind }) => ({ id, kind })), [
    { id: "relation:7", kind: "relation" },
    { id: "experience:9:self:1:ingest:4:2,4,6", kind: "experience" },
  ]);
  assert.deepEqual(graph.edges, [{
    from: "relation:7", to: "experience:9:self:1:ingest:4:2,4,6",
  }]);
  assert.equal(graph.nodes[0].label, "assinatura 2·4·6 · ingest");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/world-observer.test.mjs`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the pure modules**

Use immutable plain objects. `fitCamera()` derives `cell`, `offsetX`, and `offsetY`; zoom clamps cells to `8..96` px and adjusts offsets around the pointer. `visibleBounds()` returns clamped integer tile bounds. `deriveWorldEffects()` compares agent positions by ID and admits only events newer than the previous tick. `reconcileSelection()` retains one death observation. `buildMemoryGraph()` creates deterministic experience IDs from the serialized experience fields, deduplicates embedded evidence against the recent-experience list, and sorts relations by weight and experiences by tick.

```javascript
export function fitCamera(cols, rows, width, height, margin = 32) {
  const cell = Math.max(8, Math.min(96, (width - 2 * margin) / cols, (height - 2 * margin) / rows));
  return { cell, offsetX: (width - cols * cell) / 2, offsetY: (height - rows * cell) / 2 };
}

export function worldToScreen(camera, x, y) {
  return { x: camera.offsetX + x * camera.cell, y: camera.offsetY + y * camera.cell };
}

export function experienceId(item) {
  const signature = Array.isArray(item.signature) ? item.signature.join(",") : "";
  return `experience:${item.tick}:${item.source}:${item.actor}:${item.action}:${item.target ?? "-"}:${signature}`;
}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/js/world-observer.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add core/interface/static/camera.mjs core/interface/static/presentation.mjs core/interface/static/memory-graph.mjs tests/js/world-observer.test.mjs
git commit -m "feat: add observer presentation model"
```

### Task 3: Top-down world renderer

**Files:**
- Create: `core/interface/static/world-renderer.mjs`
- Modify: `tests/js/world-observer.test.mjs`

**Interfaces:**
- Produces: `buildWorldFrame(snapshot, camera, viewport, selectedId)`.
- Produces: `WorldRenderer.draw(snapshot, camera, frameState)` returning visible agent hit regions.
- Produces: `WorldRenderer.drawPerception(selected, viewport)`.

- [ ] **Step 1: Add failing tests for culling and hit geometry**

With a literal 100×100 snapshot and a camera showing tiles `10..14`, assert `buildWorldFrame()` returns only terrain and objects inside those bounds, preserves a selected visible agent, and creates its hit region in screen coordinates. This catches accidental full-world drawing and broken click selection.

```javascript
test("world frame culls records and keeps screen-space hits", () => {
  const snapshot = {
    width: 100, height: 100,
    terrain: [{ x: 9, y: 11 }, { x: 10, y: 11 }, { x: 14, y: 11 }, { x: 15, y: 11 }],
    objects: [{ id: 2, x: 12, y: 12 }],
    agents: [{ id: 3, x: 13, y: 11 }],
  };
  const frame = buildWorldFrame(snapshot,
    { cell: 20, offsetX: -200, offsetY: -200 }, { width: 100, height: 100 }, 3);
  assert.deepEqual(frame.terrain.map(({ x }) => x), [10, 14]);
  assert.deepEqual(frame.objects.map(({ id }) => id), [2]);
  assert.deepEqual(frame.hits[0], { id: 3, x: 70, y: 30, radius: 9, selected: true });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/world-observer.test.mjs`

Expected: FAIL because `world-renderer.mjs` is absent.

- [ ] **Step 3: Implement the renderer**

Draw visible terrain first, then stable resource glyphs, agents, orientation, carried resource, selection, short action glyphs, and bounded event effects. Use three detail bands: cell fill only below 14 px; silhouettes at 14–27 px; action/identity labels from 28 px. Interpolate movement between snapshots without changing logical positions. In perception mode, draw only reported cells around `(0, 0)` and make the selected orientation explicit.

```javascript
export function buildWorldFrame(snapshot, camera, viewport, selectedId) {
  const bounds = visibleBounds(camera, viewport, snapshot.width, snapshot.height);
  const visible = (item) => item.x >= bounds.left && item.x <= bounds.right
    && item.y >= bounds.top && item.y <= bounds.bottom;
  const agents = snapshot.agents.filter(visible);
  return {
    bounds,
    terrain: snapshot.terrain.filter(visible),
    objects: snapshot.objects.filter(visible),
    agents,
    hits: agents.map((agent) => ({
      id: agent.id,
      ...worldToScreen(camera, agent.x + 0.5, agent.y + 0.5),
      radius: Math.max(9, camera.cell * 0.35),
      selected: String(agent.id) === String(selectedId),
    })),
  };
}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/js/world-observer.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add core/interface/static/world-renderer.mjs tests/js/world-observer.test.mjs
git commit -m "feat: render the living world"
```

### Task 4: World-first shell, camera, and controls

**Files:**
- Create: `core/interface/static/app.mjs`
- Modify: `core/interface/server.py`
- Modify: `core/interface/static/index.html`
- Modify: `core/interface/static/style.css`
- Delete: `core/interface/static/app.js`
- Modify: `tests/test_population_interface.py`

**Interfaces:**
- Produces routes `/app.mjs`, `/camera.mjs`, `/presentation.mjs`, `/memory-graph.mjs`, `/world-renderer.mjs`.
- Produces DOM anchors `world-canvas`, `world-status`, `event-log`, `agent-dialog`, `memory-dialog`, and `time-controls`.
- `app.mjs` owns polling, controls, camera input, selection, following, perspective, and dialogs.

- [ ] **Step 1: Extend the failing asset integration test**

Request every module and assert status `200` with JavaScript MIME type. Parse HTML with `html.parser.HTMLParser` and assert one main canvas, both dialogs, and compact time controls exist. This tests functional regions and module delivery without pinning decorative copy.

```python
def test_pagina_observadora_e_assets_sao_servidos():
    simulation = MinimalSimulation()
    with running_server(simulation) as server:
        status, html = request(server, "GET", "/")
        assert status == 200
        assert html.count(b'id="world-canvas"') == 1
        for element_id in (b'world-status', b'event-log', b'agent-dialog', b'memory-dialog', b'time-controls'):
            assert b'id="' + element_id + b'"' in html
        for asset in ("app.mjs", "camera.mjs", "presentation.mjs", "memory-graph.mjs", "world-renderer.mjs"):
            asset_status, body = request(server, "GET", f"/{asset}")
            assert asset_status == 200
            assert body
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m pytest tests/test_population_interface.py::test_pagina_observadora_e_assets_sao_servidos -q`

Expected: FAIL for missing routes and shell elements.

- [ ] **Step 3: Replace the dashboard shell and whitelist modules**

Build one full-viewport `.observer-shell`: narrow status bar, canvas stage, collapsible event log, map tools, compact time controls, agent `<dialog>` and memory `<dialog>`. Use a dark earthen palette, monospace labels, responsive overlays, focus states, and `prefers-reduced-motion`. Remove metric/agent cards, permanent inspector, footer, and filler. Add exact module filenames to `_serve_static()` and load `<script type="module" src="/app.mjs"></script>`.

```html
<main class="observer-shell">
  <header id="world-status" class="world-status"></header>
  <section class="world-stage">
    <canvas id="world-canvas" tabindex="0" aria-label="Mundo de Gaea"></canvas>
    <aside id="event-log" class="event-log"></aside>
  </section>
  <nav id="time-controls" class="time-controls" aria-label="Tempo da simulação"></nav>
  <dialog id="agent-dialog"></dialog>
  <dialog id="memory-dialog"></dialog>
</main>
<script type="module" src="/app.mjs"></script>
```

```css
.observer-shell { min-height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; }
.world-stage, #world-canvas { width: 100%; min-height: 0; }
#world-canvas { height: 100%; display: block; background: #10140f; }
```

- [ ] **Step 4: Implement application behavior**

Port serialized fetch/control behavior from the current client. Add wheel zoom, pointer drag, keyboard pan, `F` follow, `0` fit world, `Space` pause/run, `.` step, and `Escape` close/return. Preserve the camera across polls; fit only on first snapshot or explicit command. Following recenters smoothly. Clicking a hit region opens the basic agent sheet. Connection failure freezes the last frame and shows a restrained overlay.

```javascript
const state = {
  snapshot: null, previous: null, camera: null, selectedId: null,
  selection: null, perspective: "global", following: false,
  effects: [], hits: [], requestTail: Promise.resolve(), pollQueued: false,
};

async function acceptSnapshot(next) {
  state.effects.push(...deriveWorldEffects(state.snapshot, next));
  state.previous = state.snapshot;
  state.snapshot = next;
  state.selection = reconcileSelection(state.selectedId, state.selection?.detail, next);
  if (!state.camera) fitWorld();
  if (state.following) centerOnSelected();
  renderChrome();
}
```

- [ ] **Step 5: Verify and commit**

Run: `node --test tests/js/world-observer.test.mjs && python -m pytest tests/test_population_interface.py -q`

```bash
git add core/interface/server.py core/interface/static/index.html core/interface/static/style.css core/interface/static/app.mjs core/interface/static/app.js tests/test_population_interface.py
git commit -m "feat: make the world fill the observer"
```

### Task 5: Agent sheet and memory graph

**Files:**
- Modify: `core/interface/static/app.mjs`
- Modify: `core/interface/static/memory-graph.mjs`
- Modify: `core/interface/static/index.html`
- Modify: `core/interface/static/style.css`
- Modify: `tests/js/world-observer.test.mjs`

**Interfaces:**
- `layoutMemoryGraph(graph, width, height)` returns deterministic node coordinates.
- Agent sheet actions call `setFollowing(bool)`, `setPerspective("global" | "agent")`, and `openMemory()`.

- [ ] **Step 1: Add a failing deterministic layout test**

For a literal two-relation/three-experience graph, assert relation nodes occupy the inner ring, experience nodes the outer ring, all coordinates lie inside the supplied viewport, and repeated calls are deeply equal.

```javascript
test("memory layout is deterministic and keeps nodes inside its viewport", () => {
  const graph = { nodes: [
    { id: "r1", kind: "relation" }, { id: "r2", kind: "relation" },
    { id: "e1", kind: "experience" }, { id: "e2", kind: "experience" },
    { id: "e3", kind: "experience" },
  ], edges: [] };
  const first = layoutMemoryGraph(graph, 600, 400);
  assert.deepEqual(first, layoutMemoryGraph(graph, 600, 400));
  assert.ok(first.every(({ x, y }) => x >= 0 && x <= 600 && y >= 0 && y <= 400));
  const distance = ({ x, y }) => Math.hypot(x - 300, y - 200);
  assert.ok(first.filter((node) => node.kind === "relation").every((node) => distance(node) < 112));
  assert.ok(first.filter((node) => node.kind === "experience").every((node) => distance(node) === 112));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/world-observer.test.mjs`

- [ ] **Step 3: Implement the compact agent sheet**

Populate only identity, action, hunger, thirst, generation, orientation and carried appearance at first glance. Provide `Acompanhar`, `Visão do agente`, and `Memórias`. Keep selection through snapshots; on death render the retained final observation and stop following. Dialog focus returns to the map when closed.

```javascript
function renderAgentSheet(selection) {
  const detail = selection?.detail;
  agentDialog.hidden = !detail;
  if (!detail) return;
  $("agent-id").textContent = `Gaiano ${detail.id}`;
  $("agent-action").textContent = detail.action || "sem ação";
  $("agent-hunger").value = Number(detail.body?.hunger || 0);
  $("agent-thirst").value = Number(detail.body?.thirst || 0);
  $("agent-death").hidden = !selection.dead;
}
```

- [ ] **Step 4: Implement the memory overlay**

Lay out relations and evidence deterministically on a dedicated canvas. Encode confidence with opacity, weight with node size, contradictions with an outline mark, and source/kind with shape. Clicking a node opens raw evidence in a narrow detail region. Never generate semantic labels from signatures.

```javascript
export function layoutMemoryGraph(graph, width, height) {
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.max(40, Math.min(width, height) * 0.28);
  const byKind = (kind) => graph.nodes.filter((node) => node.kind === kind);
  const place = (nodes, ring) => nodes.map((node, index) => ({
    ...node,
    x: center.x + Math.cos((index / Math.max(1, nodes.length)) * Math.PI * 2) * radius * ring,
    y: center.y + Math.sin((index / Math.max(1, nodes.length)) * Math.PI * 2) * radius * ring,
  }));
  return [...place(byKind("relation"), 0.55), ...place(byKind("experience"), 1)];
}
```

- [ ] **Step 5: Verify and commit**

Run: `node --test tests/js/world-observer.test.mjs && python -m pytest tests/test_population_interface.py -q`

```bash
git add core/interface/static/app.mjs core/interface/static/memory-graph.mjs core/interface/static/index.html core/interface/static/style.css tests/js/world-observer.test.mjs
git commit -m "feat: inspect agents and their memories"
```

### Task 6: Documentation and final verification

**Files:**
- Modify: `ReadME.md`

- [ ] **Step 1: Update the UI documentation**

Describe top-down navigation, selection, follow mode, sensory perspective, memory overlay, event log, mouse controls, and keyboard shortcuts. Preserve the warning that observation does not affect simulation state.

- [ ] **Step 2: Run all automated checks**

```bash
node --test tests/js/*.test.mjs
python -m pytest -q
git diff --check
```

Expected: all tests pass and `git diff --check` prints nothing.

- [ ] **Step 3: Exercise the real server**

Run `python -m core.main ui --population 10 --width 18 --height 14 --objects 90 --stones 5`, then verify at desktop and narrow viewport widths: pan/zoom, fit, follow, sensory view, memory graph, pause/run/step/burst, reconnect overlay, and `Esc`. Confirm the world remains dominant and labels stay legible at each zoom band.

- [ ] **Step 4: Commit**

```bash
git add ReadME.md
git commit -m "docs: describe the world observer"
```
