# Gaea

**Gaea é um mundo.**

O projeto existe para construir, executar e observar esse mundo. Sistemas como cognição, sobrevivência, cultura, ecologia, física, organismos, linguagem ou civilização são partes possíveis dele, não a definição do projeto inteiro. O escopo do mundo pode crescer conforme novas propriedades e fenômenos se tornarem relevantes.

A implementação executável atual ainda é estreita: o experimento **Mundo** usa `PopulationSimulation`, com gaianos, terreno, objetos, necessidades fisiológicas, memória, aprendizagem e reprodução. Essas escolhas descrevem o runtime atual, não limites conceituais do Gaea.

O antigo motor `Simulation`/`ScenarioConfig` vive em `legacy/` e não é usado pela CLI principal.

> Estado consolidado em 2026-09-09: interface observacional e movimento em microcélulas estão implementados; o launcher de experimentos está ativo; a Memória Relacional V2 está especificada conceitualmente, mas o runtime ainda usa a memória anterior. Veja [`docs/project-state.md`](docs/project-state.md).

## Executar

Python 3.11 ou posterior. O simulador e a interface usam somente a biblioteca padrão. Para os testes, instale `pytest` no ambiente Python.

Na raiz do projeto:

```sh
python -m core.main ui
```

Abra **http://127.0.0.1:8765** e escolha **Mundo**. A execução começa pausada. O mundo top-down ocupa a janela em ASCII ligado ao estado físico: arraste para mover a câmera, use a roda para aproximar e clique em agentes, objetos ou terreno. Um inspector não modal mostra informações básicas e permite escolher entre todos os elementos da célula, inclusive vários objetos. Os controles inferiores permitem continuar, pausar, avançar um tick, definir de `0.1` a `100000` ticks/s e disparar uma rajada. O controle **colisão** mostra ou oculta a ocupação física sem modificar a simulação. O worker avança independentemente do polling da interface.

Atalhos: `Espaço` continua ou pausa; `.` avança um tick; `F` acompanha o agente selecionado; `0` enquadra o mundo; setas movem a câmera; `Esc` fecha a inspeção.

Para um mundo menor:

```sh
python -m core.main ui --population 10 --width 18 --height 14 --objects 90 --stones 5
```

O mapa global é a visão do pesquisador, não a perspectiva sensorial do gaiano. Consultar ou selecionar um agente não modifica experiência, memória, decisões ou aleatoriedade. A interface expõe registros já armazenados e projeções read-only do estado. Contrato e limites estão em [`docs/interface/tiles-foundation.md`](docs/interface/tiles-foundation.md) e [`docs/interface/visual-language.md`](docs/interface/visual-language.md).

## Launcher e experimentos

A CLI de interface abre primeiro um registry de experimentos. Uma entrada pode ser executável ou conter subexperimentos. Atualmente o catálogo padrão possui uma única entrada executável, **Mundo**, que cria o `PopulationSimulation` atual e o conecta à interface observacional.

Isso permite que futuros estudos e recortes do Gaea sejam registrados sem transformar cada investigação na definição do projeto inteiro. Para adicionar uma entrada, veja [`docs/experiments/registry.md`](docs/experiments/registry.md).

## Runtime populacional atual

O runtime executável atual está em `core/simulation/population.py`. Ele é um experimento populacional dentro do Gaea, não sinônimo do projeto.

O cenário padrão possui:

- gaianos com corpo, orientação, percepção e repertório motor;
- fome e sede como canais internos atuais;
- terreno, objetos físicos e locais produtores;
- aprendizagem individual e observação social;
- reprodução opcional e morte fisiológica;
- memória relacional implementada em `core/cognition`;
- execução determinística por seed, checkpoints, métricas e benchmarks.

Não há scripts de aldeias, profissões, alianças, linguagem ou civilização. A ausência desses sistemas no runtime atual não significa que estejam fora do escopo do mundo.

## Fronteira cognitiva

A fronteira cognitiva atual está em `core/cognition/records.py`. `View`, `Observation`, `Action` e `Experience` são registros imutáveis. A decisão não recebe `World`, objetos físicos completos, o organismo completo ou o estado interno de outros indivíduos.

No runtime atual, um gaiano recebe:

- seu estado corporal atual, hoje fome e sede;
- aparências numéricas percebidas, independentes dos efeitos físicos;
- tokens persistentes usados para reidentificação dentro deste experimento;
- deslocamentos relativos, orientação, movimento e shapes visíveis;
- ações e sinais externamente perceptíveis de outros indivíduos;
- terreno dentro do alcance e da oclusão atual.

`Tile.tile_type`, `PhysicalObject.effect`, nomes como `food`, `water` e `stone` e outras propriedades internas pertencem à verdade física ou ao cenário do pesquisador. Eles não são entregues como significado cognitivo ao gaiano.

## Memória: implementação atual e V2

Cada gaiano nasce com memória vazia. **O código atual ainda usa a primeira memória relacional populacional.** Uma relação é formada principalmente por assinatura percebida, ação, faixa do estado corporal, sinal e origem da experiência. Ela acumula consequência corporal estimada, peso, confiança, contradições, idade e evidências recentes.

