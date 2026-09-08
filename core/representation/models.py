"""Version 1 public records; coordinates are integer world cells."""
from dataclasses import dataclass
from typing import Literal

SCHEMA_VERSION = 1


@dataclass(frozen=True, slots=True)
class TerrainView:
    id: str
    x: int
    y: int
    kind: str
    blocking: bool
    appearance: tuple[int, ...]
    layer: Literal['terrain'] = 'terrain'


@dataclass(frozen=True, slots=True)
class ObjectView:
    id: int
    kind: str
    x: int
    y: int
    quantity: int
    appearance: tuple[int, ...]
    portable: bool
    ingestible: bool
    carrier: int | None
    cells: tuple[tuple[int, int], ...]
    layer: Literal['object'] = 'object'


@dataclass(frozen=True, slots=True)
class BodyView:
    hunger: float
    thirst: float


@dataclass(frozen=True, slots=True)
class AgentView:
    id: int
    x: int
    y: int
    orientation: tuple[int, int]
    action: str | None
    body: BodyView
    generation: int
    age: int
    carrying: ObjectView | None
    cells: tuple[tuple[int, int], ...]
    kind: str = 'gaiano'
    layer: Literal['agent'] = 'agent'
