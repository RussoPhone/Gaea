class SeekPolicy:

    def __init__(self, fallback):
        self.fallback = fallback
    
    def decide(self, entity, perception):
        alvo = self._escolher_alvo(entity, perception)

        if alvo is None:
            return self.fallback.decide(entity, perception)
        return self._direcoes_em_direcao_ao_alvo(alvo) + [(0, 0)]

    def _escolher_alvo(self, entity, perception):
        if perception is None:
            return None
        if entity.body.thirst >= 50:
            tipo = "water"

