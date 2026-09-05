# Primeiro ensaio populacional revisado

Data local: 2026-09-05. Branch: `AGENT`.

Este registro documenta o primeiro vertical slice executavel depois das correcoes de fronteira sensorial social e decaimento de memoria de descendentes. Ele nao e evidencia de civilizacao inteligente; e evidencia de que o substrato ja consegue rodar uma populacao pequena por longo periodo com memoria, observacao social, objetos persistentes, reproducao fisiologica e interface externa.

## Ensaio longo

Comando:

```sh
python -m core.main run --ticks 100000 --population 6 --population-limit 12 --sensor-range 3 --width 12 --height 10 --objects 54 --stones 3 --renewal 60 --seed 42 --output /tmp/gaea-reviewed-42.jsonl --sample-every 1000
```

Manifesto do JSONL:

- `code_hash`: `d5a09f99b79c52744e81bce3341929f6b5b237c039a80354cd2ae49a8544e79d`
- Python: `3.14.7`
- configuracao: `population=6`, `population_limit=12`, `width=12`, `height=10`, `objects=54`, `stones=3`, `sensor_range=3`, `renewal=60`, `seed=42`

Resultado final:

- tick final: `100000`
- extinto: `false`
- vivos: `12`
- nascimentos: `23`
- mortes: `17`
- geracao maxima observada: `2`
- objetos no mundo: `18`
- relacoes de memoria: `2304`
- tempo de parede: `482.5675s`
- throughput: `207.2249 ticks/s`

Contagem acumulada de acoes:

| Acao | Contagem |
| --- | ---: |
| move | 344570 |
| signal | 268347 |
| turn | 133835 |
| ingest | 122961 |
| wait | 67257 |
| inspect | 66830 |
| pick | 54275 |
| touch | 54240 |
| give | 53986 |
| place | 14912 |
| drop | 14897 |

Observacao: edicoes posteriores no README/observador nao alteram a interpretacao dinamica do ensaio, mas o hash registrado pertence exatamente ao codigo no momento em que o JSONL foi criado. Um replay parcial de 1000 ticks com a arvore atual reproduziu as metricas do tick 1000 desse arquivo.

## Ensaios comportamentais

Assinatura semantica inicial em escolhas restritas, antes de treino:

- alvo 1: `204`
- alvo 2: `196`

Depois de 12 experiencias reais com a aparencia funcionalmente util:

- alvo 1: `391`
- alvo 2: `9`

Depois de inverter os efeitos fisicos sem alterar codigo cognitivo:

- alvo 1: `9`
- alvo 2: `391`

Ensaio social em 40 seeds, medindo tentativas ate a primeira descoberta propria:

- exposto a outro agente: media `1.05`
- controle sem observacao: media `1.875`

Esses testes usam arenas controladas e, em alguns casos, restringem as acoes disponiveis para medir aprendizagem. Eles nao demonstram sobrevivencia livre, compreensao de necessidades alheias, linguagem ou cultura.

## Benchmark indicativo

Comando:

```sh
python -m core.main benchmark --populations 10,50,100,200 --ticks 100
```

Condicoes: metabolismo zero, reproducao desligada, 30 ticks de aquecimento, populacao mantida viva durante a medida.

| Populacao | ms/tick | agent-steps/s | Relacoes |
| ---: | ---: | ---: | ---: |
| 10 | 2.4815 | 4029.8975 | 794 |
| 50 | 15.8109 | 3162.3699 | 4678 |
| 100 | 29.7668 | 3359.4500 | 8281 |
| 200 | 60.7491 | 3292.2277 | 15879 |

O benchmark foi executado na maquina local da sessao e deve ser tratado como indicativo. Populacoes com memoria mais madura, mundo mais denso ou muitas interacoes sociais podem custar mais.

## Limites

- Uma seed longa pequena nao estabelece robustez ecologica ampla.
- O sistema ainda aprende a partir de assinaturas discretas e horizonte curto.
- Observacao social registra tentativas e mudancas visiveis, mas nao sequencias complexas.
- Sinais existem como valores arbitrarios observaveis; nao ha semantica ou protocolo.
- Nao ha evidencia de civilizacao, cultura ou comunicacao emergente neste marco.
