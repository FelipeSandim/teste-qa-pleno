# 006 Cotação já faturada muda de preço e a fatura não guarda o valor

**Severidade:** Alta
**Versão afetada:** v2 no recálculo do detalhe; ambas na fatura da carga sem `valor`
**Ambiente:** carga inicial nas portas 3001 e 3002, tela em `/`

## Passos para reproduzir

1. Com a carga inicial:

```bash
curl -s http://localhost:3002/api/faturas
curl -s http://localhost:3001/api/cotacoes/19
curl -s http://localhost:3002/api/cotacoes/19
```

2. Na tela, a lista "Faturas" mostra as dez últimas.

## Resultado esperado (e a fonte: README, spec ou changelog)

A spec restringe a política nova: não é retroativa. Cotação já faturada mantém o valor pelo qual foi faturada. Não há recálculo nem nota de ajuste.

O README descreve a fatura com o campo `valor`. A v1 é o preço que essas 60 faturas representam hoje, porque a carga foi montada com a regra de produção.

## Resultado obtido

As 60 faturas da carga não têm `valor`. A primeira é:

```json
{"id":1,"id_cotacao":1,"cliente":"Metalúrgica Vale","emitida_em":"2026-06-02"}
```

Na tela, as linhas saem como `#60 · cotação 60 · Comercial Aurora · —`.

Fatura emitida agora, por `POST /api/cotacoes/{id}/faturar`, grava `valor`. O buraco é a carga inicial, em `seedFaturas` de `src/seed.js`.

O detalhe da v2 recalcula todo mundo, inclusive quem já tem fatura. 29 das 60 cotações faturadas mudam de `valor_total` em relação à v1. A soma (v2 − v1) nessas 29 é **R$ 333,02**. Parte disso é faixa de peso (bug 001), parte é desconto aplicado em cima de cobrança antiga (bug 002).

A cotação 19, já faturada, mostra R$ 222,37 na v2 e o preço de produção na v1 (R$ 234,08, sem desconto). A fatura dela não tem valor para conferir.

## Causa provável

`seedFaturas` não copia `valor`. `precificar` roda de novo em todo `GET`. Nada congela o preço no momento da emissão para as faturas que já nasceram na carga.

## Impacto

60 de 60 faturas da carga sem valor, nas duas versões. A operação não consegue ler, na própria lista de faturas, quanto foi cobrado.

29 de 60 cotações já faturadas exibem outro total na v2. Soma da diferença contra a v1: **R$ 333,02**. Se essa leitura for usada para explicar a cobrança ou para emitir ajuste, o ajuste sai em cima de um valor que a fatura nem armazenou.

Esse número já está dentro dos bugs 001 e 002. Não é dinheiro novo além deles. É a mesma diferença, agora em documento que a spec mandou deixar quieto.

## Evidência

Cenários "as 60 faturas da carga inicial trazem o valor cobrado" e "cotações já faturadas mantêm na v2 o valor cobrado na v1" em `node regressao/suite.js`.
