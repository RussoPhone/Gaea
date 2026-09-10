# Gaea

Laboratório populacional para investigar comportamentos aprendidos e persistentes a partir de condições físicas. Não há scripts de civilização, aldeias, profissões, alianças ou linguagem. Este recorte oferece um substrato experimental; ainda não há evidência de civilização inteligente.

**Runtime atual:** `PopulationSimulation` via `python -m core.main`. O antigo motor `Simulation`/`ScenarioConfig` vive em `legacy/` e não é usado pela CLI principal.

## Executar

Python 3.11 ou posterior. O simulador e a interface usam somente a biblioteca padrão. Para os testes, instalar `pytest` no seu ambiente Python.

Na raiz do projeto:

```sh
python -m core.main ui
```

Abra **http://127.0.0.1:8765** e escolha **Mundo**. A execução começa pausada. O mundo top-down ocupa a janela em ASCII ligado ao estado físico: arraste para mover a câmera, use a roda para aproximar e clique em agentes, objetos ou terreno. Um inspector não modal mostra informações básicas e permite escolher entre todos os elementos da célula, inclusive vários objetos. Os controles inferiores permitem continuar, pausar, avançar um tick, definir de `0.1` a `100000` ticks/s e disparar uma rajada. O controle **colisão** mostra ou oculta a ocupação física sem modificar a simulação. O controle **visão** pinta, para o gaiano selecionado, o conjunto de células que ele percebe neste tick (contato em todas as direções, visão à distância só no semiplano frontal, com oclusão por terreno bloqueante); é uma projeção somente-leitura e não gera experiência. O campo **semente** + **gerar mundo** recria o mundo com a mesma configuração e a semente informada (vazio = semente aleatória), zerando o relógio. O worker avança independentemente do polling da interface.

Atalhos: `Espaço` continua ou pausa; `.` avança um tick; `F` acompanha o agente selecionado; `0` enquadra o mundo; setas movem a câmera; `Esc` fecha a inspeção.

Para um mundo menor:

```sh
python -m core.main ui --population 10 --width 18 --height 14 --objects 90 --stones 5
```

O mapa global é a visão do pesquisador, não a perspectiva sensorial do gaiano. Consultar ou selecionar um agente não modifica experiência, memória, decisões ou aleatoriedade. A interface expõe registros e memória já armazenados, mas não fornece ao pesquisador uma visão sensorial simulada nem envia ordens ao gaiano. Contrato, testes e limites estão em [Fundação tiles](docs/interface/tiles-foundation.md).

O inspector do gaiano possui abas **Corpo**, **Memória** e **Registro**. Memória apresenta relações e suas evidências; Registro separa experiências próprias/observadas dos eventos físicos envolvendo o indivíduo. Essas leituras são consultadas ao abrir a aba e ficam fixadas no tick indicado: use **atualizar** para obter outra leitura sem pausar a simulação. Assinaturas não são convertidas em nomes de recursos. A [linguagem visual e os limites da inspeção](docs/interface/visual-language.md) estão documentados separadamente.

## Headless, seeds e resultados

```sh
python -m core.main run --seed 42 --ticks 10000 --output runs/seed-42.jsonl --events
python -m core.main batch --seeds 1,2,3 --ticks 10000 --output runs/lote-a
python -m core.main benchmark --populations 10,50,100,200 --ticks 200
```

Cada JSONL começa com configuração, versão do Python e hash do código, contém métricas periódicas e termina com o resultado. `--events` acrescenta eventos físicos relevantes e seus microticks exatos. Os arquivos existentes não são sobrescritos. O custo temporal registrado é uma medida da máquina, não parte do estado determinístico.

`--no-learning`, `--no-observation` e `--no-reproduction` permitem ablações. `--renewal 0` desliga a produção ambiental. Extinção encerra o ensaio e é registrada como resultado, sem repovoamento automático. `--sample-every 1000` reduz a frequência das métricas.

```sh
python -m core.main run --ticks 10000 --checkpoint runs/estado.gaea
python -m core.main run --resume runs/estado.gaea --ticks 10000 --output runs/continuacao.jsonl
python -m core.main ui --resume runs/estado.gaea
```

Os ticks de uma retomada são **adicionais**. O checkpoint preserva configuração, RNGs, corpos, objetos, memórias e tempo. É gravado atomicamente ao final da execução; não é autosave periódico. Use somente checkpoints locais confiáveis: o formato versionado usa pickle. A retomada exige o mesmo hash de código. A configuração do arquivo prevalece sobre os parâmetros de cenário fornecidos à CLI.

