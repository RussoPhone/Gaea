# Neutral Relational Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gaea's consequence-averaging memory with perception-only experiences and exact relational families containing explicit competing transition branches.

**Architecture:** Immutable sensory records are compared by a dedicated experience former. A separate relation former canonicalizes event-centred antecedent projections; memory stores exact families and non-merging outcome branches, while decision alone interprets recalled branches.

**Tech Stack:** Python 3.14 standard library, pytest, browser-native JavaScript modules.

**Spec:** `docs/superpowers/specs/2026-09-09-neutral-relational-memory-design.md`

## Global Constraints

- Cognition receives only the agent's `View`, never world objects, physical effects, stock, physical success, or functional kinds.
- Memory stores and retrieves relations without value, objective, recommendation, or behavioral meaning.
- Own and observed occurrences use one formation path; provenance never changes family identity, branch strength, compatibility, or recall rank.
- One occurrence may create evidence immediately; compatible transitions strengthen a branch; incompatible transitions create competing branches and are never averaged together.
- Do not add emotions, fear, language, explicit concepts, imagination, complex social behavior, or survival objectives.
- Preserve bounded, decaying, individual, non-inherited memory and read-only inspection.
- Preserve `rules.md` and `docs/rules.md` unchanged.

---

### Task 1: Perception-only experiences

**Files:**
- Modify: `core/cognition/records.py`
- Create: `core/cognition/experience.py`
- Create: `tests/test_relational_experience.py`

**Interfaces:**
- Produces: `Provenance(origin: str, actor: int | None)`, `PerceivedOccurrence(action: str, target: Observation | None = None, actor: Observation | None = None, signal: int | None = None)`, `PerceivedChange(subject: tuple, attribute: str, before: object, after: object)`, and `Experience(before: View, occurrence: PerceivedOccurrence, after: View, changes: tuple[PerceivedChange, ...], provenance: Provenance)`.
- Produces: `occurrence_from_action(view: View, action: Action) -> PerceivedOccurrence` and `form_experience(before: View, occurrence: PerceivedOccurrence, after: View, provenance: Provenance) -> Experience | None`.
- Consumes: only immutable `View`, `Observation`, and `Action` values from `core/cognition/records.py`.

- [x] **Step 1: Write failing formation tests**

Add tests with hand-written `View`s that assert: internal changes come from body vectors; item movement/absence comes from before/after observations; an unchanged interval is valid; missing `after` returns `None`; action conversion copies only perceived target data; and `Experience` has no `success`, physical effect, quantity, or kind fields.

```python
before = View((70.0, 20.0), (Observation(7, (4, 5, 6), 1, 0),), (), 10)
after = View((40.0, 20.0), (), (), 11)
occurrence = PerceivedOccurrence('ingest', target=before.items[0])
experience = form_experience(before, occurrence, after, Provenance('self', 3))
assert PerceivedChange(('internal', 0), 'value', 70.0, 40.0) in experience.changes
assert any(change.attribute == 'presence' and change.after is False for change in experience.changes)
assert not hasattr(experience, 'success')
```

- [x] **Step 2: Run the new tests and verify RED**

Run: `python -m pytest tests/test_relational_experience.py -q`

Expected: collection fails because `core.cognition.experience` and the new record types do not exist.

- [x] **Step 3: Implement immutable records and the neutral differ**

Keep `Action`, `Observation`, and `View`. Replace the old flattened `Experience` with the nested record above. In `experience.py`, match item/carried observations by sensory token, match terrain by relative coordinate, compare every body channel by index, and emit generic `value`, `presence`, `relative_position`, `appearance`, `motion`, `action`, and `signal` changes. Never inspect an object outside the two supplied views.

```python
def form_experience(before, occurrence, after, provenance):
    if after is None:
        return None
    changes = _body_changes(before.body, after.body)
    changes.extend(_external_changes(before, after))
    return Experience(before, occurrence, after, tuple(changes), provenance)
```

- [x] **Step 4: Run formation tests and verify GREEN**

Run: `python -m pytest tests/test_relational_experience.py -q`

Expected: all tests pass.

- [x] **Step 5: Commit the formation boundary**

```bash
git add core/cognition/records.py core/cognition/experience.py tests/test_relational_experience.py
git commit -m "refactor: derive experiences from perceived moments"
```

### Task 2: Exact families and competing branches

**Files:**
- Modify: `core/cognition/memory.py`
- Create: `tests/test_relational_memory.py`

