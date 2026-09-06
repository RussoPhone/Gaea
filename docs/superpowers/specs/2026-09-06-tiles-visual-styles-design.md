# Linguagens visuais do renderer TILES

## Objetivo

Permitir que a mesma `RenderScene` seja reinterpretada em runtime como ASCII, Geometric, Glyph, Flat, Procedural ou Pseudo-3D. A troca conserva câmera, zoom, pan, seleção, acompanhamento, tick, estado físico e RNGs. Os modos são alternativas simultâneas para avaliação visual; nenhum é tratado como vencedor.

## Limites semânticos

Cada estilo representa somente os registros públicos já presentes na cena: `terrain:grass`, `terrain:water`, `terrain:stone`, `object:food`, `object:water`, `object:stone` e `agent:gaiano`, inclusive o objeto realmente presente em `carrying`. Variações visuais não significam qualidade, fertilidade, bioma, cultura, profissão, classe, sexo, intenção ou estado mental.

Gaianos gráficos são humanoides pequenos, abstratos, nus e simples. Cabeça, tronco e membros pertencem à mesma forma corporal, sem divisões que pareçam roupa. Uma saliência frontal discreta indica inequivocamente norte, sul, leste ou oeste. O desenho deixa espaço para roupas futuras como uma camada separada.

## Arquitetura

`RenderScene`, `BaseRenderer`, câmera, interpolação, culling, ordem de camadas, seleção e hit testing permanecem compartilhados. Um `StyledCanvasRenderer` herda de `BaseRenderer` e delega somente a pintura de terreno, objetos e agentes a um objeto `VisualStyle`.

O registro de estilos expõe os seis modos e cria o renderer apropriado. ASCII continua usando `AsciiRenderer`; os outros cinco usam a infraestrutura Canvas comum com módulos focados:

- Geometric: círculos, polígonos, linhas e curvas consistentes.
- Glyph: marcas e silhuetas abstratas desenhadas, sem letras ASCII.
- Flat: áreas sólidas, poucas cores e silhuetas fortes.
- Procedural: variações determinísticas derivadas de coordenadas, camada, tipo e ID.
- Pseudo-3D: faces, sombras discretas e sobreposição dentro do mesmo grid 2D.

Um módulo de primitivas oferece caminhos, rotações de orientação, paleta, empilhamento de objetos, indicadores de quantidade e desenho do objeto carregado. O catálogo semântico e os registros da cena não recebem propriedades visuais.

## Determinismo e animação

O módulo procedural usa uma função hash pura. Não chama `Math.random`, não importa código da simulação e não mantém um gerador mutável. Pedra, alimento e marcas vegetais permanecem idênticos entre frames para a mesma identidade e posição.

Água pode deslocar linhas discretamente usando `visualOptions.presentationTime`, apenas como animação de apresentação. Esse valor não entra na cena nem altera o padrão-base, identidade, picking ou simulação. Com movimento reduzido, a animação fica estática.

## Alternância e interface

Um seletor compacto na barra do mapa lista ASCII, Geometric, Glyph, Flat, Procedural e Pseudo-3D. `R` avança ciclicamente. A instalação de outro renderer descarta apenas recursos gráficos do renderer anterior e reutiliza `store.scene`, `ui.camera`, `ui.selection`, `ui.following` e o relógio da simulação. A legenda usa o estilo ativo.

A interface externa recebe apenas ajustes pequenos: controles temporais mais compactos, fundos foscos, bordas simples e a paleta terrosa/mineral existente. Não haverá gradientes, glow, neon, glassmorphism ou tratamento de dashboard.

## Still de validação

Uma única cena fixa e determinística conterá grass, water e stone como terreno; food, water e stone como objetos; pilha e quantidade; quatro gaianos, um em cada orientação; carga real; seleção; legenda aberta; inspector; status e controles temporais. A mesma câmera, seleção e tick serão usados em todos os modos.

O fluxo de navegador capturará seis imagens dessa still, uma por modo, sem chamar comandos de avanço entre capturas. Também verificará por dados que câmera, seleção, tick e frame HTTP permanecem idênticos. As imagens serão reunidas em uma folha comparativa para o usuário avaliar cada linguagem com todo o chrome da aplicação visível.

## Validação automatizada

Testes JavaScript verificarão:

- o registro contém exatamente os seis modos e todos satisfazem o contrato;
- todos consomem a mesma cena congelada e mantêm o mesmo picking;
- a projeção do nariz corresponde às quatro orientações;
- o hash e as variações procedurais são estáveis e não dependem de `Math.random`;
- cada estilo desenha todos os tipos suportados em zoom baixo e alto;
- a troca preserva a identidade dos objetos de estado da interface.

O teste Chromium executará a simulação real, percorrerá os seis estilos e confirmará ausência de erros, preservação da seleção/câmera/tick durante a troca e operação dos controles. A still dedicada complementará esse teste com uma cena abrangente e estática.

## Extensão futura

Um sexto estilo gráfico será adicionado criando um módulo que implemente as operações visuais esperadas pelo `StyledCanvasRenderer` e registrando metadados no catálogo de estilos. Ele herdará automaticamente montagem, HiDPI, culling, interpolação, picking, seleção, empilhamento, alternância e integração com câmera.

## Limitações aceitas

- Geometric privilegia regularidade e pode parecer austero em zoom distante.
- Glyph preserva alta abstração e exige consulta inicial à legenda.
- Flat reduz detalhe interno e pode aproximar silhuetas quando as células ficam muito pequenas.
- Procedural tem variedade deliberadamente limitada para não inventar atributos.
- Pseudo-3D sugere volume apenas dentro da célula; não muda projeção, oclusão física ou coordenadas.
- ASCII permanece como está e não ganha anatomia ou nariz direcional nesta rodada.
- A avaliação de gosto depende da comparação humana das stills; os testes comprovam contratos e invariantes, não escolhem estética.
