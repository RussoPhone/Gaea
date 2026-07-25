import random 

class NaivePolicy:
    DIRECTIONS = [
        (1,0),
        (-1, 0),
        (0, 1),
        (0, -1), 
        (0, 0)
    ]

    def decide(self, entity, perception):
        opcoes = self.DIRECTIONS.copy()
        random.shuffle(opcoes)
        return opcoes 
