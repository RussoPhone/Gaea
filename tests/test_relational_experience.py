from dataclasses import fields

from core.cognition.experience import form_experience, occurrence_from_action
from core.cognition.records import (
    Action,
    Experience,
    Observation,
    PerceivedChange,
    PerceivedOccurrence,
    Provenance,
    View,
)


def test_experience_changes_are_derived_only_from_two_perceived_moments():
    item = Observation(7, (4, 5, 6), 1, 0)
    before = View((70.0, 20.0), (item,), (), 10)
    after = View((40.0, 20.0), (), (), 11)

    experience = form_experience(
        before,
        PerceivedOccurrence('ingest', target=item),
        after,
        Provenance('self', 3),
    )

    assert PerceivedChange(('internal', 0), 'value', 70.0, 40.0) in experience.changes
    assert PerceivedChange(('item', 7), 'presence', True, False) in experience.changes
    assert experience.before is before and experience.after is after
    assert experience.action == 'ingest' and experience.target == 7


def test_external_differ_records_only_perceptible_attribute_changes():
    before_item = Observation(7, (4, 5, 6), 1, 0, motion=(0, 0), signal=None)
    after_item = Observation(7, (4, 5, 6), 0, 1, motion=(-1, 1), signal=2)
    before = View((1.0, 2.0), (before_item,), (), 4)
    after = View((1.0, 2.0), (after_item,), (), 5)

    experience = form_experience(
        before,
        PerceivedOccurrence('touch', target=before_item),
        after,
        Provenance('observed', 9),
    )

    assert PerceivedChange(('item', 7), 'relative_position', (1, 0), (0, 1)) in experience.changes
    assert PerceivedChange(('item', 7), 'motion', (0, 0), (-1, 1)) in experience.changes
    assert PerceivedChange(('item', 7), 'signal', None, 2) in experience.changes


def test_unchanged_interval_is_an_experience_but_missing_after_is_not():
    moment = View((10.0, 20.0), (), (), 8)
    occurrence = PerceivedOccurrence('wait')
    provenance = Provenance('self', 1)

    experience = form_experience(moment, occurrence, moment, provenance)

    assert experience.changes == ()
    assert form_experience(moment, occurrence, None, provenance) is None


def test_action_occurrence_contains_only_arguments_available_in_the_view():
    item = Observation(7, (4, 5, 6), 1, 0)
    view = View((10.0, 20.0), (item,), (), 2)

    move = occurrence_from_action(view, Action('move', dx=-1, dy=0))
    signal = occurrence_from_action(view, Action('signal', value=3))
    hidden = occurrence_from_action(view, Action('touch', target=999))

    assert move.motion == (-1, 0) and move.target is None
    assert signal.signal == 3
    assert hidden.target is None


def test_cognitive_experience_schema_has_no_physical_outcome_fields():
    names = {field.name for field in fields(Experience)}

    assert names == {'before', 'occurrence', 'after', 'changes', 'provenance'}
    assert names.isdisjoint({'success', 'effect', 'quantity', 'kind', 'delta', 'visible_change'})
