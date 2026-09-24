# 001 Limite da faixa de peso ficou exclusivo

**Severidade:** Crítica
**Versão afetada:** v2
**Ambiente:** `node server.js v2` em http://localhost:3002, carga inicial e cotações criadas na API

## Passos para reproduzir

1. Suba a v2 com `node server.js v2`.
2. Crie a cotação do exemplo conferido no README (10 kg, mesma UF):

```bash
curl -s -X POST http://localhost:3002/api/cotacoes \
  -H 'Content-Type: application/json' \
  -d '{"cliente":"Comercial Aurora","peso_kg":10,"volumes":1,"uf_origem":"SP","uf_destino":"SP"}'
```

3. Repita com 50 kg SP→BA e com 100 kg SP→MG.
4. Na carga inicial, abra a cotação 99:

```bash
curl -s http://localhost:3002/api/cotacoes/99
curl -s http://localhost:3001/api/cotacoes/99
```

## Resultado esperado (e a fonte: README, spec ou changelog)

O README define os limites como inclusivos: 10 kg vale R$ 25,00, 50 kg vale R$ 60,00 e 100 kg vale R$ 110,00. A spec diz que a tabela de faixa de peso não muda. Os exemplos conferidos:

| Peso | Rota | Valor final |
|---|---|---|
| 10 kg | SP → SP | R$ 28,00 |
| 50 kg | SP → BA | R$ 127,68 |
| 100 kg | SP → MG | R$ 172,48 |

A v1 devolve esses três valores.

## Resultado obtido

| Pedido | v2 `valor_base` | v2 `valor_total` |
|---|---|---|
| 10 kg SP→SP | 60 | 67,20 |
| 50 kg SP→BA | 110 | 234,08 |
| 100 kg SP→MG | 180 | 282,22 |

A cotação 99 da carga (10 kg, 8 volumes, PR→BA, em aberto) sai a R$ 127,68 na v2 e a R$ 53,20 na v1. Na tela da v2 a linha e o detalhe mostram base R$ 60,00 e total R$ 127,68.

Pesos imediatamente ao lado do limite continuam certos: 9,99 kg fica em R$ 28,00 e 10,01 kg fica em R$ 67,20.

## Causa provável

Em `src/pricing/v2.js`, `precificar` escolhe a faixa com `peso < ate`. Em `src/pricing/v1.js` a comparação é `peso <= ate`. No limite exato a v2 cai na faixa de cima.

## Impacto

20 das 200 cotações da carga inicial caem em 10, 50 ou 100 kg e sobem de faixa.

Medido por `node regressao/suite.js`, cenário "carga inicial da v2 mantém a faixa de peso inclusiva":

- Soma (v2 − v1) = **R$ 1.941,91**
- 6 já faturadas: o detalhe passa a mostrar **R$ 607,66** a mais do que a v1
- 14 em aberto: se forem faturadas na v2, saem **R$ 1.334,25** acima do preço de produção

Ids: 11, 22, 30, 33, 44, 55, 66, 77, 88, 99, 110, 121, 130, 132, 143, 154, 165, 176, 187, 198.

O caso de 10 kg na mesma UF cobra R$ 67,20 no lugar de R$ 28,00. São R$ 39,20 a mais num único embarque, antes de qualquer desconto.

## Evidência

```json
{"peso_kg":10,"volumes":1,"uf_origem":"SP","uf_destino":"SP","valor_base":60,"multiplicador":1,"desconto":0,"valor_total":67.2}
```

O mesmo POST na porta 3001 devolve `valor_base: 25` e `valor_total: 28`.
