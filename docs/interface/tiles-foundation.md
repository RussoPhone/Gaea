# Fundação tiles — Rodada 2

Este documento registra a entrega da fundação. O art pass e as seções de memória/registro adicionados posteriormente estão em [Linguagem visual](visual-language.md); os contratos de cena e renderer permanecem preservados.

## Caminho implementado

PopulationSimulation → RepresentationProjector → HTTP → SimulationStore → RenderScene → AsciiRenderer.

`PopulationSimulation` continua executando o tick, decisões e efeitos físicos. O controlador mantém o worker e a exclusão mútua entre avanço e leitura. A representação lê sob esse lock, devolve registros destacados e não chama `snapshot`, `perceive`, decisões ou RNGs. A identidade de sessão usa PID e relógio monotônico do processo, sem consumir aleatoriedade nem alterar o relógio da simulação. Não existe dependência da cognição na representação.

O renderer recebe exclusivamente registros públicos e opções de apresentação. Não faz HTTP, não envia comandos e não conhece a simulação Python. Câmera, seleção, assets e DOM estão fora de `core/representation`.

## Protocolo v1

| Endpoint | Conteúdo |
|---|---|
| GET `/api/bootstrap` | `schemaVersion`, `worldRevision`, `width`, `height`, `terrain`, `catalog`, `config`, `tick`, camadas dinâmicas iniciais e `control` |
| GET `/api/frame` | versão, revisão, tick, `agents`, `objects`, eventos recentes, população e `control`; sem terreno, catálogo ou configuração |
| GET `/api/selection/agent/{id}` | detalhe básico público do agente |
| GET `/api/selection/object/{id}` | detalhe básico público do objeto, inclusive quando carregado |
| GET `/api/selection/cell/{x}/{y}` | terreno, todos os objetos no chão e agente da célula |
| POST `/api/control` | comandos existentes `run`, `pause`, `step`, `burst`, `speed` |

Detalhes devolvem `{schemaVersion, worldRevision, tick, detail, control}`; um alvo que não existe mais retorna `detail: null`. Comandos preservam o corpo `{command, value?}` e as validações locais existentes.

`tick` é o tempo discreto do mundo. `control` contém `running`, `speed` em ticks/s, `remaining` e, em caso de falha do worker, `error`. O relógio inicial está no mesmo bootstrap que o estado físico. Detalhes recebidos de outra revisão ou de uma seleção anterior não são aplicados.

`worldRevision` combina uma sessão do projector com digest de dimensões, terreno e configuração. Avançar ticks não muda a revisão; mudar conteúdo estático ou reiniciar o servidor muda. O cliente solicita outro bootstrap ao encontrar outra revisão/versão. Versões desconhecidas não são aplicadas. Não há deltas de objetos/agentes: cada frame substitui integralmente ambas as camadas. Frames atrasados são descartados.

Registros distinguem `layer` de `kind`: `terrain:stone` e `object:stone` são coisas diferentes. Terreno grass permanece `grass`. IDs de terreno são `x,y`; IDs físicos de objetos e agentes são os IDs persistentes do runtime, sempre combinados com a camada ao selecionar. As posições públicas são células inteiras.

Objetos carregados aparecem em `agent.carrying`, com posição atual do portador, e não são duplicados como objetos no chão. A quantidade de objetos de uma célula não é limitada a um. A geração padrão atualmente cria grass/stone como terreno e food/water/stone como objetos; o renderer também suporta terreno water, sem inventá-lo no runtime.

## Cliente e renderers

- `transport.mjs`: requisições, erros e timeout; polling a cada 200 ms coordenado pelo app, sem requisições concorrentes do loop.
- `store.mjs`: validação e aplicação atômica; preserva a última cena em falhas e compartilha o mesmo terreno entre frames.
- `scene-model.mjs`: cena congelada e índices por célula/identidade, sem DOM.
- `camera.mjs`: fit, pan, zoom ancorado e transformação entre coordenadas.
- `selection.mjs`: candidatos por célula e seleção por camada/ID.
- `renderers/renderer-contract.mjs`: validação do contrato.
- `renderers/base-renderer.mjs`: culling, ordem das camadas, interpolação restrita e picking.
- `renderers/ascii-renderer.mjs`: glifos ASCII ligados aos `kind` públicos da física.
- `ui/inspector.mjs`: campos básicos não modais; o app compõe controles e lista de candidatos.

Contrato: `mount(surface)`, `resize({width,height,ratio})`, `render(scene,camera,visualOptions)`, `hitTest({x,y})`, `dispose()`. A superfície atual é um canvas; isso não é exigido de uma implementação futura. As entradas de picking e câmera estão em pixels CSS; o renderer administra o backing buffer HiDPI.

A ordem é terreno → objetos → agentes → seleção. O picking considera a posição visual durante interpolação, mas devolve registros da célula física atual. Interpolação só ocorre entre ticks consecutivos com deslocamento adjacente: frames pulados não inventam trajetórias. Preferência de movimento reduzido desliga a interpolação. A representação nunca recebe coordenadas interpoladas.

O inspector pode escolher terreno, cada objeto e agente de uma célula. A seleção segue identidade e é revalidada em todo frame. Um alvo removido limpa a inspeção. A câmera só acompanha quando solicitado. Trocar Canvas/ASCII conserva câmera e seleção, sem refazer bootstrap.

## Assets

`assets/manifest.json` é exclusivamente visual, separado do catálogo semântico do bootstrap. Suas chaves são `layer:kind`. As receitas `pixels`/`colors` são placeholders; `atlas` pode indicar um PNG relativo a `/assets/`, e cada entrada pode fornecer `rect: [x,y,width,height]`. Um atlas substitui receitas sem alterar o protocolo. Assets ausentes usam formas/cores básicas. Não há sprites finais ou direção artística aprovada.

