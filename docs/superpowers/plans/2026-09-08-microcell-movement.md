# Microcell Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Gaianos one microcell per tick across a global 3x physical grid, render their two-microcell body without tile jumps, expose an optional collision overlay, and accept numeric ticks-per-second input.

**Architecture:** Make absolute integer microcells the canonical agent position and keep tile coordinates derived for terrain, perception, interaction, and compatibility. `PhysicalSpace` owns exact occupancy, `World` owns a multivalued tile index, public representation carries base and collision microcells, and renderers interpolate only adjacent microcell steps.

**Tech Stack:** Python 3 standard library, pytest, browser ES modules, Canvas 2D, node:test, local HTTP observer.

**Spec:** `docs/superpowers/specs/2026-09-08-microcell-movement-design.md`

## Global Constraints

- One world tile is exactly 3x3 microcells.
- An adult Gaiano occupies exactly two adjacent microcells: base plus cardinal nose.
- One successful `move` advances the base exactly one microcell.
- A blocked move or turn changes no physical, tile-index, orientation, or odometry state.
- Base and nose must both remain inside the world and over non-blocking terrain.
- Tile position, perception distance, and interaction distance remain derived from the base tile.
- Microcell coordinates are researcher-visible physical state and never enter cognition as global knowledge.
- Collision visualization is local UI state, disabled by default, and cannot mutate the simulation.
- Numeric speed accepts finite values from `0.1` through `100000` ticks/s.
- Preserve the read-only representation boundary and deterministic simulation RNG behavior.
- Do not add semantic roles, culture, clothing, equipment, or inferred meaning to Gaianos.
- Existing unrelated worktree changes must be preserved.

---

### Task 1: Absolute Physical Occupancy

**Files:**
- Modify: `core/ambient/physical_space.py`
- Modify: `core/ambient/world.py`
- Test: `tests/test_physical_space.py`
- Test: `tests/test_world.py`

**Interfaces:**
- Produces: `PhysicalSpace.can_place_cells(cells, ignore=(), blocks=True) -> bool`.
- Produces: `PhysicalSpace.place_cells(layer, token, cells, *, blocks=False, visible_cells=None) -> None`.
- Produces: `PhysicalSpace.move_cells(layer, token, cells, *, visible_cells=None) -> bool`.
- Produces: `World.reindex_entity(entity, x, y, *, allow_occupied=False) -> bool`.
- Preserves: tile-relative `place`, `move`, `cells_for`, `local_cells_for`, and legacy single-occupant defaults.

- [ ] **Step 1: Write failing absolute-occupancy tests**

Add tests proving that absolute cells can cross a tile boundary, collision checks use the exact cells, failed moves retain the previous record, and two non-overlapping agents can share a tile index:

```python
def test_absolute_cells_move_atomically_across_tile_boundaries():
    space = PhysicalSpace(2, 1, scale=3)
    space.place_cells("agent", 1, ((2, 1), (3, 1)), blocks=True)
    assert space.cells_for("agent", 1) == ((2, 1), (3, 1))
    space.place_cells("agent", 2, ((4, 1),), blocks=True)
    assert not space.move_cells("agent", 1, ((3, 1), (4, 1)))
    assert space.cells_for("agent", 1) == ((2, 1), (3, 1))

def test_world_reindexes_multiple_entities_in_one_tile():
    world = World(2, 1)
    a, b = Entity("a", "@", 0, 0), Entity("b", "@", 1, 0)
    world.add_entity(a, allow_occupied=True)
    world.add_entity(b, allow_occupied=True)
    assert world.reindex_entity(b, 0, 0, allow_occupied=True)
    assert world.get_entities_at(0, 0) == (a, b)
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `python -m pytest tests/test_physical_space.py tests/test_world.py -q`

Expected: failure because `place_cells`, `move_cells`, and `reindex_entity` do not exist.

- [ ] **Step 3: Store absolute cells as the physical record**

Introduce a private immutable record and make tile-relative methods wrappers:

```python
@dataclass(frozen=True, slots=True)
class _PhysicalRecord:
    cells: tuple[tuple[int, int], ...]
    visible_cells: tuple[tuple[int, int], ...]
    blocks: bool

