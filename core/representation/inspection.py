"""Read-only, researcher-facing inspection of stored perceptual evidence."""
from copy import deepcopy
from dataclasses import asdict


def experience_record(experience, cache=None):
    # The same perceived experience is referenced as evidence by every
    # branch it satisfies, so callers that walk many branches should pass a
    # shared cache: it makes the (expensive, recursive) asdict conversion of
    # each unique experience run once instead of once per reference.
    if cache is not None:
        cached = cache.get(id(experience))
        if cached is not None:
            return cached
    record = {
        'tick': experience.tick,
        'action': experience.action,
        'target': experience.target,
        'provenance': asdict(experience.provenance),
        'before': asdict(experience.before),
        'after': asdict(experience.after),
        'changes': [asdict(change) for change in experience.changes],
    }
    if cache is not None:
        cache[id(experience)] = record
    return record


def _condition_record(condition):
    return {'kind': condition.kind, 'value': deepcopy(condition.value)}


def _branch_record(branch, family_strength, tick, cache):
    return {
        'id': branch.id,
        'transition': deepcopy(branch.transition.changes),
        'strength': branch.strength,
        'support': branch.strength / family_strength if family_strength else 0.0,
        'evidenceCount': branch.evidence_count,
        'provenance': dict(branch.provenance),
        'evidence': [experience_record(experience, cache) for experience in branch.evidence],
        'lastTick': branch.last_tick,
        'age': tick - branch.last_tick,
    }


def memory_record(agent, tick):
    memory = agent.memory
    # Shared across every branch/family below: the same evidence experience
    # is referenced by every branch whose antecedent it satisfied, so without
    # a shared cache each reference would repeat the full recursive
    # conversion of that experience's nested views.
    cache = {}
    families = []
    for family in memory.families.values():
        branches = [
            _branch_record(branch, family.strength, tick, cache)
            for branch in family.branches.values()
        ]
        families.append({
            'id': family.id,
            'antecedent': {
                'operation': family.antecedent.occurrence[0],
                'occurrence': deepcopy(family.antecedent.occurrence),
                'conditions': [
                    _condition_record(condition)
                    for condition in family.antecedent.conditions
                ],
            },
            'strength': family.strength,
            'competition': len(branches) > 1,
            'branches': sorted(branches, key=lambda branch: (-branch['strength'], branch['id'])),
            'lastTick': family.last_tick,
            'age': tick - family.last_tick,
            'active': family.active,
        })
    return {
        'agentId': agent.uid,
        'families': sorted(families, key=lambda family: (
            not family['active'], -family['strength'], family['id']
        )),
        'experiences': [experience_record(experience, cache) for experience in memory.experiences],
        'capacity': memory.capacity,
        'forgottenFamilies': memory.forgotten,
        'forgottenBranches': memory.forgotten_branches,
        'experienceCount': len(memory.experiences),
        'experienceCapacity': memory.experiences.maxlen,
    }


def log_record(simulation, agent):
    # Participation is explicit in the global physical log. It is not inferred
    # from proximity and is not a complete individual lifetime record.
    allowed = ('tick', 'actor', 'action', 'target', 'child', 'generation',
               'position', 'target_position', 'delta')
    events = [
        deepcopy({key: event[key] for key in allowed if key in event})
        for event in simulation.events
        if agent.uid in (event.get('actor'), event.get('target'), event.get('child'))
    ]
    return {
        'agentId': agent.uid,
        'events': events,
        'experiences': [experience_record(experience) for experience in agent.memory.experiences],
        'eventCapacity': simulation.events.maxlen,
        'experienceCapacity': agent.memory.experiences.maxlen,
    }
