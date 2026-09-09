"""Bounded families of perceptual relations with explicit competing branches."""
from collections import deque
from dataclasses import dataclass, field
from itertools import combinations
import math

from core.cognition.records import Experience, Observation, PerceivedOccurrence, View, local_signal


@dataclass(frozen=True, slots=True, order=True)
class Condition:
    kind: str
    value: tuple


@dataclass(frozen=True, slots=True)
class Antecedent:
    occurrence: tuple
    conditions: tuple[Condition, ...]


@dataclass(frozen=True, slots=True)
class Transition:
    changes: tuple[tuple, ...]


@dataclass(slots=True)
class TransitionBranch:
    id: int
    transition: Transition
    strength: float = 0.0
    evidence_count: int = 0
    provenance: dict[str, int] = field(default_factory=dict)
    evidence: list[Experience] = field(default_factory=list)
    last_tick: int = 0


@dataclass(slots=True)
class RelationFamily:
    id: int
    antecedent: Antecedent
    branches: dict[Transition, TransitionBranch] = field(default_factory=dict)
    last_tick: int = 0
    active: bool = False

    @property
    def strength(self):
        return sum(branch.strength for branch in self.branches.values())


@dataclass(frozen=True, slots=True)
class RecallMatch:
    family: RelationFamily
    matched: tuple[Condition, ...]
    missing: tuple[Condition, ...]
    divergent: tuple[Condition, ...]
    exact: bool
    coverage: float


def observation_pattern(observation: Observation | None):
    if observation is None:
        return None
    return (
        observation.appearance,
        (observation.dx, observation.dy),
        observation.blocking,
        observation.motion,
        observation.action,
        observation.signal,
        observation.shape,
    )


def occurrence_pattern(occurrence: PerceivedOccurrence):
    return (
        occurrence.action,
        occurrence.target is not None,
        occurrence.motion,
        occurrence.signal,
    )


def condition_atoms(view: View, occurrence: PerceivedOccurrence, state_resolution=25.0):
    atoms = [
        Condition('internal', (index, math.floor(value / state_resolution)))
        for index, value in enumerate(view.body)
    ]
    if occurrence.target is not None:
        atoms.append(Condition('target', observation_pattern(occurrence.target)))
    if occurrence.actor is not None:
        atoms.append(Condition('actor', observation_pattern(occurrence.actor)))
    signal = local_signal(view)
    if signal is not None:
        atoms.append(Condition('signal', (signal,)))
    return tuple(sorted(set(atoms)))


def antecedents(view: View, occurrence: PerceivedOccurrence, max_arity=3, state_resolution=25.0):
    atoms = condition_atoms(view, occurrence, state_resolution)
    pattern = occurrence_pattern(occurrence)
    return tuple(
        Antecedent(pattern, tuple(selected))
        for size in range(min(max_arity, len(atoms)) + 1)
        for selected in combinations(atoms, size)
    )


def _observation_for(experience, token):
    for view in (experience.before, experience.after):
        for observation in view.items:
            if observation.token == token:
                return observation
        if view.carried is not None and view.carried.token == token:
            return view.carried
    return None


def _subject_pattern(experience, subject):
    if not subject or subject[0] != 'item':
        return subject
    token = subject[1]
    occurrence = experience.occurrence
    if occurrence.target is not None and occurrence.target.token == token:
        return ('target',)
    if occurrence.actor is not None and occurrence.actor.token == token:
        return ('actor',)
    return ('item', observation_pattern(_observation_for(experience, token)))


def _canonical_value(value):
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, list):
        return tuple(_canonical_value(item) for item in value)
    if isinstance(value, tuple):
        return tuple(_canonical_value(item) for item in value)
    return value


def transition_for(experience: Experience, transition_resolution=1.0):
    encoded = []
    for change in experience.changes:
        subject = _subject_pattern(experience, change.subject)
        if change.attribute == 'value' and all(isinstance(v, (int, float)) for v in (change.before, change.after)):
            value = round((change.after - change.before) / transition_resolution)
            encoded.append((subject, change.attribute, value))
        elif change.attribute == 'relative_position':
            value = tuple(new - old for old, new in zip(change.before, change.after))
            encoded.append((subject, change.attribute, value))
        else:
            encoded.append((subject, change.attribute,
                            _canonical_value(change.before), _canonical_value(change.after)))
    return Transition(tuple(sorted(encoded, key=repr)))


