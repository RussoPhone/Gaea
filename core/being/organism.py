from core.being.entity import Entity
from core.being.body import Body


class Organism(Entity):
    def __init__(self, name, symbol, x, y, sensor=None, decision=None, memory=None):
        super().__init__(name, symbol, x, y)

        self.body = Body() #Necessidades, vida e morte
        self.memory = memory #padrões aprendido, inc futuro
        self.decision_system = decision #escolha de ação, inc futura
        self.sensor = sensor 
        self.orientation = (0, -1)
    
    def update(self, world):
        if not self.body.alive:
            self.record_action("dead")
            return

        self.body.update_needs()

        if not self.body.alive:
            self.record_action("morto")
            return

        current_tile = world.get_tile(self.x, self.y)

    def needs_action(self):
        return self.body.needs_action()


    def debug_text(self):
        state = "vivo" if self.body.alive else "morto"
        return f" name={self.name} | pos=({self.x}, {self.y}) | hunger={self.body.hunger} | thirst ={self.body.thirst} | {state} "
