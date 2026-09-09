# Linguagem visual e inspeção de Gaea

## ASCII ligado à física

A web-UI observa o mundo só em ASCII. Os glifos vêm dos `kind` públicos do `RepresentationProjector` — o mesmo contrato que a física expõe — sem seletor de estilos nem camadas gráficas paralelas.

| Registro real | Glifo |
|---|---|
| `terrain:grass` | `"` |
| `terrain:water` | `~` |
| `terrain:stone` | `#` |
| `object:food` | `o` |
| `object:water` | `~` |
| `object:stone` | `*` |
| pilha de objetos | `&` |
| `agent:gaiano` | `@` |

Carga só aparece no inspector quando `carrying` existe. Pilhas continuam selecionáveis objeto por objeto. Não há cores de clãs, profissões, classes ou estados mentais inferidos.

`BaseRenderer` cuida de Canvas/HiDPI, culling, terreno → objetos → agentes → seleção, interpolação restrita e hit testing. `AsciiRenderer` pinta os glifos acima. A HUD usa painéis foscos e tipografia funcional; a chave ASCII é recolhível; o inspector é contextual e não modal.

## Memória e registro sob demanda

Foram acrescentados:

- `GET /api/selection/agent/{id}/memory`.
- `GET /api/selection/agent/{id}/log`.

São seções de inspeção de um **agente**, não novas camadas do mundo. Os endpoints seguem o envelope existente `{schemaVersion, worldRevision, tick, detail, control}`. A extensão é aditiva; bootstrap, frames e RenderScene não passaram a carregar memória.

`core/representation/inspection.py` projeta apenas registros armazenados. Não chama `PopulationSimulation.snapshot`, `perceive`, métodos ativos da memória ou RNG. O lock do controlador protege a leitura, e coleções devolvidas são destacadas do estado interno. A cognição não importa essa camada.

Memória apresenta famílias de antecedentes perceptivos, ramos de transição, força, suporte relativo, competição e evidências preservadas. Ramos incompatíveis permanecem separados; suporte relativo descreve somente a distribuição das evidências guardadas. A interface não consulta a verdade física para renomear aparências ou mudanças. Ausência posterior e transição vazia são mostradas literalmente, sem inferir resultado físico ou causa.

Registro possui dois recortes distintos:

- **Experiências:** a fila limitada do gaiano, com momentos anterior e posterior, mudanças derivadas e origem mantida apenas como proveniência.
- **Eventos físicos:** participação explícita como ator, alvo ou descendente nos eventos globais ainda retidos. Proximidade espacial não é usada para atribuir eventos ao indivíduo.

O painel mostra o tick da leitura. Não atualiza automaticamente enquanto se lê, mesmo que a simulação continue executando. O botão atualizar solicita novos dados; falhas preservam a última leitura válida. Trocar seleção, seção ou revisão invalida respostas pendentes.

## Verificação e limites

Testes Python cobrem dados destacados, preservação de incerteza, filtro de participação em eventos e ausência de consumo de RNG. Testes JavaScript cobrem o contrato ASCII, picking e cena congelada. O fluxo de Chromium cobre memória, registros, navegação e seleção sem avançar o frame físico só por observar.

Ainda não há grafo relacional completo, histórico persistente de toda a vida, inspeção pós-morte, overlays ou edição de configuração. O log físico é um recorte da fila global finita, não um arquivo de todos os acontecimentos.
