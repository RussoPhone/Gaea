"""Behavioral interpretation of recalled perceptual relations."""
from core.cognition.experience import occurrence_from_action
from core.cognition.records import Action, candidates


class Decision:
    def __init__(self, rng, exploration=.18):
        self.rng = rng
        self.exploration = exploration
        self.last = {}

    @staticmethod
    def _branch_internal_value(view, memory, branch):
        value = 0.0
        found = False
        for change in branch.transition.changes:
            subject, attribute = change[:2]
            if not subject or subject[0] != 'internal' or attribute != 'value':
                continue
            index = subject[1]
            if index >= len(view.body):
                continue
            delta = change[2] * memory.transition_resolution
            value -= delta * max(.02, view.body[index] / 100)
            found = True
        return value, found

    def prediction(self, view, memory, occurrence):
        matches = memory.recall(view, occurrence)
        exact = [match for match in matches if match.exact]
        if not exact:
            return 0.0, []
        if occurrence.target is not None:
            targeted = [
                match for match in exact
                if any(condition.kind == 'target' for condition in match.family.antecedent.conditions)
            ]
            if not targeted:
                return 0.0, []
            exact = targeted
        signaled = [
            match for match in exact
            if any(condition.kind == 'signal' for condition in match.family.antecedent.conditions)
        ]
        if signaled:
            exact = signaled
        specificity = max(len(match.family.antecedent.conditions) for match in exact)
        usable = [
            match for match in exact
            if len(match.family.antecedent.conditions) == specificity
        ]
        numerator = denominator = imitation = 0.0
        used = []
        for match in usable:
            family = match.family
            used.append(family.id)
            family_has_internal = any(
                any(change[0] and change[0][0] == 'internal' and change[1] == 'value'
                    for change in branch.transition.changes)
                for branch in family.branches.values()
            )
            for branch in family.branches.values():
                branch_value, has_internal = self._branch_internal_value(view, memory, branch)
                if family_has_internal:
                    numerator += branch.strength * branch_value
                    denominator += branch.strength
                elif branch.transition.changes:
                    evidence_strength = branch.strength / (branch.strength + 2.0)
                    imitation = max(imitation, .8 * evidence_strength)
        return (numerator / denominator if denominator else imitation), sorted(set(used))

    def choose(self, view, memory, actions=None):
        actions = candidates(view) if actions is None else actions
        predictions = {}

        def predict(action):
            occurrence = occurrence_from_action(view, action)
            if occurrence not in predictions:
                predictions[occurrence] = self.prediction(view, memory, occurrence)
            return predictions[occurrence]

        scored = []
        for action in actions:
            value, used = predict(action)
            if action.verb == 'move':
                for observation in view.items:
                    distance = abs(observation.dx) + abs(observation.dy)
                    next_distance = abs(observation.dx - action.dx) + abs(observation.dy - action.dy)
                    if distance <= 1 or next_distance >= distance:
                        continue
                    for verb in ('ingest', 'touch', 'pick', 'give'):
                        estimate, evidence = predict(Action(verb, observation.token))
                        propagated = estimate * .8 ** distance
                        if propagated > value:
                            value, used = propagated, evidence
            scored.append((value, action, used))

        exploring = self.rng.random() < self.exploration
        if exploring:
            chosen = self.rng.choice(scored)
        else:
            best = max(row[0] for row in scored)
            chosen = self.rng.choice([row for row in scored if abs(row[0] - best) < 1e-9])
        active = set(chosen[2])
        for family in memory.families.values():
            family.active = family.id in active
        self.last = {
            'exploration': exploring,
            'estimate': round(chosen[0], 4),
            'families': chosen[2],
            'action': chosen[1].verb,
            'alternatives': [
                {
                    'action': action.verb,
                    'target': action.target,
                    'dx': action.dx,
                    'dy': action.dy,
                    'value': round(value, 4),
                }
                for value, action, _ in sorted(scored, key=lambda row: -row[0])[:8]
            ],
        }
        return chosen[1]
