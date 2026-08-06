import random
from collections import OrderedDict

#avaliar possibilidades de memoria 

class SpatialMemory:  #memoria de longo prazo que guarda as cords relevantes (ex: comida e agua)
    def __init__ (self, capacity=20, relevant_types=('food', 'water')):
        self.capacity = capacity #quantos locais são guardados no maximo
        self.relevant_types = relevant_types #quais tiles valem a pena guardar
        self.locations = OrderedDict() #cria o dicionario com as localizações que são memorizadas
        
    def _is_relevant(self, tile_type): #avalia se um tile é relevante quando descoberto
            return tile_type in self.relevant_types
        
    def remember(self, x, y, tile_type, tick): #salva ou atualiza oque foi visto no mundo
            chave = (x, y)
            
            if chave in self.locations: #atualiza a localizaçao por mais que seja irrelevante até ela ser esquecida
                self.locations[chave] = {'tile_type': tile_type, 'tick': tick}
                self.locations.move_to_end(chave)
                return
            
            if not self._is_relevant(tile_type): #se tile é novo porem não é relevante ele não entra
                return
            
            if len(self.locations) >= self.capacity: #quando a memoria lota esquece o mais antigo para abrir espaço
                self.locations.popitem(last=False)

            self.locations[chave] = {'tile_type': tile_type, 'tick': tick}
    
    def known_locations(self, tile_type=None): #puxa as cordenadas conhecidas podendo filtrar por tipo de tile
        if tile_type is None:
            return list(self.locations.keys()) 
        return [pos for pos, info in self.locations.items() if info['tile_type'] == tile_type]
    
    def knows(self, x, y): #verifica se a cordenada foi memorizada
        return (x, y) in self.locations
    
    def forget(self, x, y): #remove uma cordenada da memoria
        self.locations.pop((x, y), None)
        
    def debug_text(self): #debug da memoria
        if not self.locations:
            return 'sem locais memorizados'
        
        itens = ", ".join(f"{pos}={info['tile_type']}" for pos, info in self.locations.items())
        return itens
