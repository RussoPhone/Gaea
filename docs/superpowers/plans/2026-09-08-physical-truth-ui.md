# Physical Truth And ASCII UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `PopulationSimulation` as the current runtime, add fine discrete physical shapes as the source of truth, and make the browser UI reveal that truth through ASCII/Unicode LOD.

**Architecture:** Keep physical records inside the runtime, project only observable geometry into sensory records, and let renderers compress or reveal physical cells without inventing forms. Preserve legacy runtime isolation and existing CLI/checkpoint/server behavior.

**Tech Stack:** Python standard library, pytest, browser JavaScript modules, node:test.

**Spec:** Conversation request from 2026-09-08, extending `ReadME.md` current-runtime constraints.

## Global Constraints

- Do not implement hardcoded construction concepts such as House, Bridge, or Wall.
- Physical truth flows to sensory projection, then cognition; functional semantics and effects do not cross into cognition.
- Renderer may aggregate or reveal shape/topology, but may not invent geometry.
- Keep `PopulationSimulation` behavior compatible where the old single-cell API is still used.

---

### Task 1: Fine Physical Occupancy

**Files:**
- Create: `core/ambient/physical_space.py`
- Modify: `core/ambient/objects.py`
- Modify: `core/simulation/population.py`
- Test: `tests/test_physical_space.py`

**Interfaces:**
- Produces: `Shape`, `PhysicalSpace.place_object`, `move_object`, `place_agent`, `move_agent`, `visible_parts`.
- Consumes: existing `World` terrain passability and organism positions.

- [ ] Write tests for multi-cell object/agent occupancy, blocking, and movement.
- [ ] Run the new tests and confirm they fail because the API does not exist.
- [ ] Implement the smallest physical-space module and wire it into population spawn/object/move/place/drop/give.
- [ ] Run the new tests and population physics tests.
- [ ] Commit with `feat: add fine physical occupancy`.

### Task 2: Sensory Geometry Projection

**Files:**
- Modify: `core/cognition/records.py`
- Modify: `core/simulation/population.py`
- Test: `tests/test_population_physics.py`

**Interfaces:**
- Produces: observations with relative `shape` fragments and terrain context in self experiences.
- Consumes: `PhysicalSpace.visible_parts`.

- [ ] Write tests proving ocluded shapes are partially observed and hidden effect/kind still do not leak.
- [ ] Run the focused tests and confirm the new assertions fail.
- [ ] Add shape fragments to sensory records and use physical-space line of sight.
- [ ] Include terrain context and object token in self manipulation experiences.
- [ ] Run focused tests.
- [ ] Commit with `feat: project physical shape into perception`.

### Task 3: ASCII/Unicode Browser Rendering

**Files:**
- Modify: `core/representation/models.py`
- Modify: `core/representation/projector.py`
- Modify: `core/interface/static/scene-model.mjs`
- Modify: `core/interface/static/renderers/ascii-renderer.mjs`
- Modify: `core/interface/static/world-renderer.mjs`
- Test: `tests/test_representation.py`
- Test: `tests/js/foundation.test.mjs`
- Test: `tests/js/world-observer.test.mjs`

**Interfaces:**
- Produces: public records containing physical `cells`; renderer chooses far `@`, middle silhouette, near top-down head with triangular nose from real cells.
- Consumes: representation records from population runtime only.

- [ ] Write JS/Python tests for physical cells in projections and LOD glyph behavior.
- [ ] Run tests and confirm failure.
- [ ] Serialize physical cells, index them in the scene, and update the ASCII renderer.
- [ ] Remove floating IDs from hover/target labels.
- [ ] Run JS tests.
- [ ] Commit with `feat: render physical topology as ascii lod`.

### Task 4: Verification And Documentation

**Files:**
- Modify: `ReadME.md`

- [ ] Update docs to describe fine physical space and legacy boundary.
- [ ] Run `python -m pytest -q`.
- [ ] Run `node --test tests/js/*.test.mjs`.
- [ ] Fix regressions found by the full suites.
- [ ] Commit documentation/test fixes separately if needed.
