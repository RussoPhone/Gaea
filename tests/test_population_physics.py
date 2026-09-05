"""Physical consequences, sensory isolation, and persistent manipulations."""
import json
from dataclasses import asdict

from core.simulation import population


def arena():
    return population.PopulationSimulation(population.PopulationConfig(
        width=9, height=7, population=0, objects=0, stones=0,
        metabolism=0, reproduction=False, seed=7))


def test_sensor_never_receives_hidden_effects_and_walls_occlude():
    s = arena()
    a = s.spawn(2, 3)
    a.orientation = (1, 0)
    s.add_object(3, 3, appearance=(7, 2, 1), effect=(-40, 0))
    s.add_object(5, 3, appearance=(8, 2, 1), effect=(0, -40))
    from core.ambient.tile import STONE
    s.world.set_tile(4, 3, STONE)
    view = s.perceive(a)
    assert any(o.appearance == (7, 2, 1) for o in view.items)
    assert not any(o.appearance == (8, 2, 1) for o in view.items)
    encoded = json.dumps(asdict(view))
    assert all(word not in encoded for word in ('food', 'water', 'stone', 'effect', 'resource'))
    assert all(not hasattr(o, 'body') for o in view.items)


def test_ingestion_requires_an_action_and_failure_is_experienced():
    s = arena()
    a = s.spawn(3, 3)
    a.body.hunger = 70
    obj = s.add_object(3, 3, appearance=(3, 4, 5), effect=(-30, 0))
    s.step({a.uid: population.Action('wait')})
    assert a.body.hunger == 70
    s.step({a.uid: population.Action('ingest', target=obj.uid)})
    assert a.body.hunger == 40
    assert obj.uid not in s.objects
    s.step({a.uid: population.Action('ingest', target=obj.uid)})
    assert a.memory.experiences[-1].success is False


def test_pick_carry_transfer_and_drop_persist_for_other_agents():
    s = arena()
    a, b = s.spawn(2, 3), s.spawn(3, 3)
    obj = s.add_object(2, 3, appearance=(3, 4, 5), effect=(-30, 0))
    s.step({a.uid: population.Action('pick', target=obj.uid), b.uid: population.Action('wait')})
    assert a.carried == obj.uid and s.objects[obj.uid].carrier == a.uid
    s.step({a.uid: population.Action('give', target=b.uid), b.uid: population.Action('wait')})
    assert b.carried == obj.uid and a.carried is None
    s.step({a.uid: population.Action('wait'), b.uid: population.Action('drop')})
    assert s.objects[obj.uid].carrier is None
    assert (s.objects[obj.uid].x, s.objects[obj.uid].y) == (3, 3)


def test_observation_has_visible_action_but_never_other_body_delta():
    s = arena()
    a, b = s.spawn(2, 3), s.spawn(3, 3)
    a.orientation = (1, 0)
    obj = s.add_object(3, 3, appearance=(3, 4, 5), effect=(-30, 0))
    b.body.hunger = 80
    s.step({a.uid: population.Action('wait'), b.uid: population.Action('ingest', target=obj.uid)})
    observed = [e for e in a.memory.experiences if e.source == 'observed']
    assert observed and observed[-1].action == 'ingest'
    assert observed[-1].delta is None
    assert observed[-1].actor == b.uid


def test_dead_body_releases_occupancy_and_carried_object():
    s = arena()
    a = s.spawn(2, 3)
    obj = s.add_object(2, 3, appearance=(3, 4, 5), effect=(-30, 0))
    s.step({a.uid: population.Action('pick', target=obj.uid)})
    a.body.hunger = 100
    s.step()
    assert s.world.get_entity_at(2, 3) is None
    assert s.objects[obj.uid].carrier is None


def test_signal_is_local_and_has_no_predefined_meaning():
    s = arena()
    a, b, c = s.spawn(2, 3), s.spawn(3, 3), s.spawn(8, 6)
    a.orientation = (1, 0)
    s.step({a.uid: population.Action('wait'), b.uid: population.Action('signal', value=2), c.uid: population.Action('wait')})
    assert any(o.token == b.uid and o.signal == 2 for o in s.perceive(a).items)
    assert not any(o.token == b.uid for o in s.perceive(c).items)


def test_indistinguishable_visible_results_produce_same_social_experience():
    observations = []
    for ingestible in (True, False):
        s = arena()
        a, b = s.spawn(2, 3), s.spawn(3, 3)
        a.orientation = (1, 0)
        obj = s.add_object(3, 3, (3, 4, 5), (-30, 0), ingestible=ingestible, quantity=2)
        b.body.hunger = 80
        s.step({a.uid: population.Action('wait'), b.uid: population.Action('ingest', target=obj.uid)})
        observations.append((s.perceive(a), [e for e in a.memory.experiences if e.source == 'observed']))
    # Physical success and B's hidden body differ; sensory input does not.
    assert observations[0][0] == observations[1][0]
    assert observations[0][1] == observations[1][1]


def test_losing_sight_of_target_does_not_reveal_consumption():
    s = arena()
    a, b = s.spawn(2, 3), s.spawn(4, 3)
    a.orientation = (1, 0)
    obj = s.add_object(4, 3, (3, 4, 5), (-30, 0))
    s.step({a.uid: population.Action('move', dx=-1), b.uid: population.Action('ingest', target=obj.uid)})
    assert not any(e.action == 'ingest' for e in a.memory.experiences if e.source == 'observed')


def test_target_of_observed_gesture_is_explicitly_present_in_sensory_input():
    s = arena()
    a, b = s.spawn(2, 3), s.spawn(3, 3)
    a.orientation = (1, 0)
    obj = s.add_object(3, 3, (3, 4, 5), ingestible=False)
    s.step({a.uid: population.Action('wait'), b.uid: population.Action('touch', target=obj.uid)})
    gesture = next(o for o in s.perceive(a).items if o.token == b.uid)
    assert gesture.action_target == obj.uid
    observed = [e for e in a.memory.experiences if e.source == 'observed']
    assert observed[-1].target == gesture.action_target
