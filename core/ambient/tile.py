class Tile: #aqui fica os tiles. As peças no tabuleiro.
    def __init__(self, tile_type, symbol, blocking=False): #terá seu nome tipo e seu simbolo representante.
        self.tile_type = tile_type
        self.symbol = symbol
        self.blocking = blocking 
#as tiles. Tipo e simbolo.
GRASS = Tile("grass", ".")
STONE = Tile("stone", "^", blocking=True)
WATER = Tile("water", "~")
FOOD = Tile("food", "*")
