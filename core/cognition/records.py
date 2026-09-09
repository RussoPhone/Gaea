"""Immutable boundary values. Appearances are observable, effects are not."""
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Action:
    verb: str
    target: int | None = None
    dx: int = 0
    dy: int = 0
    value: int = 0


@dataclass(frozen=True, slots=True)
class Observation:
    token: int
    appearance: tuple[int, int, int]
    dx: int
    dy: int
    blocking: bool = False
    motion: tuple[int, int] = (0, 0)
    action: str | None = None
    signal: int | None = None
    action_target: int | None = None
    shape: tuple[tuple[int, int], ...] = ()


@dataclass(frozen=True, slots=True)
class View:
    body: tuple[float, float]
    items: tuple[Observation, ...]
    terrain: tuple[Observation, ...]
    tick: int
    carried: Observation | None = None


@dataclass(frozen=True, slots=True)
class Provenance:
    origin: str
    actor: int | None = None


@dataclass(frozen=True, slots=True)
class PerceivedOccurrence:
    action: str
    target: Observation | None = None
    actor: Observation | None = None
    motion: tuple[int, int] = (0, 0)
    signal: int | None = None


@dataclass(frozen=True, slots=True)
class PerceivedChange:
    subject: tuple
    attribute: str
    before: object
    after: object


@dataclass(frozen=True, slots=True)
class Experience:
    before: View
    occurrence: PerceivedOccurrence
    after: View
    changes: tuple[PerceivedChange, ...]
    provenance: Provenance

    @property
    def tick(self):
        return self.after.tick

    @property
    def action(self):
        return self.occurrence.action

    @property
    def source(self):
        return self.provenance.origin

    @property
    def actor(self):
        return self.provenance.actor

    @property
    def target(self):
        target = self.occurrence.target
        return target.token if target is not None else None


def local_signal(view: View):
    signals = [o for o in view.items if o.signal is not None]
    if not signals:
        return None
    return min(signals, key=lambda o: (abs(o.dx)+abs(o.dy), o.token)).signal


def candidates(view: View) -> tuple[Action, ...]:
    """Motor repertoire, not a table of object affordances. Attempts may fail."""
    result = [Action('move', dx=dx, dy=dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
    result += [Action('turn', value=-1), Action('turn', value=1), Action('wait'), Action('inspect')]
    result += [Action('signal', value=i) for i in range(4)]
    for item in view.items:
        if abs(item.dx) + abs(item.dy) <= 1:
            result.extend(Action(verb, item.token) for verb in ('touch', 'ingest', 'pick', 'give'))
    if view.carried:
        result.extend((Action('ingest', view.carried.token), Action('drop'), Action('place')))
    return tuple(result)
