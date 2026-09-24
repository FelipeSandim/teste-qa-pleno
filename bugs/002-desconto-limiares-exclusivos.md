# 002 Desconto por volume erra o piso de 20 e de 50

**Severidade:** Alta
**Versão afetada:** v2
**Ambiente:** `node server.js v2` em http://localhost:3002

## Passos para reproduzir

1. Suba a v2.
2. Crie, com 5 kg e rota SP→SP, cotações de 15, 20, 30, 50 e 80 volumes:

```bash
curl -s -X POST http://localhost:3002/api/cotacoes \
  -H 'Content-Type: application/json' \
  -d '{"cliente":"Comercial Aurora","peso_kg":5,"volumes":20,"uf_origem":"SP","uf_destino":"SP"}'
```

Troque `volumes` por 15, 30, 50 e 80.

## Resultado esperado (e a fonte: README, spec ou changelog)

A tabela da spec, aplicada depois do imposto sobre os R$ 28,00 deste embarque:

| Volumes | Desconto | Valor final |
|---|---|---|
| 15 | 5% | R$ 26,60 |
| 20 a 49 | 10% | R$ 25,20 |
| 50 ou mais | 15% | R$ 23,80 |
| 80 | 15% | R$ 23,80 |

Os critérios de aceite 1, 2 e 3 (15, 30 e 80 volumes) usam o meio da faixa. A tabela inclui o piso: "20 a 49" e "50 ou mais".

## Resultado obtido

| Volumes | Desconto na v2 | Total na v2 | Leitura da tabela |
|---|---|---|---|
| 15 | 0,05 | 26,60 | certo |
| 20 | 0,05 | 26,60 | 10% e R$ 25,20 |
| 30 | 0,10 | 25,20 | certo |
| 50 | 0,10 | 25,20 | 15% e R$ 23,80 |
| 80 | 0,15 | 23,80 | certo |

20 volumes recebe a faixa de 5%. 50 volumes recebe a faixa de 10%. Quem testa só os critérios de aceite não vê o erro.

O volume 10 devolve desconto 0. A tabela e o texto "acima de 10 volumes" divergem, então esse ponto está em `PERGUNTAS_AO_PO.md` e não entra neste bug.

## Causa provável

`descontoPorVolume` em `src/pricing/v2.js` usa `>`, não `>=`:

- `qtd > 50` para 15%
- `qtd > 20` para 10%
- `qtd > 10` para 5%

## Impacto

A carga não tem nenhum embarque com 50 volumes ou mais (o máximo é 23). O piso de 15% só aparece em cotação nova. No exemplo de 5 kg SP→SP, 50 volumes cobra R$ 25,20 em vez de R$ 23,80: **R$ 1,40 a mais** nesse embarque, cinco pontos percentuais em cima do valor com imposto.

Há 7 cotações com exatamente 20 volumes: 19, 65, 88, 111, 134, 157 e 180. Todas recebem 5% no lugar de 10%.

A #88 também está na faixa de peso errada e o dinheiro dela está no bug 001. Nas outras 6, a faixa está certa e a soma (v2 − tabela de 10%) é **R$ 57,88**. A #19 já está faturada; as cinco em aberto é que seriam cobradas nesse valor inflado.

## Evidência

```json
{"peso_kg":5,"volumes":20,"desconto":0.05,"valor_total":26.6}
{"peso_kg":5,"volumes":50,"desconto":0.1,"valor_total":25.2}
```

Saída do cenário "carga inicial da v2 aplica o percentual da tabela" em `node regressao/suite.js`.
