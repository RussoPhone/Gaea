"""Behavioral assays over perception-derived relational evidence."""
import random

from core.cognition.experience import form_experience
from core.cognition.records import Action, Observation, PerceivedOccurrence, Provenance, View
from core.cognition.memory import RelationalMemory
from core.cognition.decision import Decision


X, Y = (17, 2, 6), (31, 5, 8)


def view(body=(70.0, 20.0), signal=None):
    items = [Observation(1, X, 0, 0), Observation(2, Y, 0, 0)]
    if signal is not None:
        items.append(Observation(99, (5, 5, 5), 0, 1, signal=signal))
    return View(body, tuple(items), (), 1)


def choice_counts(memory, seed=11):
    policy = Decision(random.Random(seed), exploration=0.05)
    counts = {1: 0, 2: 0}
    for _ in range(400):
        action = policy.choose(view(), memory, (Action('ingest', 1), Action('ingest', 2)))
        counts[action.target] += 1
    return counts


def learn(memory, signature, delta, tick, source='self', signal=None):
    token = 1 if signature == X else 2
    before = view(signal=signal)
    target = next(item for item in before.items if item.token == token)
    after_body = tuple(value + change for value, change in zip(before.body, delta or (0.0, 0.0)))
    after_items = tuple(item for item in before.items if item.token != token) if delta is None else before.items
    after = View(after_body, after_items, (), tick + 1)
    memory.record(form_experience(
        View(before.body, before.items, before.terrain, tick),
        PerceivedOccurrence('ingest', target=target),
        after,
        Provenance(source, 44 if source == 'observed' else 1),
    ))


def test_blank_agent_has_no_pattern_preference():
    counts = choice_counts(RelationalMemory())
    assert 160 < counts[1] < 240


def test_repeated_transitions_change_choices_and_reversal_competes():
    memory = RelationalMemory()
    for tick in range(12):
        learn(memory, X, (-30.0, 0.0), tick)
        learn(memory, Y, (0.0, 0.0), tick)
    assert choice_counts(memory)[1] > 360

    for tick in range(12, 70):
        learn(memory, X, (0.0, 0.0), tick)
        learn(memory, Y, (-30.0, 0.0), tick)

    assert choice_counts(memory)[2] > 360
    assert any(len(family.branches) > 1 for family in memory.families.values())


def test_observed_external_change_promotes_trials_without_internal_change():
    observed, blank = RelationalMemory(), RelationalMemory()
    for tick in range(6):
        learn(observed, Y, None, tick, source='observed')

    assert choice_counts(observed)[2] > choice_counts(blank)[2] + 100
    assert all(
        not any(change.subject[0] == 'internal' for change in evidence.changes)
        for evidence in observed.experiences
    )


def test_memory_is_individual_bounded_decays_and_has_traceable_context():
    first, second = RelationalMemory(capacity=8, experience_capacity=16), RelationalMemory()
    for tick in range(80):
        signature = (tick, 2, 1)
        before = View((70.0, 20.0), (Observation(tick, signature, 0, 0),), (), tick)
        after = View((50.0, 20.0), before.items, (), tick + 1)
        first.record(form_experience(before, PerceivedOccurrence('touch', before.items[0]), after,
                                     Provenance('self', 1)))

    assert len(first.families) <= 8 and len(first.experiences) <= 16
    assert not second.families and not second.experiences
    assert first.forgotten > 0
    family = next(iter(first.families.values()))
    branch = next(iter(family.branches.values()))
    assert family.antecedent and branch.evidence and branch.evidence_count
    old = branch.strength
    first.decay(500)
    assert not first.families or next(iter(next(iter(first.families.values())).branches.values())).strength < old


def test_perceived_signal_and_internal_state_condition_relations():
    memory = RelationalMemory()
    for signal, body, delta in ((0, (80.0, 0.0), (-30.0, 0.0)), (1, (0.0, 80.0), (0.0, -30.0))):
        sensed = view(body, signal)
        target = sensed.items[0]
        after = View(tuple(value + change for value, change in zip(body, delta)), sensed.items, (), 2)
        memory.record(form_experience(sensed, PerceivedOccurrence('touch', target=target), after,
                                      Provenance('self', 1)))

    signal_conditions = {
        condition.value
        for family in memory.families.values()
        for condition in family.antecedent.conditions
        if condition.kind == 'signal'
    }
    assert signal_conditions == {(0,), (1,)}


def test_perceived_signal_can_condition_action_without_assigned_meaning():
    memory = RelationalMemory()
    for tick in range(20):
        for signal in (0, 1):
            for signature in (X, Y):
                matching = (signature == X) == (signal == 0)
                learn(memory, signature, (-30.0, 0.0) if matching else (0.0, 0.0), tick, signal=signal)

    policy = Decision(random.Random(10), exploration=0)
    for signal, expected in ((0, 1), (1, 2)):
        assert policy.choose(
            view(signal=signal), memory, (Action('ingest', 1), Action('ingest', 2))
        ).target == expected
