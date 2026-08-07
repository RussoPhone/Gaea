from collections import OrderedDict

class SpatialMemory: #memoria de longo prazo ela guarda experiencias de cada local que passou 
    def __init__(self, capacity = 10):
        self.capacity = capacity #quantidade de locais guardados na memoria pode ser alterada depois
        self.locations = OrderedDict() #(x, y) -> {"effect":..., "tick...":}, do mais antigo pro mais recente
        
    def remember (self, x, y, effect, tick): #salva e atualiza os efeitos que foram sentidos na cordenada visitada tudo entra na lista até mesmo 'path'
        chave = (x, y)
        
        if chave in self.locations: #atualiza os efeitos sentidos nos locais já visitados efeito novo subistitui o efeito antigo
            self.locations[chave]  = {"effect": effect, "tick": tick}
            self.locations.move_to_end(chave)
            return
        
        if len(self.locations) >= self.capacity: #mesmo esquema lotou esquece o antigo registra o novo
            self.locations.popitem(last=False)
            
        self.locations[chave] = {"effect": effect, "tick": tick}
            
    def known_locations(self, effect= None): #filtra por efeito ao invés de tile comida e agua agora
        if effect is None:
            return list(self.locations.keys())
        return [pos for pos, info in self.locations.items() if info['effect'] == effect]
    
    def knows(self, x, y): #verifica se o local foi memorizado
        return (x,y) in self.locations
    
    def forget(self, x, y): #remove o local da memoria
        self.locations.pop((x,y), None)
        
    def debug_text(self): #debug da memoria
        if not self.locations:
            return 'sem locais memorizados'
        
        itens = ', '.join(f"{pos}={info['effect']}" for pos, info in self.locations.items())
        return itens