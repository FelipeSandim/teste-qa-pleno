# Estratégia de teste

## Contexto e objetivo da validação

A v2 entra na sexta e passa a calcular o preço que vira fatura. A pergunta desta validação é se o release candidate pode cobrar no lugar da v1. Erro aqui se repete em toda cotação nova e, no pior caso, em cobrança duplicada.

## Análise de risco

Ordenei pelo prejuízo se a área falhar, não pela facilidade de testar.

| Área | O que pode dar errado | Impacto se acontecer | Probabilidade | Prioridade |
|---|---|---|---|---|
| Faixa de peso e rota | Limite de peso ou fator de UF muda e o preço base explode | Dezenas de reais por embarque, em toda a base | Alta: a v2 reescreveu `precificar` | 1 |
| Desconto por volume | Percentual, ordem com o imposto ou arredondamento saem da spec | A feature nova cobra a mais ou a menos em todo embarque grande | Alta: código novo, critérios de aceite só no meio da faixa | 2 |
| Faturamento | Duas faturas para a mesma cotação, ou fatura sem o valor | Cobrança em dobro; histórico impossível de conferir | Média: o changelog mexe nesse fluxo e há espera assíncrona | 3 |
| Listagem × detalhe | Operador lê um preço e a fatura grava outro | Decisão comercial em cima do número errado | Alta: a v2 trocou o payload da lista | 4 |
| Retroatividade | Cotação já faturada muda de valor na tela | Ajuste indevido em cima das 60 faturas da carga | Média: a spec proíbe recálculo e o preço é calculado ao vivo | 5 |
| Contrato de validação, filtro e 404/409 | Criação ou recusa sequencial quebra | Cotação inválida entra, ou a segunda fatura sequencial passa | Baixa: caminho estável na v1 e sem mudança anunciada | 6 |

## Fontes de verdade usadas

- **README** para faixa inclusiva, multiplicador, imposto de 12%, arredondamento comercial, fatura única e o contrato da API. A v1 deste repositório conferiu os cinco exemplos do README (200/200 na carga).
- **SPEC** para o desconto: percentual pela tabela, aplicado depois do imposto, visível na API, e sem efeito retroativo.
- **CHANGELOG** para o que a v2 alega ter mudado (desconto, lista mais curta, fluxo de fatura) e para o que alega não ter mudado (faixa, rota, carga).
- **v1 × v2 pela API**, nas portas 3001 e 3002. Quando a v2 divergiu do README num ponto que o changelog marcou como estável, tratei como defeito. Quando a spec e o texto da própria spec divergiram (volume 10), não fechei o veredito — está em `PERGUNTAS_AO_PO.md`.

## Abordagem por área

1. **Preço.** Li `src/pricing/v1.js` e `v2.js` e reproduzi na API os exemplos do README, os limites (10 / 10,01, 50, 100, 150 kg) e as rotas. A comparação `<` contra `<=` apareceu na leitura e foi medida nas 200 cotações.
2. **Desconto.** Rodei os quatro critérios de aceite e, em seguida, os pisos que a tabela cita e os critérios não citam: 9, 19, 20, 49 e 50 volumes. O meio da faixa passa; 20 e 50 falham.
3. **Lista, fatura e corrida.** Comparei `GET /api/cotacoes` com `GET /api/cotacoes/{id}` nas 200. Faturei em sequência (passa) e com dois POST simultâneos (duas faturas). Conferi as 60 faturas da carga e o detalhe das já faturadas nas duas portas.
4. **Tela.** Abri a v2 no navegador na cotação 99 (10 kg mostrado como faixa de R$ 60,00) e na 19 (grid R$ 234,08, detalhe R$ 222,37). As faturas da carga aparecem com "—".
5. **Automação.** `node regressao/suite.js` sobe as duas portas, repete esses cenários e varre a carga. O resultado desta análise é 26 passaram, 15 falharam.

## O que decidi NÃO testar

| Ficou de fora | Por quê | Risco que estou aceitando |
|---|---|---|
| Volume exatamente 10 como defeito | A tabela diz 5% e o parágrafo diz "acima de 10 volumes". As duas leituras são possíveis. | 36 cotações da carga ficam sem desconto na v2. Se a tabela for a regra, há desconto de 5% não aplicado. A conta está na pergunta ao PO. Não muda o NO-GO. |
| Layout, CSS, outros navegadores | O dinheiro está na API. Olhei a tela só nos pontos em que ela mostra preço e fatura. | Um navegador pode quebrar a tabela sem alterar a cobrança. |
| Performance do payload menor | O changelog promete lista mais curta. O risco desta sexta é o valor, não o tamanho da resposta. | Em base bem maior que 200, a lista pode continuar lenta. Não há meta numérica para cobrar. |
| UF inválida, minúscula, página 0, `limit` negativo | Fora da tabela de regiões e do contrato feliz. As duas versões compartilham o mesmo roteador. | UF desconhecida cai no multiplicador 1,9. Dá para cobrar rota errada se alguém digitar "sp". |
| Corrida na criação da cotação | `criar` não tem `await`. Dois POST seguem um depois do outro no mesmo processo. | Colisão de id se um dia a criação passar a esperar I/O, no mesmo desenho da fatura. |
| Desconto por cliente, por peso, relatório de desconto | Fora de escopo da spec. | Nenhum nesta versão. |
| Carga de produção real, além das 200 cotações | A carga do repositório é fixa e é o que a API oferece para medir. | Um peso ou um volume que não aparece nessas 200 pode ter outro canto de centavo. Os limites da tabela foram criados à parte, na suíte. |

## Ambiente e dados

Node v22.23.1. Sem dependências.

```bash
node server.js v1   # http://localhost:3001
node server.js v2   # http://localhost:3002
```

Cada processo tem a própria memória: 200 cotações e 60 faturas. Entre cenários que gravam, `POST /_reset` nas duas portas. A suíte sobe os dois processos, reseta e derruba ao terminar. Ela precisa das portas 3001 e 3002 livres.

## Limitações da minha análise

- O volume 10 continua em aberto. A decisão de release não depende dele.
- A corrida foi reproduzida com dois POST paralelos. Não sei a taxa de clique duplo da operação.
- A v1 e a v2 deste repositório compartilham `src/faturas.js` e `src/seed.js`. O bug da fatura duplicada e o da fatura sem `valor` aparecem nas duas portas. Não tenho um binário de produção anterior a este repositório para dizer se o furo da corrida já está no ar ou se chegou neste candidato.
- Não medi base maior que a carga de 200.
