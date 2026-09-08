# Movimento contínuo em microcélulas

## Objetivo

Fazer o movimento físico dos Gaianos acontecer na grade fina do mundo. Cada tile continua sendo uma região de terreno composta por uma grade 3x3, mas um comando de movimento avança somente uma microcélula por tick. A travessia entre tiles passa a acontecer pelo percurso real entre suas microcélulas, sem salto de uma coordenada de tile para outra.

Um Gaiano adulto ocupa duas microcélulas: a microcélula da base do triângulo e a microcélula imediatamente à frente, coberta pelo nariz. Essa ocupação é simultaneamente sua geometria visual no zoom próximo e sua colisão física.

## Coordenadas físicas

O runtime mantém uma malha global de microcélulas com dimensões `world.width * 3` por `world.height * 3`. Cada Gaiano guarda a posição inteira `micro_x, micro_y` de sua base. Sua orientação cardinal determina a segunda microcélula ocupada:

- norte: `(micro_x, micro_y - 1)`;
- leste: `(micro_x + 1, micro_y)`;
- sul: `(micro_x, micro_y + 1)`;
- oeste: `(micro_x - 1, micro_y)`.

As coordenadas públicas de tile são derivadas por divisão inteira: `x = micro_x // 3` e `y = micro_y // 3`. O tile não fornece um centro físico privilegiado. O agente não recebe coordenadas globais ou locais como conhecimento; elas pertencem ao runtime físico e à observação do pesquisador.

## Nascimento e ocupação

Ao nascer, um Gaiano recebe uma base em uma microcélula livre de um tile de nascimento transitável. A escolha deve produzir uma base e um nariz válidos para sua orientação inicial. Se não houver um par livre, aquele tile não está disponível para nascimento.

Vários Gaianos podem compartilhar o mesmo tile quando suas microcélulas não se sobrepõem. A ocupação do tile não bloqueia movimento por si só. `PhysicalSpace` é a autoridade para colisões entre agentes e objetos físicos bloqueantes.

## Movimento

Uma ação `move(dx, dy)` cardinal tenta avançar a base exatamente uma microcélula na direção solicitada. A orientação resultante é a direção do movimento, e o nariz é recalculado à frente da nova base. A ação só tem sucesso quando as duas microcélulas futuras estão dentro do mundo, sobre terreno transitável e livres de outra ocupação bloqueante.

Três movimentos alinhados atravessam a largura completa de um tile. `odometry` continua registrando deslocamento motor adquirido, mas passa a contar microcélulas. Posição de tile em percepção, eventos e inspeção é sempre derivada da microposição atual da base.

O movimento físico e a atualização dos índices de tile devem ser atômicos. Uma tentativa bloqueada não muda microposição, tile, orientação, forma, odometria ou ocupação.

## Giro

Uma ação `turn` mantém a base fixa e gira o nariz 90 graus ao redor dela. O giro só tem sucesso se a nova microcélula do nariz estiver dentro do mundo, sobre terreno transitável e livre. Um giro bloqueado preserva orientação e ocupação anteriores.

## Terreno, percepção e interação

Base e nariz precisam permanecer sobre tiles transitáveis. O movimento falha assim que o nariz tentaria entrar em terreno bloqueante, mesmo que a base ainda esteja no tile anterior.

A cognição continua recebendo relações espaciais e aparências pelo contrato semântico existente. Distâncias e alcance de percepção continuam expressos em tiles derivados da base nesta etapa; a nova microposição não é exposta como conhecimento privilegiado. Quando vários Gaianos compartilham um tile, todos os que forem observáveis devem aparecer na projeção sensorial, sem colapso para um único ocupante.

Interações com objetos continuam usando o alcance por tile existente. Alterar percepção e alcance para unidades de microcélula fica fora deste escopo.

## Representação pública

Os registros públicos de agentes incluem a microposição da base e as duas microcélulas absolutas de colisão. `x` e `y` continuam presentes como coordenadas derivadas do tile para compatibilidade, indexação, inspeção e terreno.

