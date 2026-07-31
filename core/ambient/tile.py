class Tile: #aqui fica os tiles. As peças no tabuleiro.
    def __init__(self, tile_type, symbol): #terá seu nome tipo e seu simbolo representante.
        self.tile_type = tile_type
        self.symbol = symbol
#as tiles. Tipo e simbolo.
GRASS = Tile("grass", ".")
STONE = Tile("stone", "S")
WATER = Tile("water", "~")
FOOD = Tile("food", "*")