def place_cells(self, layer, token, cells, *, blocks=False, visible_cells=None):
    normalized = tuple(dict.fromkeys((int(x), int(y)) for x, y in cells))
    if not normalized or not self.can_place_cells(normalized, ignore=(layer, token), blocks=blocks):
        raise ValueError("shape sem espaço físico")
    # Remove only after validation, then install the complete record and indices.
```

Keep `place(layer, token, x, y, shape, blocks)` by translating each local shape cell to `(x * scale + dx, y * scale + dy)`. Make `visible_parts` read the record's `visible_cells` while tracing against absolute `cells`.

- [ ] **Step 4: Add atomic multivalue tile reindexing**

Implement `World.reindex_entity` without changing `entity.x/y` until terrain and occupancy checks pass. Keep `add_entity`, `move_entity`, and `is_passable` strict by default so legacy tests retain their behavior.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `python -m pytest tests/test_physical_space.py tests/test_world.py -q`

Expected: all focused tests pass.

- [ ] **Step 6: Commit physical infrastructure**

```bash
git add core/ambient/physical_space.py core/ambient/world.py tests/test_physical_space.py tests/test_world.py
git commit -m "feat: support absolute microcell occupancy"
```

---

### Task 2: Canonical Agent Microposition

**Files:**
- Modify: `core/simulation/population.py`
- Test: `tests/test_population_physics.py`
- Test: `tests/test_population_experiments.py`
- Test: `tests/test_toy_rng.py`

**Interfaces:**
- Produces: agent attributes `micro_x: int` and `micro_y: int` identifying triangle base.
- Produces: `PopulationSimulation._agent_cells(micro_x, micro_y, orientation) -> tuple[tuple[int, int], tuple[int, int]]`.
- Produces: `PopulationSimulation._terrain_allows(cells) -> bool`.
- Produces: `PopulationSimulation._set_agent_position(agent, micro_x, micro_y, orientation) -> bool` for atomic move/turn.
- Preserves: `agent.x`, `agent.y` as derived base-tile coordinates and all cognition inputs as tile-relative records.

- [ ] **Step 1: Replace the interim one-cell tests with final body tests**

Write tests for the approved two-cell shape and microstep behavior:

```python
def test_gaiano_occupies_base_and_nose_and_moves_one_microcell():
    s = arena()
    a = s.spawn(2, 2, micro_position=(7, 7))
    a.orientation = (1, 0)
    assert s._set_agent_position(a, 7, 7, (1, 0))
    assert s.physical.cells_for("agent", a.uid) == ((7, 7), (8, 7))
    assert s._apply(a, population.Action("move", dx=1, dy=0))
    assert (a.micro_x, a.micro_y) == (8, 7)
    assert (a.x, a.y) == (2, 2)
    assert a.odometry == (1, 0)

def test_three_microsteps_cross_one_tile_width():
    s = arena()
    a = s.spawn(2, 2, micro_position=(6, 7))
    for _ in range(3):
        assert s._apply(a, population.Action("move", dx=1, dy=0))
    assert (a.micro_x, a.micro_y) == (9, 7)
    assert (a.x, a.y) == (3, 2)
```

Add separate tests for a blocked nose on terrain, a blocked rotated nose, successful sharing of a tile, failed action atomicity, death cleanup, and exact checkpoint continuation.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `python -m pytest tests/test_population_physics.py tests/test_population_experiments.py tests/test_toy_rng.py -q`

Expected: failures because agents have no canonical microposition and still move by tile.

- [ ] **Step 3: Define base-plus-nose geometry**

Use a zero-relative shape and absolute footprint:

```python
@staticmethod
def _agent_shape(orientation):
    dx, dy = orientation
    return Shape(((0, 0), (dx, dy)))

@staticmethod
def _agent_cells(micro_x, micro_y, orientation):
    dx, dy = orientation
    return ((micro_x, micro_y), (micro_x + dx, micro_y + dy))
```

Derive tile coordinates with `micro_x // self.physical.scale` and `micro_y // self.physical.scale`.

- [ ] **Step 4: Make spawning physically valid and deterministic**

Extend `spawn(x, y, generation=0, micro_position=None)`. Explicit test positions bypass candidate choice. Normal births enumerate the tile's nine base cells, shuffle that list once with `self.rng`, and choose the first candidate whose base-plus-nose footprint passes terrain and physical checks. Install the agent in `agents`, `World`, and `PhysicalSpace` only after all checks pass.

- [ ] **Step 5: Implement atomic microcell move and turn**

