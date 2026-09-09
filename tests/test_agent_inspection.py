import pickle

from core.cognition.experience import form_experience
from core.cognition.records import Observation, PerceivedOccurrence, Provenance, View
from core.representation import RepresentationProjector
from tests.test_representation import simulation
from tests.test_population_interface import running_server, request


def populated():
    sim = simulation()
    agent = next(iter(sim.agents.values()))
    target = Observation(20, (13, 4, 2), 1, 0)
    before = View((30.0, 20.0), (target,), (), 0)
    own_after = View((0.0, 20.0), (target,), (), 1)
    observed_after = View((30.0, 20.0), (), (), 1)
    occurrence = PerceivedOccurrence('ingest', target=target)
    agent.memory.record(form_experience(before, occurrence, own_after, Provenance('self', agent.uid)))
    agent.memory.record(form_experience(before, occurrence, observed_after, Provenance('observed', 999)))
    sim._event(agent.uid, 'pick', target=20, position=(agent.x, agent.y))
    sim._event(999, 'give', target=agent.uid, position=(0, 0))
    sim._event(998, 'pick', target=1000, position=(0, 0))
    return sim, agent


def test_memory_inspection_exposes_competing_branches_without_merged_outcome():
    sim, agent = populated()
    projector = RepresentationProjector(sim)
    before = pickle.dumps(sim)

    data = projector.detail('agent', agent.uid, 'memory')['detail']

    assert data['agentId'] == agent.uid
    competing = next(family for family in data['families'] if family['competition'])
    assert len(competing['branches']) == 2
    assert sum(branch['evidenceCount'] for branch in competing['branches']) == 2
    assert all('delta' not in branch and 'success' not in branch for branch in competing['branches'])
    assert all('before' in branch['evidence'][0] and 'after' in branch['evidence'][0]
               for branch in competing['branches'])
    competing['branches'][0]['provenance']['self'] = 999
    assert pickle.dumps(sim) == before
    assert not {'memory', 'families', 'experiences'} & projector.frame()['agents'][0].keys()


def test_log_filters_physical_participation_and_keeps_provenance_metadata():
    sim, agent = populated()
    projector = RepresentationProjector(sim)
    before = pickle.dumps(sim)

    log = projector.detail('agent', agent.uid, 'log')['detail']

    assert [event['actor'] for event in log['events']] == [agent.uid, 999]
    assert {entry['provenance']['origin'] for entry in log['experiences']} == {'self', 'observed'}
    assert all('success' not in entry and 'delta' not in entry for entry in log['experiences'])
    assert log['eventCapacity'] == 200
    assert log['experienceCapacity'] == sim.config.experience_capacity
    assert pickle.dumps(sim) == before


def test_inspection_http_is_read_only_and_does_not_cross_runtime_boundary():
    sim, agent = populated()
    before = pickle.dumps(sim)
    with running_server(sim) as server:
        for section in ('memory', 'log'):
            status, data = request(server, 'GET', f'/api/selection/agent/{agent.uid}/{section}')
            assert status == 200
            assert data['detail']['agentId'] == agent.uid
            assert data['tick'] == 0 and data['worldRevision']
        assert request(server, 'GET', '/api/selection/agent/1/unknown')[0] == 400
    assert pickle.dumps(sim) == before

    def forbidden(*args):
        raise AssertionError('inspection crossed an active runtime method')

    sim.snapshot = sim.perceive = agent.memory.snapshot = forbidden
    projector = RepresentationProjector(sim)
    assert projector.detail('agent', agent.uid, 'memory')['detail']['families']
    assert projector.detail('agent', agent.uid, 'log')['detail']['experiences']
    assert projector.detail('agent', -1, 'memory')['detail'] is None
    assert projector.detail('agent', -1, 'log')['detail'] is None


def test_deep_readings_do_not_change_subsequent_population_evolution():
    observed, control = simulation(), simulation()
    projector = RepresentationProjector(observed)
    for _ in range(20):
        for uid in observed.agents:
            projector.detail('agent', uid, 'memory')
            projector.detail('agent', uid, 'log')
        observed.step()
        control.step()
    assert pickle.dumps(observed) == pickle.dumps(control)
