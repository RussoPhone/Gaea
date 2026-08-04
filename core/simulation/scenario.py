import random

from core.ambient.world import World
from core.ambient.sky import Sky
from core.ambient.tile import WATER, FOOD, GRASS, STONE
from core.being.organism import Organism
from core.simulation.renderer import Renderer
from core.simulation.gtime import Gtime
from core.simulation.simulation import Simulation
from core.sense.sensor import Sensor

def place_tiles(world, tile, amount):
    placed = 0

    while placed < amount:
        x = random.randint(0, world.width -1)
        y = random.randint(0, world.height -1)

        if world.get_tile(x, y) == GRASS:
            world.set_tile(x, y, tile)
            placed += 1

def random_passable_position(world):
    while True:
        x = random.randint(0, world.width - 1)
        y = random.randint(0, world.height - 1)
        if world.is_passable(x, y):
            return x, y

def build_scenario(config): #monta um cenario completo a partir da scenarioconfig
    random.seed(config.seed) 
    
    world = World(config.world_width, config.world_height)
    
    place_tiles(world, WATER, config.num_water_tiles)
    place_tiles(world, FOOD, config.num_food_tiles)
    place_tiles(world, STONE, config.num_stone_tiles)

    for i in range(config.num_organism):
        x, y = random_passable_position(world)
        organism = Organism(
            f"gaiano_{i}",
            str(i),
            x,
            y,
            sensor=Sensor(range_=6))
        
        world.add_entity(organism)

    sky = Sky()
    renderer = Renderer()
    gtime = Gtime(mtksptk=config.mtksptk)

    simulation = Simulation(
        world=world,
        sky=sky,
        renderer=renderer,
        gtime=gtime,
        simulation_duration=config.simulation_duration,
        frame_delay=config.frame_delay,
        )

    return simulation
