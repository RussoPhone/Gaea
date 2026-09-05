"""Physical truth. None of these records cross the cognitive boundary."""
from dataclasses import dataclass


@dataclass(slots=True)
class PhysicalObject:
    uid: int
    x: int
    y: int
    appearance: tuple[int, int, int]
    effect: tuple[float, float] = (0., 0.)
    portable: bool = True
    ingestible: bool = True
    quantity: int = 1
    carrier: int | None = None
