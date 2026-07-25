import os
import time
from core.being.organism import Organism
from core.ambient.tile import WATER, FOOD, GRASS
from core.systems.environment_system import EnvironmentSystem
class Simulation: #È aqui que fica os parametros da simulação.
    def __init__(self, world, sky, renderer, gtime, simulation_duration=120, frame_delay=0.05):
        self.world = world
        self.sky = sky
        self.renderer = renderer
        self.gtime = gtime
        self.simulation_duration = simulation_duration
        self.frame_delay = frame_delay
        self.environment_system = EnvironmentSystem()


    def clear_screen(self): #Limpa a tela
        os.system("cls" if os.name == "nt" else "clear")
    
    def capture_state(self, entity):
        return {
            "x": entity.x, "y": entity.y,
            "hunger": entity.body.hunger,
            "thirst": entity.body.thirst,
            "alive": entity.body.alive,

        }
    def body_reason(self, entity):
        fome = entity.body.hunger >= 50
        sede = entity.body.thirst >=50
        if fome and sede: return "fome e sede"
        elif fome: return "fome"
        elif sede: return "sede"
        return "nenhum"

    def process_entity(self, entity):
        if not isinstance(entity, Organism):
            return

        entity.update(self.world)

        perception = self.perceive(entity)

        if entity.needs_action():
            action = self.decide_action(entity, perception)

            applied = self.act(entity, action)

            entity.record_action(applied)
        self.environment_system.apply(self, entity)

    def perceive(self, entity):
        return None

    def decide_action(self, entity, perception):
        if entity.decision_system is not None:
            return entity.decision_system.decide(entity, perception)
        return [
            (1, 0),
            (-1, 0),
            (0, 1),
            (0, -1),
            ]

    def act(self, entity, directions):
        for dx, dy in directions:
            if self.world.move_entity(entity, dx, dy):
                return f"moved ({dx}, {dy})"
        return "tried to move"


    def step(self):
        for entity in self.world.entities:
            self.process_entity(entity)

        self.gtime.adv()

    def run(self, render_enabled=True):
        while self.gtime.mtk < self.simulation_duration:
            self.step()

            if render_enabled:
                self.clear_screen()
                self.render()
                time.sleep(self.frame_delay)


    def render(self):
        print(self.gtime.debug_text())
        print()
        #calcula a luz atual a partir do tempo
        light = self.sky.get_light(self.gtime)
        #mostra o valor da luz
        print(f"Light: {light}")
        print()
        for entity in self.world.entities:
            print(entity.debug_text())
            if entity.needs_action():
                print(f"{entity.name} needs action")
            print()
        #desenha o mundo + luz atual
        print(self.renderer.render_lit(self.world, light))
