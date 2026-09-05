# Gaea: primeiro substrato populacional observável

Especificação: pedido do usuário de 2026-09-04, itens 1–14. A branch de trabalho é AGENT. rules.md e docs/rules.md permanecem intactos.

## Decisões

Manter Python e aproveitar World, Sky, Sensor e Body. Acrescentar objetos e índice de ocupação ao mundo. O runtime populacional substitui a entrada principal; o toy antigo continua como controle histórico. A percepção antiga também perde nomes de superfícies. Não existe acesso da cognição ao World ou ao Organism: apenas registros imutáveis de corpo, observações e resultados sensoriais.

Objetos possuem aparência independente dos efeitos físicos internos. Identidades observacionais são marcas visíveis persistentes, não classes semânticas. Terreno, objetos e corpos são camadas distintas. Alcance, orientação e oclusão limitam a observação. A interação consome um tick mesmo quando falha. Pegar, soltar, transferir, ingerir, tocar, mover, girar, inspecionar, esperar e sinalizar são ações motoras; aproximação é movimento relativo, sem mapa global.

Memória individual: hiperarcos contextuais (corpo + assinatura + ação + sinal + consequência), contagens, confiança, decaimento, contradição e referências a experiências limitadas. Não haverá LLM, rede neural, conceitos semânticos ou memória compartilhada. Consequências corporais previstas são ponderadas pelo estado corporal atual. Exploração permanece possível. Relações observadas não recebem mudanças corporais alheias; apenas aumentam a propensão a experimentar ações visíveis, com confiança menor.

Renovação limitada de objetos sustenta ecologia contínua. Após o recorte cognitivo, reprodução fisiológica opcional com custo, maturidade, intervalo e espaço permite ensaios geracionais. Sem reposição de mortos, resgate automático ou transmissão automática de memória. Morte libera ocupação e deposita carga.

## Execução e observação

Gerador aleatório por simulação; ordem embaralhada a cada tick. Índices por célula, memória e eventos residentes limitados. JSONL para eventos e métricas, CLI para lotes e benchmark. Checkpoint local versionado preserva estado e RNG. Extinção é resultado e encerra ensaio headless por padrão.

Interface web local com canvas, servida pela biblioteca padrão. Worker da simulação avança independentemente das consultas de snapshots; comandos só controlam relógio. A interface exibe visão global e projeção sensorial selecionada separadamente, relações/experiências/justificativa da decisão e eventos resumidos. Nenhuma seleção ou consulta consome RNG ou altera memória.

## Validação

Testes reais de ausência de preferência inicial, aquisição, inversão de efeitos, observação versus controle, isolamento, ocultação semântica, falhas físicas, persistência material, determinismo e snapshots sem efeitos. Testar HTTP/controles e interface no navegador quando disponível. Medir populações crescentes e executar ensaios longos sem inferir civilização de sobrevivência. Documentar limitações e resultados negativos.