Frames anterior e atual permitem interpolar somente movimentos adjacentes de uma microcélula. Ticks pulados não inventam trajetórias. A seleção e o hit testing usam a posição visual interpolada, mas retornam o registro autoritativo atual.

## Renderer

No zoom próximo, o triângulo marrom ocupa exatamente as duas microcélulas físicas: sua base fica centrada na microcélula-base e sua ponta ocupa a microcélula do nariz. A direção cardinal permanece inequívoca. No zoom distante, o `@` usa a microposição da base para evitar saltos e reduzir sobreposição entre agentes que compartilham um tile.

O renderer não cria células visuais que não existam na representação pública. Movimento entre tiles é animado pela interpolação da microposição, e não por interpolação direta entre centros de tiles.

## Visualização de colisão

A barra do mapa recebe um controle de alternância `colisão`, desligado por padrão. Quando ligado, ele desenha as duas microcélulas ocupadas por cada Gaiano com o cinza semitransparente já usado na interface. O triângulo marrom é desenhado por cima. A alternância é local, observacional e não envia comando para a simulação.

O estado da alternância permanece durante polling, seleção, pan, zoom e troca de frame. Recarregar a página pode restaurar o padrão desligado.

## Ritmo numérico

O seletor fechado de velocidade é substituído por um campo numérico compacto em ticks por segundo. O campo aceita valores entre `0.1` e `100000`, com passo de `0.1`, refletindo os limites atuais do servidor.

Enter ou saída do campo envia o comando `speed`. Um valor inválido não substitui o último valor confirmado pelo servidor. A falha usa o estado de erro já existente na interface, sem alterar o ritmo ativo. Atualizações recebidas no polling sincronizam o campo quando ele não está sendo editado.

## Compatibilidade e checkpoints

Novos checkpoints preservam `micro_x`, `micro_y`, orientação e registros do espaço físico, e devem restaurar exatamente a mesma evolução. Checkpoints produzidos por outra revisão continuam rejeitados pelo contrato atual de `code_hash`; esta mudança não introduz migração heurística de estado antigo.

APIs legadas de `World` podem continuar rejeitando dois ocupantes quando chamadas sem a opção física da simulação. Dentro de `PopulationSimulation`, ocupação grossa de tile é um índice multivalorado; bloqueio de agentes acontece exclusivamente no espaço físico fino.

## Validação

Testes Python cobrem:

- base e nariz como duas microcélulas adjacentes;
- um avanço de uma microcélula por ação e três avanços por largura de tile;
- travessia de borda com atualização derivada de `x` e `y`;
- bloqueio por terreno, limites, objetos e outros Gaianos;
- giro atômico bem-sucedido e bloqueado;
- compartilhamento de tile sem sobreposição;
- nascimento e restauração exata de novos checkpoints;
- percepção de todos os agentes observáveis no mesmo tile;
- snapshot e projeção com microposição e células atuais.

Testes JavaScript cobrem:

- interpolação entre microposições adjacentes;
- ausência de caminho inventado quando frames pulam ticks;
- triângulo alinhado às duas microcélulas públicas;
- `@` posicionado pela base no zoom distante;
- hit testing de agentes que compartilham um tile;
- camada de colisão desligada por padrão e correta quando ligada;
- entrada numérica de ritmo, sincronização e rejeição de valores inválidos.

A validação final usa a interface servida, espera o primeiro frame e observa um Gaiano atravessando uma borda de tile em três passos. Também confirma visualmente a alternância de colisão e o campo de ticks por segundo.

## Fora de escopo

- expor coordenadas absolutas de microcélula à cognição;
- mudar alcance sensorial ou de interação para unidades de microcélula;
- adicionar aceleração, movimento diagonal ou física contínua;
- criar significado cultural, funcional ou comportamental para a forma corporal;
- alterar o tamanho físico por idade nesta etapa.
