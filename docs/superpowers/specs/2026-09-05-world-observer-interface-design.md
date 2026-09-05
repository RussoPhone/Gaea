# Interface de observação do mundo

## Objetivo

Transformar a interface do Gaea em uma janela para observar uma população emergente. O mundo ocupa a tela; controles e informação detalhada aparecem apenas quando necessários. A referência é a legibilidade densa de *Caves of Qud* e *Dwarf Fortress*, sem copiar ASCII nem atribuir conceitos ausentes da simulação.

## Arquitetura

O core já oferece a fronteira correta: snapshots somente leitura separam simulação e navegador. Essa fronteira será preservada. O runtime acrescentará apenas contexto espacial observacional aos eventos recentes, sem expor efeitos físicos internos ou alterar a cognição.

A camada web será dividida por responsabilidade: estado e transporte, câmera, renderização do mundo, efeitos de eventos, ficha do agente e grafo de memórias. Continuará em HTML, CSS e JavaScript nativos, sem etapa de build ou dependências novas.

## Composição

- Canvas top-down ocupa toda a área útil.
- Faixa superior estreita mostra identidade, conexão, tick, população e estado.
- Barra inferior compacta contém pausa, execução, passo, velocidade e rajada.
- Registro curto e recolhível de eventos fica sobre uma borda do mapa.
- O mapa oferece zoom, deslocamento, enquadrar mundo e acompanhar seleção.
- Não há cards de métricas, espaços decorativos ou painéis permanentes de detalhe.

## Linguagem visual

Terreno usa células com textura e contorno discretos; obstáculos têm maior peso. Recursos recebem formas e cores estáveis derivadas de sua aparência. Agentes usam silhueta direcional, identidade própria e glifos curtos para ação e carga. O nível de detalhe diminui com o zoom.

A paleta é terrosa, com contraste local alto e tipografia compacta. A interface distingue aparências sem rotulá-las falsamente como comida, água, intenção ou outro conceito não conhecido pelo sistema.

## Seleção e perspectivas

Clicar num agente abre uma ficha flutuante com ação atual, fome, sede, carga e geração. Ela oferece `Acompanhar`, `Visão do agente` e `Memórias`, e fecha com botão próprio ou `Esc`.

`Acompanhar` mantém a projeção global e move a câmera suavemente. `Visão do agente` substitui o mapa pela percepção local, usa coordenadas relativas, destaca orientação e omite células não percebidas. A mudança de perspectiva deve ser inequívoca. A seleção persiste entre snapshots. Se o agente morrer, a ficha conserva brevemente seu último estado e o evento antes de encerrar o acompanhamento.

## Acontecimentos no mundo

Movimentos deixam rastros breves. Ingestão e manipulação destacam agente e alvo. Sinais produzem ondas; nascimento e morte usam marcas próprias; interações entre agentes criam ligações temporárias. Esses efeitos são limitados em duração e quantidade e nunca alteram o tempo ou o estado da simulação.

## Memórias

O grafo é criado apenas quando aberto. Relações são os nós principais; aparências, ações e evidências fornecem conexões. Peso e confiança controlam intensidade visual; contradições recebem marca própria. Selecionar um nó revela experiências relacionadas. O grafo apresenta os registros existentes sem inferir causalidade ou semântica.

## Desempenho e falhas

O canvas respeita a densidade de pixels e desenha somente células visíveis. Snapshots e animação permanecem desacoplados; posições podem ser interpoladas sem inventar ticks. Detalhes diminuem com o zoom e eventos visuais usam buffers limitados.

Uma falha de conexão mantém a última imagem válida com aviso discreto. Erro do worker indica que a simulação parou. O layout mantém mapa e controles utilizáveis em telas menores. Pausa, passo, seleção, fechamento e câmera oferecem acesso por teclado.

## Validação

- Testar o contrato de snapshot e a ausência de efeitos físicos internos.
- Testar projeções visuais, contexto espacial de eventos e construção do grafo.
- Testar câmera, seleção persistente, acompanhamento, perspectiva sensorial e erros.
- Preservar testes HTTP e controles existentes.
- Executar a suíte Python completa e verificar a interface em diferentes dimensões.

