from core.simulation.config import ScenarioConfig
from core.simulation.scenario import build_scenario
from core.simulation.interactive_runner import InteractiveRunner
config = ScenarioConfig(
    seed =76,
    world_width=20,
    world_height=10,
    num_organism=10,
    simulation_duration=120,
    frame_delay=0.08,
)

simulation = build_scenario(config)
runner = InteractiveRunner(simulation)

runner.loop()
#Semana 2 concluida!