`_set_agent_position` must validate both footprint cells against world bounds, terrain, and physical blockers; call `move_cells`; then reindex the derived tile; and only then assign `micro_x`, `micro_y`, `x`, `y`, `shape`, and `orientation`. Roll back physical occupancy if the tile reindex unexpectedly fails.

For `move`, target `(micro_x + dx, micro_y + dy)`, increment odometry by the same microstep, and set motion to the cardinal direction. For `turn`, keep the base fixed and call `_set_agent_position` with the rotated orientation. Return `False` without mutation when validation fails.

- [ ] **Step 6: Update perception origins, reproduction, and lifecycle**

Pass the observer's `(micro_x, micro_y)` to fine-space visibility. Keep observation `dx/dy`, reachability, events, carrying, drop/place, and reproduction candidate tiles based on derived `x/y`. Ensure `_die` removes the exact two-cell record. Reproduction calls `spawn` and skips a candidate tile when none of its nine possible bases fits.

- [ ] **Step 7: Verify deterministic checkpoints and runtime tests**

Run: `python -m pytest tests/test_population_physics.py tests/test_population_experiments.py tests/test_toy_rng.py tests/test_population_assays.py -q`

Expected: all tests pass and save/load continues with identical micropositions and future evolution.

- [ ] **Step 8: Commit microcell runtime**

```bash
git add core/simulation/population.py tests/test_population_physics.py tests/test_population_experiments.py tests/test_toy_rng.py
git commit -m "feat: move gaianos through microcells"
```

---

### Task 3: Public Physical Representation

**Files:**
- Modify: `core/representation/models.py`
- Modify: `core/representation/projector.py`
- Modify: `core/interface/static/store.mjs`
- Modify: `core/interface/static/scene-model.mjs`
- Test: `tests/test_representation.py`
- Test: `tests/js/foundation.test.mjs`

**Interfaces:**
- Produces: schema version `2`.
- Produces: `AgentView.micro_position: tuple[int, int]`.
- Produces: `AgentView.collision_cells: tuple[tuple[int, int], tuple[int, int]]` using absolute global microcells.
- Preserves: `AgentView.x/y` as the derived base tile and read-only projection behavior.

- [ ] **Step 1: Write failing projection and validation tests**

```python
def test_agent_projection_exposes_current_microposition_and_collision_cells():
    s = simulation()
    a = next(iter(s.agents.values()))
    projected = RepresentationProjector(s).agent(a.uid)
    assert projected["micro_position"] == (a.micro_x, a.micro_y)
    assert projected["collision_cells"] == s.physical.cells_for("agent", a.uid)
    assert (projected["x"], projected["y"]) == (a.micro_x // 3, a.micro_y // 3)
```

In JS, assert that invalid or out-of-bounds `micro_position` and any agent footprint other than two adjacent cardinal cells cannot replace a valid scene.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `python -m pytest tests/test_representation.py -q && node --test tests/js/foundation.test.mjs`

Expected: projection fields and schema validation are missing.

- [ ] **Step 3: Add schema-v2 agent fields**

Update `AgentView` and `_agent` to read the physical record without calling `snapshot` or `perceive`. Increment `SCHEMA_VERSION` to `2`. Keep terrain and object contracts unchanged.

- [ ] **Step 4: Validate and index the new records in JS**

Require two finite integer pairs, cardinal adjacency, nonnegative coordinates, and coordinates below `width * 3` / `height * 3`. Keep `cellRecords` indexed by the base tile so inspector candidate lists retain their current semantics.

- [ ] **Step 5: Run projection and store tests**