## O que um gaiano recebe

A fronteira cognitiva está em `core/cognition/records.py`. `View`, `Observation`, `Action` e `Experience` são registros imutáveis. A decisão não recebe `World`, objetos físicos, o organismo completo ou o estado interno de outros indivíduos.

- Corpo próprio: dois déficits fisiológicos contínuos, fome e sede.
- Aparências: triplas numéricas observáveis, independentes dos efeitos físicos. Os números não são nomes de tipos ou classes funcionais.
- Identidade: marca visual persistente representada por um token. Esta versão assume que indivíduos e objetos podem ser reidentificados por essa marca; não simula reconhecimento visual biológico.
- Espaço: deslocamentos relativos, orientação corporal e posição relativa adquirida por movimento. Não há mapa global na decisão.
- Outros: deslocamento, última ação externamente visível e sinal arbitrário, dentro do alcance e oclusão. Nenhuma necessidade, intenção ou memória alheia.

A visão é um semiplano frontal com distância Manhattan e oclusão por terreno bloqueante; há contato omnidirecional a distância 1. A iluminação do runtime populacional é constante nesta versão. O ciclo de céu do runtime legado (`legacy/`) continua disponível nos toys históricos, mas não condiciona este experimento.

`Tile.tile_type` e `PhysicalObject.effect` pertencem à verdade física interna. A percepção, inclusive no toy histórico, não transmite `food`, `water`, `stone` ou identificadores funcionais equivalentes. Trocar os efeitos associados às aparências não exige alteração do código cognitivo.

## Como a memória influencia uma ação

Cada gaiano nasce com memória vazia. Uma relação contextual reúne assinatura, ação, faixa do próprio estado corporal, sinal percebido e origem da experiência. A relação guarda consequência corporal estimada, peso, confiança, contradições, idade e até quatro evidências completas. As experiências também registram ator, alvo, contexto sensorial, posição relativa e mudança visível.

Os efeitos são atualizados por média exponencial. Resultados contraditórios elevam o erro e reduzem confiança; relações decaem e são removidas/substituídas quando necessário. Por padrão há no máximo 192 relações e 128 experiências recentes por agente. Não existem nós FOOD, SAFE, HOME ou conceitos equivalentes. Ainda não há formação explícita de clusters por similaridade: assinaturas iguais permitem generalização, assinaturas diferentes são aprendidas separadamente.

A decisão compara efeitos corporais previstos, ponderados pelos déficits atuais, com exploração estocástica. A aproximação de um padrão visível pode receber valor das interações previamente experimentadas com esse padrão. Isso usa apenas distâncias relativas da percepção atual; não usa pathfinding global. Os registros de decisão incluem exploração, valor estimado, alternativas e IDs das relações usadas; sua interface aprofundada fica para a próxima rodada. As evidências ajudam a explicar uma escolha; não constituem uma prova causal de comportamento coletivo.

Observar uma ação externamente visível produz experiência de menor confiança e sem delta corporal alheio. O alvo dirigido só é registrado quando a projeção sensorial contém esse alvo; caso ele suma ou não esteja visível, a memória não inventa assinatura oculta. Essa exposição favorece **experimentar** a ação observada. Só a experiência própria estabelece seu efeito fisiológico. Sinais locais podem entrar como contexto nas relações; seus quatro valores não possuem significado atribuído pelo mundo. Não há protocolo de comunicação programado.

## Física e continuidade

Terreno, objetos manipuláveis e organismos são camadas separadas. Cada tile reúne uma grade física de 3x3 microcélulas. Um gaiano adulto ocupa duas microcélulas cardinais adjacentes: a base do triângulo é sua posição canônica e a segunda célula contém o nariz orientado. `move` avança a base por uma microcélula em um tick, portanto atravessar a largura alinhada de um tile requer três movimentos; a célula pública do mundo é derivada dessa base. Dois gaianos podem compartilhar o mesmo tile quando suas microcélulas não se sobrepõem. Tiles continuam funcionando como agregação e índice para terreno, percepção e interação. O repertório motor inclui mover, girar, esperar, inspecionar, tocar, ingerir, pegar, soltar, colocar à frente, transferir e emitir sinais. Carregar é um estado persistente após pegar; aproximar-se é uma sequência de movimentos. Cada tentativa consome um tick, incluindo falhas. A ingestão exige ação explícita.

