"""Form experiences exclusively from immutable sensory records."""
from core.cognition.records import (
    Action,
    Experience,
    PerceivedChange,
    PerceivedOccurrence,
    Provenance,
    View,
)


def occurrence_from_action(view: View, action: Action) -> PerceivedOccurrence:
    items = {observation.token: observation for observation in view.items}
    if view.carried is not None:
        items[view.carried.token] = view.carried
    return PerceivedOccurrence(
        action=action.verb,
        target=items.get(action.target),
        motion=(action.dx, action.dy) if action.verb == 'move' else (0, 0),
        signal=action.value if action.verb == 'signal' else None,
    )


def _body_changes(before, after):
    return [
        PerceivedChange(('internal', index), 'value', old, new)
        for index, (old, new) in enumerate(zip(before, after))
        if old != new
    ]


def _external_state(view):
    records = {}
    for observation in view.terrain:
        subject = ('terrain', observation.dx, observation.dy)
        records[subject] = dict(
            appearance=observation.appearance,
            blocking=observation.blocking,
            motion=observation.motion,
            action=observation.action,
            signal=observation.signal,
            shape=observation.shape,
            relation='field',
        )
    for observation in view.items:
        subject = ('item', observation.token)
        records[subject] = dict(
            appearance=observation.appearance,
            relative_position=(observation.dx, observation.dy),
            blocking=observation.blocking,
            motion=observation.motion,
            action=observation.action,
            signal=observation.signal,
            shape=observation.shape,
            relation='field',
        )
    if view.carried is not None:
        observation = view.carried
        subject = ('item', observation.token)
        records[subject] = dict(
            appearance=observation.appearance,
            relative_position=(observation.dx, observation.dy),
            blocking=observation.blocking,
            motion=observation.motion,
            action=observation.action,
            signal=observation.signal,
            shape=observation.shape,
            relation='carried',
        )
    return records


def _external_changes(before, after):
    old_records = _external_state(before)
    new_records = _external_state(after)
    changes = []
    for subject in sorted(old_records.keys() | new_records.keys(), key=repr):
        old = old_records.get(subject)
        new = new_records.get(subject)
        if old is None:
            changes.append(PerceivedChange(subject, 'presence', False, True))
            continue
        if new is None:
            changes.append(PerceivedChange(subject, 'presence', True, False))
            continue
        for attribute in old:
            if old[attribute] != new[attribute]:
                changes.append(PerceivedChange(subject, attribute, old[attribute], new[attribute]))
    return changes


def form_experience(
    before: View,
    occurrence: PerceivedOccurrence,
    after: View | None,
    provenance: Provenance,
) -> Experience | None:
    if after is None:
        return None
    changes = _body_changes(before.body, after.body)
    changes.extend(_external_changes(before, after))
    return Experience(before, occurrence, after, tuple(changes), provenance)
