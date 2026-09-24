# 005 Dois faturamentos ao mesmo tempo geram duas faturas

**Severidade:** Crítica
**Versão afetada:** ambas (o código está em `src/faturas.js`, usado pela v1 e pela v2 deste repositório)
**Ambiente:** http://localhost:3001 e http://localhost:3002, depois de `POST /_reset`

## Passos para reproduzir

1. Suba as duas versões e restaure a carga com `POST /_reset`.
2. Dispare dois POST simultâneos na cotação 70, que nasce em aberto:

```bash
node -e '
Promise.all([
  fetch("http://localhost:3002/api/cotacoes/70/faturar", { method: "POST" }),
  fetch("http://localhost:3002/api/cotacoes/70/faturar", { method: "POST" }),
]).then(async ([a, b]) => {
  console.log(a.status, await a.json());
  console.log(b.status, await b.json());
  console.log(await (await fetch("http://localhost:3002/api/faturas?id_cotacao=70")).json());
});
'
```

3. Repita na porta 3001.

Um segundo POST feito depois que o primeiro já respondeu devolve 409, nas duas versões. A falha é só quando os dois entram juntos.

## Resultado esperado (e a fonte: README, spec ou changelog)

O README: uma cotação só pode ser faturada uma vez. A segunda tentativa responde 409 com `Cotação já faturada`. Vale para clique duplo e para dois clientes da API ao mesmo tempo. O changelog descreve ajuste no fluxo de faturamento da v2.

## Resultado obtido

Os dois POST respondem **201**. A cotação 70 fica com duas faturas, 61 e 62, cada uma de R$ 234,08. A soma cobrada é **R$ 468,16** por um embarque de R$ 234,08.

O mesmo par de 201 aparece na v1 deste repositório.

## Causa provável

`faturar` em `src/faturas.js` lê `cotacao.faturada`, espera 15 ms (`setTimeout`) e só então grava a fatura e marca a cotação. As duas requisições passam pela leitura antes de qualquer uma gravar a flag.

## Impacto

Reproduzido na cotação 70, nas duas portas: 2 faturas, R$ 468,16 no lugar de R$ 234,08.

A carga tem 140 cotações em aberto (as de id 61 a 200). Qualquer uma delas aceita o mesmo par de POST. Não medi quantos cliques duplos a operação faria na sexta; medi que uma corrida cobra o dobro.

O caminho sequencial está são: fatura única de R$ 28,00, segunda chamada 409, cotação inexistente 404, cotação 1 da carga 409. A suíte cobre esses casos e eles passam.

## Evidência

```json
[
  {"id":61,"id_cotacao":70,"cliente":"Indústria Horizonte","valor":234.08,"emitida_em":"2026-09-23"},
  {"id":62,"id_cotacao":70,"cliente":"Indústria Horizonte","valor":234.08,"emitida_em":"2026-09-23"}
]
```

`emitida_em` é o dia em que o comando roda. Ids 61 e 62, os dois HTTP 201 e o valor R$ 234,08 se repetem a cada `POST /_reset`.

Cenário "dois faturamentos simultâneos da cotação 70" em `node regressao/suite.js`, nas duas versões.
