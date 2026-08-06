class Perception:
    def __init__(self):
        self.reading = []

    def add(self, spatial, tile, occupied):
        self.reading.append({
            "distance": spatial.distance(),
            "dx" : spatial.dx,
            "dy": spatial.dy,
            "surface": tile.tile_type,
            "occupied": occupied,
        })