**Interfaces:**
- Consumes: `Experience`, `PerceivedOccurrence`, and `View` from Task 1.
- Produces: immutable canonical `Condition`, `Antecedent`, and `Transition` values; mutable `RelationFamily` and `TransitionBranch`; immutable `RecallMatch`.
- Produces: `RelationalMemory.record(experience: Experience)`, `RelationalMemory.recall(view: View, occurrence: PerceivedOccurrence) -> tuple[RecallMatch, ...]`, and `RelationalMemory.snapshot(tick: int) -> dict`.

- [x] **Step 1: Write failing relation tests**

Test one occurrence creating at least one family and branch, identical antecedents strengthening the same branch, incompatible transitions producing two branches, source-only differences sharing families and equal strength, different sensory tokens sharing canonical keys, partial recall returning matches without merging families, and bounded decay removing branches explicitly.

```python
memory.record(own_experience)
memory.record(observed_copy)
family = family_for(memory, action='touch', condition_kind='target')
assert len(family.branches) == 1
assert next(iter(family.branches.values())).evidence_count == 2
assert next(iter(family.branches.values())).strength == 2.0

memory.record(incompatible_experience)
assert len(family.branches) == 2
assert {branch.evidence_count for branch in family.branches.values()} == {1, 2}
```

- [x] **Step 2: Run relation tests and verify RED**

Run: `python -m pytest tests/test_relational_memory.py -q`

Expected: tests fail because family, branch, projection, and recall APIs are missing.

- [x] **Step 3: Implement canonical event-centred projections**

Canonical observation patterns exclude `token` and `action_target`. Build condition atoms for internal channel bins, perceived target, perceived actor, and signal. Generate every combination from arity zero through three with deterministic ordering. The antecedent always includes the occurrence operation and target pattern; provenance is never an input.

```python
def antecedents(view, occurrence, max_arity=3):
    atoms = condition_atoms(view, occurrence)
    return tuple(Antecedent(occurrence_pattern(occurrence), combo)
                 for size in range(min(max_arity, len(atoms)) + 1)
                 for combo in combinations(atoms, size))
```

Canonicalize the complete tuple of perceived changes into a transition. Quantize numeric differences with one neutral resolution while retaining raw changes in evidence. An exact transition key selects a branch; a different key creates a sibling branch.

- [x] **Step 4: Implement bounded storage, decay, and structural recall**

Count capacity in families. Increment branch strength by exactly `1.0` for every evidence regardless of origin. Keep up to four raw experiences per branch. Decay all branch strengths with the configured half-life. Evict by `(strength, last_tick, id)` and count removed families/branches as forgotten. Recall compares antecedent condition sets, exposes matched/missing/divergent atoms, and ranks by exactness, structural coverage, strength, and recency without consulting provenance.

- [x] **Step 5: Run relation tests and verify GREEN**

Run: `python -m pytest tests/test_relational_memory.py -q`

Expected: all tests pass.

- [x] **Step 6: Commit relational storage**

```bash
git add core/cognition/memory.py tests/test_relational_memory.py
git commit -m "feat: preserve competing perceptual relations"
```

### Task 3: Decision and population integration

**Files:**
- Modify: `core/cognition/decision.py`
- Modify: `core/simulation/population.py`
- Modify: `tests/test_population_learning.py`
- Modify: `tests/test_population_assays.py`
- Modify: `tests/test_population_runtime.py`
- Create: `tests/test_perception_memory_boundary.py`

**Interfaces:**
- Consumes: `occurrence_from_action`, `form_experience`, `Provenance`, and `RelationalMemory.recall`.
- Produces: `Decision.prediction(view, memory, occurrence) -> tuple[float, list[int]]`; keeps `Decision.choose(view, memory, actions=None) -> Action`.
- Preserves: `PopulationSimulation.step(actions=None)`, deterministic action resolution, reproduction, events, snapshots, and checkpoint pickling.

- [ ] **Step 1: Write failing integration tests**

Replace tests that manually construct flattened experiences with before/after fixtures. Add a runtime boundary test that supplies objects whose effect/kind/quantity attributes raise if cognition touches them, then demonstrates memory formation through `View`s. Assert own and observed experiences use the same record class and families; no source-dependent weight cap remains; and incompatible physical outcomes become competing branches.

- [ ] **Step 2: Run integration tests and verify RED**

Run: `python -m pytest tests/test_population_learning.py tests/test_population_assays.py tests/test_population_runtime.py tests/test_perception_memory_boundary.py -q`

Expected: failures identify old `Experience(...)`, `memory.related(...)`, `success`, `delta`, `signature`, and source-weight behavior.

