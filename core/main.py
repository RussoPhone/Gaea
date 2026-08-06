from core.simulation.config import ScenarioConfig
from toys.toy001_survival_instinct.naive_policy import NaivePolicy
from core.simulation.scenario import build_scenario
from core.simulation.interactive_runner import InteractiveRunner
from core.being.memory import SpatialMemory
config = ScenarioConfig(
    seed =67,
    world_width=20,
    world_height=10,
    num_organism=4,
    simulation_duration=100000,
    frame_delay=0.1,
)



def simulationteste():
    simulation = build_scenario(config)
    for entity in simulation.world.entities:
        entity.decision_system = NaivePolicy()
        entity.memory = SpatialMemory()
    return simulation

simulation = simulationteste()

runner = InteractiveRunner(simulation)

runner.loop()
#Semana 2 concluida!