## Verificação

```sh
python -m pytest -q
node --test tests/js/*.test.mjs
```

Teste opcional de Chromium (Playwright apenas como ferramenta de desenvolvimento, não dependência de execução):

```sh
GAEA_PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs \
GAEA_CHROMIUM=/caminho/chromium/chrome \
node tests/browser/observer-smoke.mjs
```

Se Playwright e seu navegador já estiverem instalados/resolvíveis, as variáveis podem ser omitidas. O script inicia e encerra sua própria PopulationSimulation em porta efêmera. A cena de teste inclui dois objetos stone fixos na mesma célula e terreno water, configurados antes de servir; os ticks continuam sendo reais. Não altera políticas, não fornece ações aos agentes e não gera screenshots.

O fluxo cobre execução, pausa, step, velocidade, burst, pan, zoom, seleção das três camadas e múltiplos objetos, acompanhamento do inspector, troca ASCII, interrupção temporária e ressincronização. Também verifica ausência de `/api/snapshot` no cliente. Os testes Python comparam o estado serializado completo, incluindo RNGs de mundo/agentes, memória, percepção e ordem, antes/depois de observação e após evolução observada versus não observada.

## Compatibilidade e limites

Medição local com a configuração padrão (seed 42, mundo 48×32, 40 agentes, 240 objetos), JSON UTF-8 sem compressão e sem seleção, usando a mesma serialização do servidor:

| Tick | Snapshot legado | Bootstrap novo | Frame novo | Redução por frame |
|---|---:|---:|---:|---:|
| 0 | 152.863 bytes | 223.971 bytes | 46.760 bytes | 69,4% |
| 120 | 179.447 bytes | 249.961 bytes | 72.750 bytes | 59,5% |

O bootstrap é maior porque explicita IDs, camadas e aparências e já inclui a cena inicial. Esse custo não se repete em cada polling. O tamanho da identidade de sessão pode variar alguns bytes. Os números não incluem headers HTTP nem consultas de detalhes; não são um benchmark de FPS ou de populações grandes.

`/api/snapshot` e os módulos antigos `presentation.mjs`, `world-renderer.mjs` e `memory-graph.mjs` continuam disponíveis para compatibilidade e seus testes, mas não participam da nova UI. O sandbox `ui_mockup/` permanece separado. A nova UI não oferece ainda a antiga inspeção cognitiva profunda.

Sem WebSocket, isometria, editor de configuração, overlays, territórios, grafo de memória ou efeitos elaborados. O polling substitui camadas dinâmicas completas e pode pular ticks visuais. Cada leitura calcula o digest estático; o cliente ainda reconstrói índices da cena por frame. Isso reduz tráfego de terreno, mas não elimina custo linear de projeção/indexação. Populações e mapas muito grandes exigem medição específica antes de prometer desempenho. O fit mantém o limite herdado de oito pixels por célula: mundos enormes ainda exigem pan.

A API de eventos recentes é finita, não um histórico de replay. A seleção de um objeto que é recolhido some da camada do chão; sua carga continua disponível no agente. Uma pilha muito grande mostra até nove glyphs e uma contagem, mas a lista contextual mantém todos os objetos.

O mecanismo preexistente de checkpoints exige o hash de todo o código Python de core. Portanto, checkpoints de outra revisão podem ser rejeitados mesmo sem alteração de regras físicas. Não foi afrouxada essa verificação.

## Pontos para a Rodada 3

1. Aprovação visual pelo usuário e substituição dos placeholders pelo atlas escolhido.
2. Medições com mapas/populações maiores; cache de terreno/revisão e índices estáticos se justificado.
3. Evolução versionada de detalhes sob demanda, mantendo a separação entre verdade do pesquisador e percepção do agente.
4. Definição de overlays e configuração avançada, sem acoplar cores ou interação à simulação.
5. Tratamento contextual de morte, desaparecimento e transferência de objetos, além da limpeza básica atual.

Esses pontos não foram implementados nesta rodada.

## Entrega e arquivos

Criados nesta rodada:

- `core/representation/{__init__.py,models.py,projector.py}`.
- `core/interface/static/{transport.mjs,store.mjs,scene-model.mjs,selection.mjs}`.
- `core/interface/static/renderers/{renderer-contract.mjs,base-renderer.mjs,canvas-tile-renderer.mjs,ascii-renderer.mjs}`.
- `core/interface/static/ui/inspector.mjs` e `core/interface/static/assets/manifest.json`.
- `tests/test_representation.py`, `tests/test_representation_http.py`, `tests/js/foundation.test.mjs` e `tests/browser/observer-smoke.mjs`.
- Este documento: `docs/interface/tiles-foundation.md`.

Alterados nesta rodada: `core/interface/server.py`, `core/interface/static/app.mjs`, `core/interface/static/index.html`, `core/interface/static/style.css`, `tests/test_population_interface.py` (expectativas da página migrada) e `ReadME.md`.

As alterações que já existiam em `core/ambient/objects.py`, `core/simulation/population.py`, módulos visuais legados, testes legados e `ui_mockup/` foram preservadas; não são mudanças de comportamento feitas nesta rodada. Nenhum commit, merge ou push foi realizado.

Verificação em 2026-09-06: 142 testes Python aprovados, 14 testes JavaScript aprovados (9 legados + 5 da fundação), fluxo de Chromium descrito acima aprovado sem erros JavaScript, e `git diff --check` sem erros. A verificação em navegador foi funcional e automatizada, não uma aprovação estética pelo usuário.
