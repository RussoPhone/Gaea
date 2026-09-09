# Gaea: memória relacional neutra baseada em percepção

Especificação aprovada em 2026-09-09 para substituir o pipeline de experiência e memória do runtime `PopulationSimulation`. `rules.md` e `docs/rules.md` permanecem intactos.

## Objetivo e limites

A cognição recebe somente registros sensoriais do próprio Gaiano. Uma experiência nasce da comparação entre dois momentos percebidos e uma ocorrência percebida entre eles. A memória registra e recupera relações; qualquer interpretação comportamental pertence exclusivamente à decisão.

Não entram neste recorte emoções, medo, linguagem, conceitos explícitos, imaginação, comportamento social complexo ou objetivos de sobrevivência. A cognição não recebe tipos funcionais de objetos, efeitos físicos, quantidades reais, êxito da execução nem qualquer avaliação como recompensa, punição, desejável, bom ou ruim.

## Registros perceptivos

`PerceivedMoment` preserva o estado interno percebido e o campo externo percebido. `PerceivedOccurrence` representa uma operação ou acontecimento sensorial com argumentos que também foram percebidos. `Experience` preserva momento anterior, ocorrência, momento posterior, transição derivada e proveniência.

A mesma função forma experiências próprias e observadas. Para a própria ação, a ocorrência contém o token da operação emitida e os argumentos presentes na percepção anterior, sem indicar se a física a executou. Para uma ação observada, contém somente a operação e os participantes identificáveis nos registros sensoriais do observador. Origem, ator percebido e tick permanecem na proveniência; não participam da formação, compatibilidade, força ou recuperação de relações.

O formador compara apenas os dois momentos. Mudanças internas são diferenças entre canais internos. Mudanças externas são aparecimento, ausência posterior, deslocamento relativo e alterações percebidas de aparência, movimento, ação ou sinal. Ausência posterior nunca é renomeada como consumo, destruição ou saída do campo. Se não houver momento posterior, nenhuma experiência completa é criada. Ausência de mudança é uma transição válida.

## Projeções e famílias relacionais

A experiência integral é armazenada como evidência auditável. Para evitar que cenas inteiras quase sempre diferentes impeçam repetição, o formador relacional produz projeções pequenas e uniformes centradas na ocorrência:

- ocorrência isolada;
- ocorrência relacionada a cada canal interno;
- ocorrência relacionada a cada participante perceptível;
- aparência, posição relativa, movimento e sinal percebidos desses participantes;
- mudanças internas e externas derivadas entre os momentos.

O primeiro recorte não combina arbitrariamente todo o campo perceptivo em relações de alta aridade. O campo completo continua na experiência para inspeção e futura ampliação, sem inventar relevância semântica.

Uma família é o endereço exato do grafo canônico de uma projeção antecedente. Tokens locais usados para ligar observações entre momentos não entram na chave. Participantes são descritos por seus papéis estruturais e atributos percebidos; observações indistinguíveis preservam multiplicidade. Valores discretos permanecem exatos. Canais contínuos preservam o valor bruto na experiência e usam a mesma resolução mecânica para canonicalização, identificada apenas pela posição do canal.

Uma família nova surge imediatamente quando a chave estrutural de uma projeção ainda não existe. Não há número mínimo de ocorrências, promoção a conceito, protótipo móvel ou associação à família mais parecida. Similaridade entre famílias ocorre somente na recuperação e expõe coincidências, ausências e divergências; nunca muda pertencimento.

## Ramos, evidência e competição

Cada família contém ramos de transição. A primeira ocorrência cria família, ramo e evidência. Uma transição canonicamente compatível fortalece somente seu ramo. Uma transição incompatível cria outro ramo na mesma família. Ramos preservam suas transições e amostras; deltas incompatíveis nunca são substituídos por uma média.

Cada ramo expõe quantidade de evidências, força decaída, suporte relativo dentro da família, recência e evidências brutas limitadas. Suporte relativo descreve somente a distribuição armazenada, não verdade ou sucesso. Proveniência pode ser resumida para inspeção, mas não altera nenhum desses valores.

Memória e experiências permanecem limitadas e não são herdadas. Força decai igualmente para toda origem. Ramos são esquecidos deterministicamente por força decaída e antiguidade; remover um ramo concorrente é esquecimento explícito, não reconciliação. Remover o último ramo remove a família.

## Recuperação e decisão

A recuperação recebe apenas um momento percebido e uma ocorrência candidata. Ela devolve famílias exatas e parcialmente correspondentes, seus ramos separados e um relatório estrutural dos átomos coincidentes, ausentes e divergentes. Ordenação pode usar correspondência estrutural, força, quantidade e recência, nunca origem ou avaliação comportamental.

A decisão continua sendo a única camada que interpreta transições recuperadas para comparar ações. O adaptador inicial preserva a política comportamental existente, mas passa a consumir ramos concorrentes sem pedir à memória um delta médio ou uma recomendação. Esta mudança não adiciona objetivos, planejamento ou semântica ao comportamento.

## Integração no runtime

Cada tick captura `View`s anteriores às ações. As decisões usam somente essas `View`s e a memória. A simulação executa ações sem encaminhar o retorno físico à cognição e então captura novas `View`s. A ação própria e cada ação alheia realmente percebida tornam-se `PerceivedOccurrence`s e passam pelo mesmo formador.

Quando várias ocorrências são percebidas no mesmo intervalo, cada uma gera uma experiência com a mesma transição temporal. Isso registra coocorrência, não causalidade. Alvos não percebidos permanecem ausentes. Gaianos sem um momento posterior não recebem experiências inventadas.

`core/cognition/records.py` define valores imutáveis; um módulo de formação compara momentos e gera projeções; `core/cognition/memory.py` mantém famílias, ramos, evidências, decaimento e recuperação; `core/cognition/decision.py` interpreta os ramos; `core/simulation/population.py` apenas orquestra as amostras sensoriais. A inspeção continua desacoplada, somente leitura e sem resolver assinaturas para tipos físicos.

## Validação

Testes dirigem a mudança e demonstram: uma ocorrência basta; repetição compatível fortalece; incompatibilidade cria competição sem média; própria e observada usam a mesma família quando estruturalmente iguais; proveniência não altera formação nem força; mudanças vêm somente das duas `View`s; desaparecimento permanece ausência; tokens físicos não definem família; recuperação parcial não funde famílias; decisão recebe ramos separados; inversão de efeitos continua reaprendível; capacidade, decaimento, determinismo, checkpoint e inspeção permanecem funcionais.

Testes de fronteira garantem que registros cognitivos não recebem `success`, efeito físico, quantidade real ou tipo funcional. A suíte Python completa, os testes JavaScript afetados, `compileall` e `git diff --check` compõem a verificação final.