- [ ] **Step 3: Adapt decision to recalled branches**

Build a `PerceivedOccurrence` for each candidate action. Use the most specific exact recalled families, preserving every branch. Decision may interpret internal `value` changes against the current body vector and use an external-change-only branch as the existing weak trial prior. Branches remain separate in memory; any weighted aggregation is local to this decision call. Mark active family IDs for inspection.

```python
matches = memory.recall(view, occurrence)
exact = [match for match in matches if match.exact]
specificity = max((len(match.family.antecedent.conditions) for match in exact), default=-1)
usable = [match for match in exact if len(match.family.antecedent.conditions) == specificity]
```

- [ ] **Step 4: Reorder the runtime into before/action/after formation**

Capture all pre-action views, choose and physically apply actions, then capture post-action views only through `perceive`. Form the actor's own occurrence without forwarding `_apply`'s Boolean. Form observed occurrences only from visible `Observation.action` and perceptible target records. Pass both through the same `form_experience` and `memory.record` calls; provenance differs only as metadata. Physical event logging may continue to use physical success outside cognition.

- [ ] **Step 5: Run integration tests and verify GREEN**

Run: `python -m pytest tests/test_population_learning.py tests/test_population_assays.py tests/test_population_runtime.py tests/test_perception_memory_boundary.py -q`

Expected: all tests pass, including effect reversal and deterministic continuation.

- [ ] **Step 6: Commit runtime integration**

```bash
git add core/cognition/decision.py core/simulation/population.py tests/test_population_learning.py tests/test_population_assays.py tests/test_population_runtime.py tests/test_perception_memory_boundary.py
git commit -m "refactor: unify perceived experience formation"
```

### Task 4: Read-only representation and complete verification

**Files:**
- Modify: `core/representation/inspection.py`
- Modify: `core/interface/static/memory-graph.mjs`
- Modify: `core/interface/static/ui/inspection-format.mjs`
- Modify: `core/interface/static/ui/agent-history.mjs`
- Modify: `tests/test_agent_inspection.py`
- Modify: `tests/js/foundation.test.mjs`
- Modify: `ReadME.md`

**Interfaces:**
- Consumes: `RelationalMemory.families`, branch evidence, and nested experiences.
- Produces: detached JSON with `families`, nested `branches`, structural antecedents, transitions, evidence counts/strength/support, provenance summaries, and recent experiences.
- Preserves: on-demand read-only endpoints and no memory data in ordinary world frames.

- [ ] **Step 1: Write failing inspection tests**

Assert that inspection exposes competing branches separately, raw before/after moments and provenance, never exposes a merged `delta` or `success`, and remains detached/read-only. Update the JavaScript fixture to assert a family node connects to branch nodes and branch nodes connect to evidence nodes.

- [ ] **Step 2: Run inspection tests and verify RED**

Run: `python -m pytest tests/test_agent_inspection.py -q && node --test tests/js/foundation.test.mjs`

Expected: failures identify the old flat relation/experience representation.

- [ ] **Step 3: Implement detached family/branch inspection and UI formatting**

Serialize dataclasses without consulting `simulation.perceive`, `snapshot`, physical objects, or functional kinds. Update the memory graph and history panel vocabulary to `família`, `ramo`, `evidências`, `força`, and `competição`; display origin only inside evidence provenance. Do not label a transition as effect, benefit, harm, success, or failure.

- [ ] **Step 4: Update project documentation**

Replace the README description of EMA consequence averaging and source-dependent social confidence with the perception-only two-moment pipeline, exact projected families, explicit competing branches, neutral recall, and decision-only interpretation. Preserve the documented physical/cognitive boundary and scope limits.

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
python -m pytest tests/test_agent_inspection.py -q
node --test tests/js/foundation.test.mjs tests/js/world-observer.test.mjs
python -m pytest -q
python -m compileall -q core
node --check core/interface/static/memory-graph.mjs
node --check core/interface/static/ui/inspection-format.mjs
node --check core/interface/static/ui/agent-history.mjs
git diff --check
```

Expected: every command exits zero; the Python suite reports no failures; Node reports no failed tests; compile/check commands are silent.

- [ ] **Step 6: Commit representation and documentation**

```bash
git add core/representation/inspection.py core/interface/static/memory-graph.mjs core/interface/static/ui/inspection-format.mjs core/interface/static/ui/agent-history.mjs tests/test_agent_inspection.py tests/js/foundation.test.mjs ReadME.md
git commit -m "feat: expose neutral relational evidence"
```
