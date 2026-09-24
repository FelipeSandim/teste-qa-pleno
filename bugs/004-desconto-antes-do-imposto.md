# 004 Desconto entra antes do imposto e o centavo é truncado

**Severidade:** Média
**Versão afetada:** v2
**Ambiente:** http://localhost:3002

## Passos para reproduzir

1. Exemplo do README, sem desconto (150 kg, SP→MG):

```bash
curl -s -X POST http://localhost:3001/api/cotacoes \
  -H 'Content-Type: application/json' \
  -d '{"cliente":"Comercial Aurora","peso_kg":150,"volumes":1,"uf_origem":"SP","uf_destino":"MG"}'

curl -s -X POST http://localhost:3002/api/cotacoes \
  -H 'Content-Type: application/json' \
  -d '{"cliente":"Comercial Aurora","peso_kg":150,"volumes":1,"uf_origem":"SP","uf_destino":"MG"}'
```

2. Desconto no meio da faixa, onde o percentual está certo (5 kg, 15 volumes, SP→BA):

```bash
curl -s -X POST http://localhost:3002/api/cotacoes \
  -H 'Content-Type: application/json' \
  -d '{"cliente":"Comercial Aurora","peso_kg":5,"volumes":15,"uf_origem":"SP","uf_destino":"BA"}'
```

## Resultado esperado (e a fonte: README, spec ou changelog)

O README manda arredondar o valor final pela regra comercial. A spec manda calcular a rota, aplicar o imposto e só então o desconto.

- 150 kg SP→MG, sem desconto: 180 × 1,4 × 1,12 = **R$ 282,24**
- 5 kg, 15 volumes, SP→BA: 25 × 1,9 × 1,12 = 53,20; menos 5% = **R$ 50,54**

## Resultado obtido

- 150 kg: a v1 devolve 282,24. A v2 devolve **282,22**, com a faixa certa (`valor_base` 180) e desconto 0.
- 15 volumes SP→BA: a v2 devolve desconto 0,05 e total **50,53**.

## Causa provável

`precificar` em `src/pricing/v2.js` aplica o desconto sobre o valor da rota, trunca com `Math.trunc` para duas casas, multiplica pelo imposto e trunca de novo. A v1 usa `Math.round` em cima de `rota × 1,12`.

No caso de 150 kg o truncamento come o centavo que a conta binária de `180 × 1,4` deixa abaixo do valor exato, e o resultado cai para 282,22.

## Impacto

66 cotações da carga estão na faixa certa e no percentual certo da tabela, e ainda assim o valor final difere. A soma (v2 − preço da spec) é **−R$ 0,89**. É subcobrança de centavos, espalhada, não um salto de faixa.

O exemplo de 150 kg do próprio README já sai R$ 0,02 abaixo na v2, sem desconto nenhum.

Sozinho, esse valor não decide o release. A correção é no mesmo `precificar` dos bugs 001 e 002, então entra no mesmo conserto.

## Evidência

```json
{"peso_kg":150,"volumes":1,"uf_origem":"SP","uf_destino":"MG","valor_base":180,"desconto":0,"valor_total":282.22}
{"peso_kg":5,"volumes":15,"uf_origem":"SP","uf_destino":"BA","desconto":0.05,"valor_total":50.53}
```

Cenários "README 150 kg SP→MG" e "desconto de 5% incide depois do imposto" em `node regressao/suite.js`.
