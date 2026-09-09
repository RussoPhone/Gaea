from dataclasses import replace

from core.cognition.experience import form_experience
from core.cognition.memory import RelationalMemory
from core.cognition.records import Observation, PerceivedOccurrence, Provenance, View


X = (17, 2, 6)


def experienced(*, token=1, after_body=(40.0, 20.0), origin='self', tick=1):
    target = Observation(token, X, 1, 0)
    before = View((70.0, 20.0), (target,), (), tick - 1)
    after = View(after_body, (replace(target, dx=0),), (), tick)
    return form_experience(
        before,
        PerceivedOccurrence('ingest', target=target),
        after,
        Provenance(origin, 9),
    )


def target_family(memory):
    return max(
        (
            family
            for family in memory.families.values()
            if any(condition.kind == 'target' for condition in family.antecedent.conditions)
        ),
        key=lambda family: len(family.antecedent.conditions),
    )


def test_one_occurrence_creates_family_branch_and_evidence():
    memory = RelationalMemory()

    memory.record(experienced())

    assert memory.families
    family = target_family(memory)
    assert len(family.branches) == 1
    branch = next(iter(family.branches.values()))
    assert branch.evidence_count == 1
    assert branch.strength == 1.0
    assert branch.evidence[0].provenance.origin == 'self'


def test_compatible_repetition_strengthens_without_source_weighting():
    memory = RelationalMemory()

    memory.record(experienced(origin='self', tick=1))
    memory.record(experienced(origin='observed', tick=2))

    family = target_family(memory)
    branch = next(iter(family.branches.values()))
    assert branch.evidence_count == 2
    assert branch.strength == 2.0
    assert branch.provenance == {'self': 1, 'observed': 1}


def test_incompatible_transition_creates_competing_branch_without_averaging():
    memory = RelationalMemory()

    memory.record(experienced(after_body=(40.0, 20.0), tick=1))
    memory.record(experienced(after_body=(70.0, 20.0), tick=2))

    family = target_family(memory)
    assert len(family.branches) == 2
    assert {branch.evidence_count for branch in family.branches.values()} == {1}
    transitions = {branch.transition for branch in family.branches.values()}
    assert len(transitions) == 2


def test_sensory_tokens_do_not_define_family_or_transition_identity():
    memory = RelationalMemory()

    memory.record(experienced(token=1, tick=1))
    memory.record(experienced(token=999, tick=2))

    family = target_family(memory)
    assert next(iter(family.branches.values())).evidence_count == 2


def test_recall_reports_partial_correspondence_without_merging_families():
    memory = RelationalMemory()
    evidence = experienced()
    memory.record(evidence)
    target = Observation(40, X, 1, 0)
    query = View((5.0, 20.0), (target,), (), 8)

    matches = memory.recall(query, PerceivedOccurrence('ingest', target=target))

    assert any(match.exact and any(c.kind == 'target' for c in match.family.antecedent.conditions)
               for match in matches)
    assert any(not match.exact and match.missing for match in matches)
    assert len(memory.families) > 1


def test_capacity_and_decay_forget_instead_of_reconciling():
    memory = RelationalMemory(capacity=2, half_life=1)
    memory.record(experienced())

    assert len(memory.families) == 2
    assert memory.forgotten > 0
    memory.decay(20)
    assert not memory.families
    assert memory.forgotten_branches > 0