Run: `python -m pytest tests/test_representation.py tests/test_agent_inspection.py -q && node --test tests/js/foundation.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 6: Commit representation contract**

```bash
git add core/representation/models.py core/representation/projector.py core/interface/static/store.mjs core/interface/static/scene-model.mjs tests/test_representation.py tests/js/foundation.test.mjs
git commit -m "feat: publish agent microcell positions"
```

---

### Task 4: Microcell Rendering And Interpolation

**Files:**
- Modify: `core/interface/static/renderers/base-renderer.mjs`
- Modify: `core/interface/static/renderers/ascii-renderer.mjs`
- Test: `tests/js/foundation.test.mjs`
- Test: `tests/js/world-observer.test.mjs`

**Interfaces:**
- Produces: `BaseRenderer.agentWorldPoint(agent) -> {x, y}` from current or interpolated microposition.
- Consumes: render option `showCollisions: boolean`.
- Preserves: renderer contract, culling, authoritative selection, deterministic drawing, and no invented skipped-tick paths.

- [ ] **Step 1: Write failing interpolation and geometry tests**

Add tests proving one microcell becomes `1/3` tile of visual travel, three steps cross one tile, skipped ticks do not interpolate, and base/nose geometry matches the two public collision cells:

```javascript
test('renderer interpolates one microcell instead of one tile',()=>{
  const previous={...bootstrap(),tick:0,agents:[{...agent,micro_position:[2,1],collision_cells:[[2,1],[3,1]]}]};
  const current={...bootstrap(),tick:1,agents:[{...agent,x:1,micro_position:[3,1],collision_cells:[[3,1],[4,1]]}]};
  // At progress .5 the drawing anchor is 2.5 microcells, not halfway between tile centers.
});
```

Assert collision fills are absent when `showCollisions` is false and exactly match both absolute cells when true.

- [ ] **Step 2: Run JS tests and verify RED**

Run: `node --test tests/js/*.test.mjs`

Expected: renderer still interpolates tile coordinates and does not understand absolute collision cells.

- [ ] **Step 3: Interpolate canonical micropositions**

In `BaseRenderer`, interpolate only when revisions match, ticks are consecutive, and Manhattan distance between prior/current `micro_position` is exactly one. Store a presentation-only `visual_micro_position`; never mutate scene records. Convert microcell centers to world coordinates with `(micro + 0.5) / 3`.

Use the interpolated anchor for drawing and hit testing. Selection brackets should bound the current base-plus-nose footprint rather than the complete tile.

- [ ] **Step 4: Draw the two-cell triangle and optional collision layer**

At close zoom, place the triangle's base line through the center of `micro_position`, perpendicular to orientation, and place its tip near the far edge of the nose cell. Draw collision rectangles from `collision_cells` first when `showCollisions` is true, using `rgba(195, 181, 151, 0.68)`.

At distant zoom, position `@` from the base microcell rather than the tile center. Objects and terrain keep their existing tile rendering.

- [ ] **Step 5: Verify renderer behavior**

Run: `node --test tests/js/*.test.mjs`

Expected: all renderer, store, selection, interpolation, and geometry tests pass.

- [ ] **Step 6: Commit microcell renderer**

```bash
git add core/interface/static/renderers/base-renderer.mjs core/interface/static/renderers/ascii-renderer.mjs tests/js/foundation.test.mjs tests/js/world-observer.test.mjs
git commit -m "feat: render continuous microcell movement"
```

---

### Task 5: Collision Visibility Control

**Files:**
- Modify: `core/interface/static/index.html`
- Modify: `core/interface/static/style.css`
- Modify: `core/interface/static/app.mjs`
- Test: `tests/browser/observer-smoke.mjs`
- Test: `tests/test_population_interface.py`

**Interfaces:**
- Produces: checkbox `#show-collisions` with label `colisão`.
- Produces: local state `ui.showCollisions`, default `false`.
- Consumes: renderer option `showCollisions` on every frame.

- [ ] **Step 1: Write failing served-interface assertions**

Extend static-serving tests to require the control markup and browser smoke tests to verify it starts unchecked, can be checked, survives frame polling, and changes non-background canvas pixels without changing `/api/frame` or simulation tick.

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m pytest tests/test_population_interface.py -q`

Run the repository's Chromium smoke command from `tests/browser/observer-smoke.mjs`.

Expected: collision control is absent.

- [ ] **Step 3: Add compact collision toggle**

Place the checkbox in `.map-tools` beside the ASCII key. Give it an explicit accessible label and restrained styling consistent with existing controls. Do not add instructional copy or a panel.

Initialize `ui.showCollisions=false`; on change, update the state and set `dirty=true`. Pass `{showCollisions: ui.showCollisions}` together with the existing render options. Disable no simulation controls when toggling because it performs no transport request.

- [ ] **Step 4: Verify UI control and commit**

Run: `python -m pytest tests/test_population_interface.py -q`

Run: `node --test tests/js/*.test.mjs`

```bash
git add core/interface/static/index.html core/interface/static/style.css core/interface/static/app.mjs tests/browser/observer-smoke.mjs tests/test_population_interface.py
git commit -m "feat: toggle collision visualization"
```

---

### Task 6: Numeric Tick Rate Input

**Files:**
- Create: `core/interface/static/control-values.mjs`
- Modify: `core/interface/static/index.html`
- Modify: `core/interface/static/style.css`
- Modify: `core/interface/static/app.mjs`
- Test: `tests/js/foundation.test.mjs`
- Test: `tests/browser/observer-smoke.mjs`

**Interfaces:**
- Produces: `parseTickRate(value) -> number` accepting finite values in `[0.1, 100000]` and throwing `RangeError` otherwise.
- Replaces: `#speed-select` with numeric input `#speed-value`.
- Preserves: server command `{command: "speed", value: number}` and polling synchronization.

- [ ] **Step 1: Write failing parser and browser tests**

```javascript
test('tick rate parser enforces server limits',()=>{
  assert.equal(parseTickRate('0.1'),0.1);
  assert.equal(parseTickRate('1250.5'),1250.5);
  for(const value of ['', '0', '100000.1', 'NaN', 'Infinity'])
    assert.throws(()=>parseTickRate(value));
});
```

Browser smoke sets `37.5`, presses Enter, and waits until the status text and input both show `37.5`. It then attempts an invalid value and verifies the confirmed rate remains `37.5`.

- [ ] **Step 2: Run JS tests and verify RED**

Run: `node --test tests/js/foundation.test.mjs`

Expected: `control-values.mjs`, parser, and numeric field do not exist.

- [ ] **Step 3: Implement the numeric control**

Use:

```html
<input id="speed-value" type="number" min="0.1" max="100000" step="0.1" value="20"
       inputmode="decimal" aria-label="Velocidade em ticks por segundo">
```

Commit on `change` and on Enter. `parseTickRate` rejects empty and non-finite values before transport. While the input is focused, polling must not overwrite edits; after success or failure, `chrome()` restores the server-confirmed value. Update the control-disabling selector to include the new field.

- [ ] **Step 4: Verify numeric rate behavior**

Run: `node --test tests/js/*.test.mjs`

Run: `python -m pytest tests/test_population_interface.py -q`

Run the Chromium smoke test and confirm the server remains responsive at both fractional and high valid rates.

- [ ] **Step 5: Commit numeric rate input**

```bash
git add core/interface/static/control-values.mjs core/interface/static/index.html core/interface/static/style.css core/interface/static/app.mjs tests/js/foundation.test.mjs tests/browser/observer-smoke.mjs
git commit -m "feat: accept numeric simulation speed"
```

---

### Task 7: Full Verification And Served Visual QA

**Files:**
- Modify if required: `ReadME.md`
- Verify: all files changed by Tasks 1-6

**Interfaces:**
- Produces: a served observer showing smooth one-microcell steps, correct two-cell collision overlay, and editable numeric rate.

- [ ] **Step 1: Document the physical scale and controls**

Update the runtime/interface section of `ReadME.md` to state that a tile is 3x3 microcells, adult Gaianos occupy base plus nose, `move` advances one microcell, collision display is observational, and speed accepts `0.1..100000` ticks/s.

- [ ] **Step 2: Run all automated tests**

Run: `python -m pytest -q`

Run: `node --test tests/js/*.test.mjs`

Run: `git diff --check`

Expected: every command exits zero with no warnings caused by the change.

- [ ] **Step 3: Validate the served interface**

Start a fresh server with `python -m core.main ui --port 8765`. Wait for the first frame before inspecting the canvas. Pause the simulation, select a Gaiano in close zoom, and advance exactly three ticks while recording its public `micro_position` and derived tile.

Confirm visually and from `/api/frame` that each tick advances one microcell, crossing a tile boundary only when integer division changes. Toggle `colisão` and confirm exactly the base and nose cells appear. Set `37.5` ticks/s and confirm the server-reported control state matches.

- [ ] **Step 4: Check responsive layouts**

At desktop and narrow mobile widths, verify map tools and time controls do not overlap, labels fit, the canvas remains dominant, and collision marks align with the triangle after zoom and pan.

- [ ] **Step 5: Commit final documentation or verification fixes**

```bash
git add ReadME.md
git commit -m "docs: describe microcell movement controls"
```

Skip this commit when `ReadME.md` needs no change. Do not fold unrelated worktree files into any commit.