A decisão atual consulta essas relações para estimar consequências de ações e pode propagar valor para movimentos de aproximação. Observações sociais possuem confiança reduzida e não revelam o delta fisiológico de outro corpo.

Essa implementação continua funcional e coberta pelos testes existentes, mas não representa a arquitetura cognitiva consolidada em 2026-09-09.

A **Memória Relacional V2**, ainda pendente de implementação, muda a unidade básica para uma experiência composta por:

```text
Experience
├── before: estado interno + campo externo percebido
├── occurrence: verbo, alvo/sinal percebido e participantes perceptíveis
├── after: estado interno + campo externo percebido
├── transition
│   ├── mudanças dos canais internos
│   ├── aparecimentos e ausências
│   ├── deslocamentos percebidos
│   └── mudanças de aparência, ação, movimento ou sinal
└── provenance: própria/observada, ator percebido e tick
```

A transição deve registrar somente o que pode ser derivado dos dois momentos perceptivos. Um elemento que some do campo, por exemplo, pode ser registrado como ausente depois, mas não automaticamente como consumido ou destruído. Tokens podem ligar um elemento entre `before` e `after`, mas não devem servir como categorias semânticas. A generalização futura deve se apoiar nas características percebidas e nas relações entre experiência, contexto e mudança.

A migração V2 atravessará `records.py`, `population.py`, `memory.py`, `decision.py`, inspeção e testes. Até essa migração acontecer, qualquer leitura do código deve distinguir **memória implementada atual** de **memória V2 especificada**.

## Física e continuidade

Terreno, objetos manipuláveis e organismos são camadas separadas. Cada tile reúne uma grade física de **3x3 microcélulas**. Um gaiano adulto ocupa duas microcélulas cardinais adjacentes: a base é sua posição canônica e a segunda célula indica a direção corporal.

`move` avança a base por uma microcélula em um tick. Atravessar a largura alinhada de um tile requer três movimentos. Dois gaianos podem compartilhar o mesmo tile quando suas microcélulas não se sobrepõem.

A malha fina é mantida por `PhysicalSpace`, que controla ocupação, bloqueio, shapes e visibilidade parcial. Tiles continuam sendo agregação de terreno e índice espacial. Interações físicas relevantes exigem proximidade e orientação compatíveis com a malha de microcélulas.

Objetos possuem aparência, shape e propriedades internas independentes, incluindo efeito corporal, portabilidade, ingestibilidade, quantidade e bloqueio físico quando aplicável. A percepção expõe apenas propriedades sensoriais permitidas pela fronteira cognitiva.

A UI deriva sua representação desse estado. A visualização de colisão revela ocupação física sem alterar o mundo.

## Interface e observabilidade

A saga de redesign visual está encerrada. A interface atual é a base observacional estável do experimento. Mudanças futuras nessa frente devem priorizar **legibilidade e observabilidade**, não reiniciar a linguagem visual sem necessidade.

O inspector do gaiano possui leituras de corpo, memória e registro. Essas leituras existem para o pesquisador e não alimentam a cognição do agente. Seleção, zoom, câmera e inspeção são read-only em relação à simulação.

## Headless, seeds e resultados

```sh
python -m core.main run --seed 42 --ticks 10000 --output runs/seed-42.jsonl --events
python -m core.main batch --seeds 1,2,3 --ticks 10000 --output runs/lote-a
python -m core.main benchmark --populations 10,50,100,200 --ticks 200
```

`--no-learning`, `--no-observation` e `--no-reproduction` permitem ablações. `--renewal 0` desliga a produção ambiental. Extinção encerra o ensaio e é registrada como resultado, sem repovoamento automático.

Checkpoints:

```sh
python -m core.main run --ticks 10000 --checkpoint runs/estado.gaea
python -m core.main run --resume runs/estado.gaea --ticks 10000 --output runs/continuacao.jsonl
python -m core.main ui --resume runs/estado.gaea
```

Os ticks de uma retomada são adicionais. O checkpoint preserva configuração, RNGs, corpos, objetos, memórias e tempo. Use somente checkpoints locais confiáveis; o formato versionado usa pickle e a retomada exige o mesmo hash de código.

## Testes

```sh
python -m pytest -q
node --test tests/js/*.test.mjs
```

A suíte atual cobre física, runtime populacional, aprendizagem da memória implementada, representação, interface, launcher de experimentos, checkpoints e comportamento determinístico. Testes do runtime histórico permanecem em `tests/legacy/`.

## Organização do código

- `core/ambient`: terreno, objetos físicos e malha fina de ocupação.
- `core/being`: organismo e corpo do runtime atual.
- `core/cognition`: registros, memória implementada atual e decisão.
- `core/experiments`: registry e entradas executáveis do laboratório.
- `core/simulation/population.py`: experimento populacional atualmente usado por **Mundo**.
- `core/simulation/experiments.py`: métricas, JSONL, checkpoints e benchmark.
- `core/representation`: projeção pública read-only e inspeção.
- `core/interface`: launcher, controlador HTTP e cliente observador ASCII.
- `legacy/`: runtime histórico, preservado para toys e testes antigos.
- `toys/`: experimentos históricos pequenos.

As regras conceituais canônicas estão em [`rules.md`](rules.md). O estado consolidado do projeto está em [`docs/project-state.md`](docs/project-state.md).
