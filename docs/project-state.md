# Estado do projeto

Atualizado em 2026-09-09.

## Definição canônica

Gaea é um mundo.

O projeto não é definido por civilização emergente, sobrevivência, cognição ou qualquer outro subsistema isolado. Esses elementos são propriedades, fenômenos e experimentos possíveis dentro do mundo. O escopo cresce quando novas propriedades do mundo se tornam relevantes.

## Runtime atual

A execução principal ainda usa `PopulationSimulation` como experimento populacional dentro da entrada **Mundo** do launcher.

Esse runtime possui:

- terreno em tiles;
- malha física 3x3 por tile;
- gaianos ocupando duas microcélulas;
- movimento contínuo em microcélulas;
- orientação e interação física frontal;
- objetos com propriedades físicas internas e aparências observáveis;
- corpo com fome e sede;
- percepção local e oclusão;
- memória relacional atual;
- decisão baseada em experiências;
- observação social;
- reprodução opcional;
- interface observacional ASCII;
- checkpoints, execução headless, métricas e benchmarks.

Essas características descrevem o experimento executável atual. Não constituem os limites do Gaea.

## Interface

A interface atual é considerada base estável. A frente ativa deixou de ser redesign amplo.

Alterações futuras de interface devem priorizar:

- legibilidade;
- observabilidade;
- exposição clara do estado físico e cognitivo;
- manutenção da separação entre visão do pesquisador e percepção do agente.

## Física em microcélulas

Implementada.

Cada tile contém uma malha 3x3. Um gaiano adulto ocupa duas microcélulas cardinais adjacentes. `move` avança uma microcélula por tick. A posição pública em tiles é derivada da posição física fina.

`PhysicalSpace` controla ocupação, bloqueio, shapes e visibilidade parcial. Interações relevantes usam orientação e proximidade física.

## Launcher de experimentos

Implementado em 2026-09-09.

O launcher permite registrar experimentos executáveis e árvores de subexperimentos. O catálogo padrão contém atualmente apenas **Mundo**.

A infraestrutura serve para impedir que um recorte experimental específico seja confundido com a definição inteira do Gaea.

## Memória

### Implementação atual

O runtime ainda usa a memória relacional anterior.

A experiência atual registra campos como estado corporal, assinatura observada, ação, delta corporal, sucesso, origem, ator, alvo, sinal, mudança visível, posição e contexto.

As relações ainda são agrupadas principalmente por assinatura observada, ação, faixa corporal, sinal e origem. A decisão consulta essas relações diretamente para estimar consequências.

### Memória Relacional V2

Especificada conceitualmente, ainda não implementada no runtime.

A experiência V2 deve preservar:

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

A transição deve conter apenas diferenças perceptivamente justificadas. Não deve converter ausência em interpretações como consumo ou destruição.

Tokens transitórios podem ligar elementos entre `before` e `after`, mas não devem definir famílias ou conceitos. A generalização deve emergir de características percebidas, ocorrência, contexto e transições compatíveis.

A migração V2 afetará pelo menos:

- `core/cognition/records.py`;
- `core/simulation/population.py`;
- `core/cognition/memory.py`;
- `core/cognition/decision.py`;
- `core/representation/inspection.py`;
- testes cognitivos e de interface.

## Estado das frentes

| Frente | Estado |
| --- | --- |
| Interface observacional | consolidada |
| Movimento em microcélulas | implementado |
| Física fina / ocupação | implementada |
| Launcher de experimentos | implementado |
| Separação cognição / verdade física | implementada no runtime atual |
| Memória relacional antiga | implementada |
| Memória Relacional V2 | especificada, pendente |
| Gaea como mundo genérico | definição consolidada; arquitetura ainda em transição |
| Ecologia, animais, clima, cores e outras propriedades gerais | futuras expansões, não implementadas |

## Próxima mudança arquitetural

A próxima frente estrutural é a implementação da Memória Relacional V2.

Até ela ser concluída, documentação e análise devem distinguir explicitamente a memória implementada da memória especificada.
