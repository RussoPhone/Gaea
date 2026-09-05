# Population Implementation Plan

> Execução nesta sessão: testes antes das mudanças; trabalho principal na branch AGENT indicada pelo usuário. Usar superpowers:subagent-driven-development para a interface independente e revisão final.

**Goal:** entregar população com experiências neutras, aprendizagem rastreável e observador visual independente.

**Architecture:** estender física existente; cognição isolada por registros; novo runtime populacional como entrada padrão. UI consome snapshots JSON.

**Tech Stack:** Python padrão, pytest, HTML/CSS/JavaScript canvas.

**Spec:** docs/superpowers/specs/2026-09-04-population-design.md

## Global Constraints

- Preservar rules.md e docs/rules.md.
- Nenhuma semântica física interna nem estado corporal alheio chega à cognição.
- Não programar estruturas civilizacionais; não usar LLM ou rede neural.
- Memória e logs residentes limitados; RNG isolado; UI não influencia evolução.

### Task 1: Física e fronteira sensorial

Arquivos: core/ambient/world.py, tile.py, objects.py; core/sense/perception.py; core/cognition/records.py; tests/test_population_physics.py.

- [x] Testar ausência de semântica, oclusão, ingestão explícita, transporte/transferência/falha e índice espacial.
- [x] Executar teste e confirmar falha; implementar registros imutáveis, objetos separados e percepção local; repetir teste.
- [x] Migrar testes sensoriais antigos para aparência, mantendo o toy como controle histórico.

### Task 2: Memória, decisão e runtime

Arquivos: core/cognition/memory.py, decision.py; core/simulation/population.py; tests/test_population_learning.py, test_population_runtime.py.

- [x] Testar aprendizagem e inversão com efeitos reais; observação sem estado interno alheio; memória independente e limitada.
- [x] Implementar hiperarcos com contexto, EMA de consequências/erro, decaimento e evidências; decisão por efeitos corporais previstos e exploração.
- [x] Integrar observação de ações visíveis, sinais, renovação e reprodução opcional com custo.
- [x] Confirmar determinismo em execuções intercaladas e snapshots sem influência.

### Task 3: Interface observadora

Arquivos exclusivos: core/interface/__init__.py, server.py, static/index.html, static/app.js, static/style.css; tests/test_population_interface.py.

Implementar servidor local stdlib e UI canvas em português, sem bibliotecas externas. O servidor recebe um objeto simulation com step(), snapshot(selected_id=None) -> dict, tick:int, config, metrics(). O servidor pode ser importado antes de PopulationSimulation existir. API pública: create_server(simulation, host='127.0.0.1', port=8765) -> servidor HTTP com controller e serve_forever(); serve(simulation, host, port). Worker dedicado controlado por condição/lock: inicia pausado, run/pause/step/burst/speed; snapshot não chama step nem modifica simulação. Encerramento deve parar worker. Burst assíncrono limitado a 1_000_000 ticks, interrompível por pause, step sempre exatamente um tick quando pausado. JSON de erros 400 para entrada inválida, não aceitar NaN/inf, host local, verificar Origin/Host de comandos.

GET /api/snapshot?selected=ID; POST /api/control com {command:'run'|'pause'|'step'|'burst'|'speed', value:number}. Snapshot contém tick, width, height, light, terrain:[{x,y,appearance:[int,int,int],blocking:bool}], objects:[{id,x,y,appearance,quantity}], agents:[{id,x,y,orientation:[dx,dy],alive,action,body:{hunger,thirst},generation}], metrics:{alive,births,deaths,objects,relations}, events:[{tick,actor,action,...}], selected:null|{id,body,position:[x,y],orientation,action,perception:[{token,appearance,dx,dy,blocking,motion,action,signal}],memory:{relations:[{id,signature,action,body_context,weight,confidence,delta,sources,evidence,age,active}],experiences:[...],forgotten:int},decision:{...}}. O servidor acrescenta control:{running,speed,remaining}. Apenas o painel global usa verdade observadora. O modo visão selecionada deve desenhar somente perception relativa à posição do selecionado, nunca usar dados globais ocultos. Marcar que percepção é a última amostra sensorial. Mostrar mapa distinguível, seleção por clique e lista, orientação, barras corporais, ação, sinais, relações ativadas, confiança, fontes, esquecimento e experiências; eventos recentes sem despejo por tick. Controles pausa/continua, passo, velocidade e rajada. Polling ~5Hz independente de RAF; tratar desconexão/erros visíveis, sem sobrepor requests.

- [x] Criar teste HTTP com simulação mínima determinística: snapshot não avança; step avança uma vez; burst completa; pause interrompe; erros preservam estado; worker encerra.
- [x] Executar teste falhando, implementar servidor e controles, executar passando.
- [x] Implementar canvas responsivo e inspeção; verificar JS com node --check e testar navegador se disponível.
- [x] Entregar relatório de arquivos, testes RED/GREEN e limitações. Não editar arquivos fora desta task nem fazer commits enquanto outro trabalhador usa a branch.

### Task 4: Experimentos e entrega

Arquivos: core/main.py; core/simulation/experiments.py; ReadME.md; tests/test_population_experiments.py.

- [x] CLI ui/run/batch/benchmark com configuração, JSONL incremental, limites e checkpoint/recomeço determinístico.
- [x] Rodar testes completos, benchmark crescente, ensaios longos e validação visual.
- [x] Revisão independente, correções e documentação de comandos, evidências e limitações.

## Estado de fechamento

O vertical slice esta implementado na branch AGENT. A revisao independente do core encontrou vazamentos na observacao social e um bug de decaimento em memorias nascidas tarde; ambos foram corrigidos com regressao focada. A interface teve validacao por testes HTTP/DOM estaticos, `node --check` e smoke real em navegador. O ensaio populacional revisado de 100000 ticks e os benchmarks estao registrados em `docs/experiments/2026-09-05-first-population.md`.

Limite deliberado: isto inicia o substrato executavel; nao prova civilizacao, linguagem ou inteligencia social emergente.
