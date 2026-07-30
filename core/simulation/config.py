from dataclasses import dataclass

@dataclass
class ScenarioConfig: #Config central de um cenario de simulação
    seed: int = 42
    num_water_tiles = 15
    num_food_tiles = 10
    world_width: int = 30
    world_height: int = 20
    num_organism: int = 10
    mtksptk: int = 24
    simulation_duration: int = 120
    frame_delay: float = 0.08