class RelationalMemory:
    def __init__(self, capacity=192, experience_capacity=128, half_life=1200, initial_tick=0,
                 max_arity=3, state_resolution=25.0, transition_resolution=1.0):
        self.capacity = capacity
        self.half_life = half_life
        self.max_arity = max_arity
        self.state_resolution = state_resolution
        self.transition_resolution = transition_resolution
        self.experiences = deque(maxlen=experience_capacity)
        self.families = {}
        self.index = {}
        self.forgotten = 0
        self.forgotten_branches = 0
        self._next_family_id = 0
        self._next_branch_id = 0
        self._decayed_at = initial_tick

    @property
    def relations(self):
        """Temporary collection alias for runtime metrics during migration."""
        return self.families

    def _project(self, view, occurrence):
        return antecedents(view, occurrence, self.max_arity, self.state_resolution)

    def record(self, experience: Experience):
        self.experiences.append(experience)
        transition = transition_for(experience, self.transition_resolution)
        for antecedent in self._project(experience.before, experience.occurrence):
            family = self.families.get(antecedent)
            if family is None:
                if len(self.families) >= self.capacity:
                    victim = min(
                        self.families.values(),
                        key=lambda item: (item.strength, item.last_tick, item.id),
                    )
                    self._remove_family(victim.antecedent)
                family = RelationFamily(self._next_family_id, antecedent)
                self._next_family_id += 1
                self.families[antecedent] = family
                self.index.setdefault(antecedent.occurrence[0], set()).add(antecedent)
            branch = family.branches.get(transition)
            if branch is None:
                branch = TransitionBranch(self._next_branch_id, transition)
                self._next_branch_id += 1
                family.branches[transition] = branch
            branch.strength += 1.0
            branch.evidence_count += 1
            origin = experience.provenance.origin
            branch.provenance[origin] = branch.provenance.get(origin, 0) + 1
            branch.evidence.append(experience)
            del branch.evidence[:-4]
            branch.last_tick = experience.tick
            family.last_tick = experience.tick

    def _remove_family(self, antecedent):
        family = self.families.pop(antecedent)
        indexed = self.index[antecedent.occurrence[0]]
        indexed.remove(antecedent)
        if not indexed:
            del self.index[antecedent.occurrence[0]]
        self.forgotten += 1
        self.forgotten_branches += len(family.branches)

    def decay(self, tick):
        elapsed = max(0, tick - self._decayed_at)
        if not elapsed:
            return
        factor = math.exp2(-elapsed / self.half_life)
        for antecedent, family in list(self.families.items()):
            for transition, branch in list(family.branches.items()):
                branch.strength *= factor
                if branch.strength < .04:
                    del family.branches[transition]
                    self.forgotten_branches += 1
            if not family.branches:
                self._remove_family(antecedent)
        self._decayed_at = tick

    def recall(self, view: View, occurrence: PerceivedOccurrence):
        projected = set(self._project(view, occurrence))
        query_conditions = set(condition_atoms(view, occurrence, self.state_resolution))
        matches = []
        for antecedent in self.index.get(occurrence.action, ()):
            family = self.families[antecedent]
            stored = set(antecedent.conditions)
            matched = stored & query_conditions
            missing = stored - query_conditions
            missing_kinds = {condition.kind for condition in missing}
            divergent = tuple(sorted(
                condition for condition in query_conditions - stored if condition.kind in missing_kinds
            ))
            union = stored | query_conditions
            matches.append(RecallMatch(
                family=family,
                matched=tuple(sorted(matched)),
                missing=tuple(sorted(missing)),
                divergent=divergent,
                exact=antecedent in projected,
                coverage=len(matched) / max(1, len(union)),
            ))
        return tuple(sorted(
            matches,
            key=lambda match: (
                not match.exact,
                -len(match.family.antecedent.conditions),
                -match.coverage,
                -match.family.strength,
                -match.family.last_tick,
                match.family.id,
            ),
        ))

    def snapshot(self, tick):
        """Representation migrates to the detached shape in the final task."""
        return {
            'families': tuple(self.families.values()),
            'experiences': tuple(self.experiences),
            'forgotten': self.forgotten,
            'forgottenBranches': self.forgotten_branches,
            'tick': tick,
        }
