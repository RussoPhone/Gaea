from core.simulation.config import ScenarioConfig
from core.simulation.scenario import build_scenario
from toys.toy001_survival_instinct.naive_policy import NaivePolicy 

def build_toy_world(seed=67, num_organism=10, duration=1000):
  config = ScenarioConfig(seed=seed, num_organism=num_organism, simulation_duration=duration, frame_delay=0.5)

  simulation = build_scenario(config)
  for entity in simulation.world.entities:
    entity.decision_system = NaivePolicy()
  return simulation 
