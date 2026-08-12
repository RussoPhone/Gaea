class Body:
    def __init__(self):
        self.hunger = 0
        self.thirst = 0
        self.alive = True
        

    def update_needs(self):
        if not self.alive:
            return


        self.hunger += 0.5
        self.thirst += 0.5 

        if self.hunger >= 100 or self.thirst >= 100:
            self.alive = False

    def drink(self): #função de consumir liquido.
        if not self.alive:
            return
        self.thirst -= 10

        if self.thirst < 0:
            self.thirst = 0
 
    def eat(self):
        if not self.alive:
            return
        self.hunger -= 5

        if self.hunger < 0:
            self.hunger = 0

    def needs_action(self): #função que desperta ação
        if not self.alive:
            return False

        return self.hunger >= 50 or self.thirst >= 50
