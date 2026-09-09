from dataclasses import fields

from core.cognition.records import Action, Experience
from core.simulation.population import PopulationConfig, PopulationSimulation


def simulation():
    return PopulationSimulation(PopulationConfig(
        width=7,
        height=7,
        population=0,
        objects=0,
        stones=0,
        metabolism=0,
        reproduction=False,
    ))


def test_runtime_records_own_action_without_forwarding_physical_success():
    sim = simulation()
    agent = sim.spawn(3, 3, micro_position=(10, 10))

    sim.step({agent.uid: Action('touch', target=999_999)})

    experience = agent.memory.experiences[-1]
    assert isinstance(experience, Experience)
    assert experience.action == 'touch'
    assert experience.occurrence.target is None
    assert experience.changes == ()
    assert 'success' not in {field.name for field in fields(experience)}


def test_own_and_observed_occurrences_enter_the_same_relation_mechanism():
    sim = simulation()
    observer = sim.spawn(3, 3, micro_position=(10, 10))
    actor = sim.spawn(4, 3, micro_position=(13, 10))
    sim.step({observer.uid: Action('wait'), actor.uid: Action('wait')})

    origins = {experience.provenance.origin for experience in observer.memory.experiences}
    assert origins == {'self', 'observed'}
    assert all(isinstance(experience, Experience) for experience in observer.memory.experiences)
    assert any(
        {
            origin
            for branch in family.branches.values()
            for origin in branch.provenance
        } == {'self', 'observed'}
        for family in observer.memory.families.values()
    )
