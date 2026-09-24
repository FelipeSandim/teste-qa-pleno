# 003 Listagem esconde o desconto e troca o campo do preço

**Severidade:** Alta
**Versão afetada:** v2
**Ambiente:** http://localhost:3002, carga inicial e tela em `/`

## Passos para reproduzir

1. Suba a v2 e abra http://localhost:3002.
2. Compare a linha da cotação 19 com o detalhe dela.
3. Ou pela API:

```bash
curl -s http://localhost:3002/api/cotacoes/19
curl -s 'http://localhost:3002/api/cotacoes?limit=500'
```

No JSON da lista, ache o item `"id": 19`.

## Resultado esperado (e a fonte: README, spec ou changelog)

O README diz que `valor_total` da listagem é o mesmo valor do detalhe. A spec pede o percentual no detalhe e o valor final já com imposto e desconto. O changelog enxuga o payload da lista; não diz para mostrar o preço sem desconto nem para renomear `valor_total`.

## Resultado obtido

Detalhe da cotação 19 (20 volumes, já faturada):

```json
{"id":19,"volumes":20,"desconto":0.05,"valor_total":222.37}
```

Item da lista:

```json
{"id":19,"volumes":20,"faturada":true,"total":234.08}
```

Não existe `valor_total` nem `desconto`. `total` é o preço com `volumes` forçado para 1.

Na tela, a linha mostra desconto "—" e total R$ 234,08. O detalhe mostra desconto 5% e total R$ 222,37.

## Causa provável

`itemDeLista` em `src/cotacoes.js`, no ramo `versao === 'v2'`, precifica uma cópia com `volumes: 1` e grava o resultado em `total`.

## Impacto

As 200 linhas da listagem da v2 saem sem `valor_total`.

Em 95 das 200, o número da lista é maior que o do detalhe. A soma (lista − detalhe) é **R$ 1.225,87**. É o que o operador vê na tabela, que é a tela de trabalho. A fatura usa o cálculo do detalhe, então o cliente pode ser cobrado por um valor e a operação ter lido outro.

O desconto da cotação 19 é o do bug 002; aqui o problema é outro: a lista nem chega a usar o desconto que o detalhe aplicou. R$ 234,08 na linha é o preço cheio; R$ 222,37 no detalhe já tem 5%.

## Evidência

Tela da v2, cotação 19: `19 | Metalúrgica Vale | 63.7 | 20 | RJ → PR | — | R$ 234,08 | sim` no grid, e no painel `Desconto 5%` / `Total R$ 222,37`.

Contagem no cenário "listagem da v2 traz valor_total igual ao detalhe" de `node regressao/suite.js`.