Objetos possuem aparência, shape e propriedades internas independentes: efeito corporal, portabilidade, possibilidade de ingestão, quantidade e bloqueio físico quando aplicável. Podem mudar de lugar e permanecer disponíveis a outros indivíduos. Tentativas de pegar, soltar, colocar ou transferir registram sucesso/falha, alvo material, mudança visível e contexto sensorial local para aprendizado. O cenário padrão possui dois tipos de locais produtores e objetos inertes finitos; mover um objeto inerte não cria uma cópia. Produção por intervalo e limite de estoque restringem o aporte externo.

A percepção deriva da malha física: o gaiano recebe fragmentos relativos de shape apenas quando há linha de visão, incluindo casos de oclusão parcial. Efeitos internos e nomes funcionais continuam fora da fronteira cognitiva. A UI do navegador posiciona o `@` distante na microcélula-base e, de perto, desenha um triângulo marrom-escuro cuja base está centrada nela e cuja ponta ocupa a célula do nariz. A opção **colisão** revela somente essas duas células em cinza translúcido. O renderer pode comprimir ou revelar; não cria anatomia, paredes ou construções scriptadas.

A reprodução opcional é assexuada e fisiológica: exige maturidade, intervalo, baixos déficits e espaço adjacente, custa reservas corporais e cria descendente sem memória. Não há intenção reprodutiva ou recompensa cognitiva por nascimento. `--population-limit` impõe um teto computacional de nascimentos; não provoca reposição de mortos. Mortes liberam ocupação e deixam a carga no mundo.

## Testes e limites da evidência

```sh
python -m pytest -q
node --test tests/js/*.test.mjs
```

Os testes incluem exploração inicial sem preferência funcional, mudança após ingestões reais, inversão dos efeitos com reaprendizagem, menor número de tentativas até a descoberta após exposição social, sinais contextuais, independência de memória, oclusão, falhas motoras, transporte, custos de nascimento, limite de memória/estoque, RNGs intercalados, snapshots sem efeitos e retomada exata.

Os ensaios cognitivos usam arenas controladas: alguns restringem o repertório a duas tentativas de ingestão e reposicionam o estado corporal para comparar experiências. Esses controles pertencem ao pesquisador/teste; não existem na política da população livre. O ensaio social mede tempo até a primeira descoberta própria, não demonstra compreensão das necessidades do demonstrador.

O benchmark mantém todos os agentes vivos com metabolismo zero e reprodução desligada, em densidade semelhante. Há 30 ticks de aquecimento antes da medição. Ele mede custo de populações ativas, não velocidade de um mundo extinto. Populações com memória madura e alta densidade de interações podem custar mais.

Um primeiro ensaio populacional revisado está documentado em `docs/experiments/2026-09-05-first-population.md`.

Para registrar outro experimento ou subexperimento no launcher, veja [registry de experimentos](docs/experiments/registry.md).

Limitações atuais: memória de assinaturas discretas, previsão de curto horizonte, observação de ações isoladas em vez de aprendizagem explícita de sequências, sem abstração de conceitos por similaridade, sem planejamento espacial persistente, crafting complexo ou detecção externa de cultura. Sobrevivência e gerações sucessivas são condições experimentais, não evidência de civilização. A emergência de comunicação, organização e inteligência permanece uma hipótese a investigar.

## Organização do código

O runtime atual do Gaea é `PopulationSimulation` (`core/simulation/population.py`), exposto por `python -m core.main`.

- `core/ambient`: terreno, objetos físicos e malha fina de ocupação.
- `core/being`: organismo/corpo usados pelo runtime populacional.
- `core/cognition`: registros, memória relacional e decisão sem acesso ao mundo.
- `core/simulation/population.py`: ciclo populacional, fronteira sensorial e execução física.
- `core/simulation/experiments.py`: métricas, JSONL, checkpoints e benchmark.
- `core/representation`: projeção pública read-only, bootstrap e frames dinâmicos.
- `core/interface`: controlador HTTP e cliente observador ASCII.
- `legacy/`: runtime histórico baseado em `Simulation`, `ScenarioConfig`, `Sensor`/`Perception`, sistemas de affordance/ambiente, céu/microticks e runner interativo. Não é o Gaea atual; permanece para toys e testes históricos.
- `toys/toy001_survival_instinct`: controle histórico de movimentos aleatórios sobre o runtime legado (`python -m toys.toy001_survival_instinct.run`).

As regras originais permanecem em `rules.md` e `docs/rules.md`.
