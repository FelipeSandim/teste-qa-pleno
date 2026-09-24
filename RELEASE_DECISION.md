# Decisão de release — v2

## Decisão: GO / NO-GO

**Decisão:** NO-GO

**Data da análise:** 2026-09-22

**Versões comparadas:** v1 (produção) × v2 (release candidate)

## Justificativa

A v2 não pode subir na sexta. O motivo que sozinho basta é a faixa de peso.

O README trata 10, 50 e 100 kg como limite da faixa de baixo. A v2 joga esses pesos na faixa de cima. O exemplo conferido de 10 kg SP→SP, que custa R$ 28,00 em produção, sai a R$ 67,20. Na carga inicial são 20 cotações, **R$ 1.941,91** acima da v1. Dessas, 14 ainda serão faturadas: **R$ 1.334,25** a mais se a v2 cobrar por elas.

Em cima disso, a feature nova erra o próprio piso: 20 volumes ganham 5% em vez de 10%, e 50 volumes ganham 10% em vez de 15%. A lista, que é a tela da operação, omite o desconto e mostra outro preço (95 cotações, **R$ 1.225,87** a mais do que o detalhe). Dois faturamentos ao mesmo tempo geram duas faturas: na cotação 70, **R$ 468,16** por um embarque de R$ 234,08.

Os critérios de aceite 1 a 4 passam. Eles usam 15, 30, 80 e 3 volumes, longe do limite de peso e do piso da tabela. Uma rodada que só execute a spec feliz libera esta v2.

## Resumo dos problemas encontrados

Os reais abaixo não se somam. O R$ 333,02 das cotações já faturadas está dentro da faixa e do desconto. Os R$ 1.225,87 da lista são diferença de tela, não uma segunda cobrança.

| # | Problema | Severidade | Versão | Impacto medido | Bloqueia? |
|---|---|---|---|---|---|
| 001 | Faixa de peso com limite exclusivo | Crítica | v2 | 20/200 cotações. +R$ 1.941,91 contra a v1 (14 em aberto: +R$ 1.334,25) | Sim |
| 002 | 20 volumes ficam em 5% e 50 em 10% | Alta | v2 | 7 cotações com 20 volumes. Nas 6 com a faixa certa, +R$ 57,88 contra a tabela. 50 volumes: 0 na carga; no exemplo, +R$ 1,40 | Sim |
| 003 | Lista sem `valor_total` e sem desconto | Alta | v2 | 200/200 sem o campo. 95/200 com outro preço. Soma (lista − detalhe) = R$ 1.225,87 | Sim |
| 005 | Dois POST de faturar geram duas faturas | Crítica | ambas neste repositório | Cotação 70: 2 × R$ 234,08 = R$ 468,16. 140 cotações em aberto expostas ao mesmo par | Sim |
| 006 | Faturada muda de preço; fatura da carga sem valor | Alta | v2 no detalhe; ambas sem `valor` | 60/60 faturas sem valor. 29/60 detalhes mudam, +R$ 333,02 contra a v1 | Não, para o NO-GO. Corrigir junto |
| 004 | Desconto antes do imposto e truncamento | Média | v2 | Exemplo de 150 kg: R$ 282,22 em vez de R$ 282,24. 66 cotações, −R$ 0,89 | Não sozinho. Sai no mesmo conserto do preço |

## Condições para liberar

1. Faixa inclusiva de novo. Os exemplos de 10, 50 e 100 kg do README batem nas duas portas, e o cenário "carga inicial da v2 mantém a faixa de peso inclusiva" fica verde (0 das 20).
2. Desconto com piso inclusivo e conta na ordem da spec: imposto, depois percentual, depois arredondamento comercial. Verde em 20 volumes (R$ 25,20), 50 volumes (R$ 23,80), 15 volumes SP→BA (R$ 50,54) e 150 kg SP→MG (R$ 282,24).
3. Cada item de `GET /api/cotacoes` traz `valor_total` igual ao `GET /api/cotacoes/{id}`, já com desconto. O cenário da listagem fica verde.
4. Dois `POST /api/cotacoes/70/faturar` simultâneos devolvem um 201 e um 409, e `GET /api/faturas?id_cotacao=70` volta com uma fatura. Nas duas portas.
5. As 60 faturas da carga passam a ter `valor`, e o detalhe de cotação já faturada permanece no preço da v1 enquanto a pergunta 2 do PO não disser o contrário.
6. Resposta do PO sobre 10 volumes, antes de alterar esse ponto. Não é condição para começar o conserto do resto.

A prova é `node regressao/suite.js` verde. Hoje: 26 passaram, 15 falharam.

## Riscos aceitos

| Risco | Por que é aceitável | Como detectaríamos em produção |
|---|---|---|
| Volume 10 sem veredito | Não muda o NO-GO. São 36 cotações se a tabela vencer | PO responde; a suíte passa a assertar 0,05 ou 0 |
| UF inválida ou minúscula cobra multiplicador 1,9 | As duas versões fazem o mesmo e a tela só oferece as UFs conhecidas se o operador usar o fluxo normal. O campo é texto livre | Cotação com UF fora de SP, RJ, MG, PR, RS, BA e preço de regiões diferentes |
| Lista pode continuar lenta em base grande | Não há número de aceite. O bloqueio da lista é o preço | Tempo do `GET /api/cotacoes` depois do corte |
| Clique duplo real, além do teste de dois POST | O teste mostra o efeito. A frequência operacional eu não tenho | Duas faturas com o mesmo `id_cotacao` |

## Recomendação de acompanhamento

Não subir. Se mesmo assim houver pressão para um corte parcial, o único corte que eu aceitaria é não publicar a v2: a v1 desta comparação cobra os exemplos do README.

Quando a v2 corrigida subir, na primeira hora: contar faturas com o mesmo `id_cotacao` (gatilho de rollback se aparecer mais de uma) e amostrar cotações de 10, 50 e 100 kg e de 20 e 50 volumes contra a suíte. Rollback se qualquer uma dessas sair na faixa ou no percentual errados.
