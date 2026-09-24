# Suíte de regressão

Compara a v1 (porta 3001) com a v2 (porta 3002) contra o README e a spec do desconto por volume.

## Como rodar

Na raiz do repositório, com Node 18 ou superior. Nada para instalar.

```bash
node regressao/suite.js
```

O mesmo comando está em `npm test`.

As portas 3001 e 3002 precisam estar livres. A suíte sobe os dois servidores e encerra os dois ao terminar, inclusive quando um cenário falha.

No release candidate atual a suíte termina com código 1: **26 passaram, 15 falharam**. Código 0 é a condição de release descrita em `RELEASE_DECISION.md`.

## Pré-condições

- Node 18+ com `fetch` global.
- Nenhum outro processo escutando em 3001 ou 3002.
- A suíte chama `POST /_reset` antes dos cenários que gravam. Ela depende da carga inicial de 200 cotações e 60 faturas.

## Ferramenta escolhida e por quê

Runner próprio em Node, sem framework. O processo precisa subir dois servidores em processos separados (os dois compartilhariam a memória se rodassem no mesmo processo) e o `node --test` do Node 18 não garante ordem entre casos que usam essa memória. Um script sequencial deixa o relatório em português, na mesma língua dos bugs, e sai com um comando só.

O preço esperado está em `regressao/esperado.js`, em centavos inteiros: faixa inclusiva, imposto de 12%, desconto da tabela aplicado depois do imposto, arredondamento comercial. A v1 entra sem desconto. A v2 entra com a tabela, exceto no volume 10, que a suíte só registra.

## Cenários cobertos

| # | Cenário | O que protege | v1 esperado | v2 esperado |
|---|---|---|---|---|
| 1 | Portas | O processo certo em cada porta | `v1` | `v2` |
| 2 | Exemplos do README e vizinhos do limite | Faixa inclusiva e o caso de 150 kg | 28,00 / 53,20 / 127,68 / 172,48 / 282,24 | Os mesmos |
| 3 | Rotas SP, RJ, PR, RS, BA com 5 kg | Multiplicador 1 / 1,4 / 1,9 | Igual ao README | Igual à v1 |
| 4 | Volumes 3, 9, 15, 19, 20, 30, 49, 50, 80 | Critérios de aceite e os pisos da tabela | Desconto 0, R$ 28,00 | Percentual da tabela em cima de R$ 28,00 |
| 5 | Volume 10 | Não julga. Registra o que a v2 devolve | — | Em aberto, ver `PERGUNTAS_AO_PO.md` |
| 6 | 15 volumes, 5 kg, SP→BA | Desconto depois do imposto | — | R$ 50,54 |
| 7 | Varredura das 200 | Faixa, percentual, centavo, retroatividade, lista | 200/200 no README | Faixa inclusiva, tabela, lista = detalhe, faturada = preço da v1 |
| 8 | 60 faturas da carga | Campo `valor` | — | 60 faturas com valor |
| 9 | Faturar uma vez, 404, 409 | Caminho sequencial | 201 de R$ 28,00 e depois 409 | O mesmo |
| 10 | Dois POST juntos na cotação 70 | Fatura única sob concorrência | Uma fatura | Uma fatura |
| 11 | 422 e filtro | Contrato que não devia mudar | 422; Metalúrgica Vale com total 34 | 422 no peso zero |

## Como a suíte compara v1 e v2

Cada exemplo é criado nas duas portas, depois do reset, e comparado ao oracle. A varredura lê o detalhe das 200 cotações nas duas versões: a v1 tem de bater com o README sem desconto; a v2 tem de bater com a spec, e cotação já faturada tem de continuar no preço da v1. A lista da v2 é comparada ao detalhe da própria v2.

## O que esta suíte NÃO cobre

- Volume 10 como sucesso ou falha.
- UF inválida, paginação inválida, layout da tela.
- Se a operação de fato dá clique duplo. Ela só prova que dois POST simultâneos faturam duas vezes.

## Saída esperada

No candidato atual, abaixo. Depois do conserto, as linhas `FAIL` viram `pass` e a última linha fica `41 passaram, 0 falharam`.

```
[pass] as portas anunciam v1 e v2
       v1=v1 v2=v2
[FAIL] README 10 kg SP→SP = R$ 28.00 nas duas versões
       esperado base 25 total 28.00 | v1 base 25 total 28.00 | v2 base 60 total 67.20
[pass] README 5 kg SP→BA = R$ 53.20 nas duas versões
       esperado base 25 total 53.20 | v1 base 25 total 53.20 | v2 base 25 total 53.20
[FAIL] README 50 kg SP→BA = R$ 127.68 nas duas versões
       esperado base 60 total 127.68 | v1 base 60 total 127.68 | v2 base 110 total 234.08
[FAIL] README 100 kg SP→MG = R$ 172.48 nas duas versões
       esperado base 110 total 172.48 | v1 base 110 total 172.48 | v2 base 180 total 282.22
[FAIL] README 150 kg SP→MG = R$ 282.24 nas duas versões
       esperado base 180 total 282.24 | v1 base 180 total 282.24 | v2 base 180 total 282.22
[pass] README 9,99 kg ainda na 1ª faixa = R$ 28.00 nas duas versões
       esperado base 25 total 28.00 | v1 base 25 total 28.00 | v2 base 25 total 28.00
[pass] README 10,01 kg na 2ª faixa = R$ 67.20 nas duas versões
       esperado base 60 total 67.20 | v1 base 60 total 67.20 | v2 base 60 total 67.20
[pass] README 50,01 kg na 3ª faixa = R$ 123.20 nas duas versões
       esperado base 110 total 123.20 | v1 base 110 total 123.20 | v2 base 110 total 123.20
[pass] README 100,01 kg na 4ª faixa = R$ 201.60 nas duas versões
       esperado base 180 total 201.60 | v1 base 180 total 201.60 | v2 base 180 total 201.60
[pass] rota SP→SP multiplicador 1
       v1 mult 1 total 28.00 | v2 mult 1 total 28.00
[pass] rota SP→RJ multiplicador 1.4
       v1 mult 1.4 total 39.20 | v2 mult 1.4 total 39.20
[pass] rota PR→RS multiplicador 1.4
       v1 mult 1.4 total 39.20 | v2 mult 1.4 total 39.20
[pass] rota SP→PR multiplicador 1.9
       v1 mult 1.9 total 53.20 | v2 mult 1.9 total 53.20
[pass] rota BA→RS multiplicador 1.9
       v1 mult 1.9 total 53.20 | v2 mult 1.9 total 53.20
[pass] desconto 3 volumes (critério 4)
       v1 desconto 0 total 28.00 | v2 desconto 0 total 28.00 | esperado v2 desconto 0 total 28.00
[pass] desconto 9 volumes (abaixo de 10)
       v1 desconto 0 total 28.00 | v2 desconto 0 total 28.00 | esperado v2 desconto 0 total 28.00
[pass] desconto 15 volumes (critério 1)
       v1 desconto 0 total 28.00 | v2 desconto 0.05 total 26.60 | esperado v2 desconto 0.05 total 26.60
[pass] desconto 19 volumes (teto da faixa de 5%)
       v1 desconto 0 total 28.00 | v2 desconto 0.05 total 26.60 | esperado v2 desconto 0.05 total 26.60
[FAIL] desconto 20 volumes (piso da faixa de 10%)
       v1 desconto 0 total 28.00 | v2 desconto 0.05 total 26.60 | esperado v2 desconto 0.1 total 25.20
[pass] desconto 30 volumes (critério 2)
       v1 desconto 0 total 28.00 | v2 desconto 0.1 total 25.20 | esperado v2 desconto 0.1 total 25.20
[pass] desconto 49 volumes (teto da faixa de 10%)
       v1 desconto 0 total 28.00 | v2 desconto 0.1 total 25.20 | esperado v2 desconto 0.1 total 25.20
[FAIL] desconto 50 volumes (piso da faixa de 15%)
       v1 desconto 0 total 28.00 | v2 desconto 0.1 total 25.20 | esperado v2 desconto 0.15 total 23.80
[pass] desconto 80 volumes (critério 3)
       v1 desconto 0 total 28.00 | v2 desconto 0.15 total 23.80 | esperado v2 desconto 0.15 total 23.80
[pass] volume 10 fica de fora do veredito (tabela diz 5%, texto diz "acima de 10")
       v2 devolveu desconto 0 e total 28.00. Ver PERGUNTAS_AO_PO.md.
[FAIL] desconto de 5% incide depois do imposto (5 kg, 15 vol, SP→BA = R$ 50,54)
       esperado 50.54 | v2 50.53 desconto 0.05
[pass] carga inicial da v1 bate com a tabela de peso, a rota e o imposto
       200/200
[FAIL] carga inicial da v2 mantém a faixa de peso inclusiva
       20/200 com a faixa seguinte. Soma (v2 − v1) = R$ 1941.91 (6 já faturadas, R$ 607.66; 14 em aberto, R$ 1334.25). ids: 11, 22, 30, 33, 44, 55, 66, 77, 88, 99, 110, 121, 130, 132, 143, 154, 165, 176, 187, 198
[FAIL] carga inicial da v2 aplica o percentual da tabela (exceto volume 10)
       7 cotações com 20 volumes recebem 5% em vez de 10%. Nas 6 em que a faixa de peso está certa, a soma (v2 − tabela) = R$ 57.88. #19 faturada, #65, #88, #111, #134, #157, #180
[FAIL] carga inicial da v2 arredonda o valor final como a v1
       66 cotações com faixa e percentual certos e valor diferente. Soma (v2 − esperado) = R$ -0.89.
[FAIL] cotações já faturadas mantêm na v2 o valor cobrado na v1
       29/60 mudaram de valor. Soma (v2 − v1) = R$ 333.02.
[FAIL] listagem da v2 traz valor_total igual ao detalhe
       200/200 sem o campo valor_total. 95/200 com o preço da lista diferente do detalhe. Soma (lista − detalhe) = R$ 1225.87.
[FAIL] as 60 faturas da carga inicial trazem o valor cobrado
       60 faturas, 60 sem campo valor. Primeira: {"id":1,"id_cotacao":1,"cliente":"Metalúrgica Vale","emitida_em":"2026-06-02"}
[pass] v1 fatura uma vez a R$ 28,00 e recusa a segunda com 409
       1ª HTTP 201 valor 28 | 2ª HTTP 409 {"erro":"Cotação já faturada"} | faturas 1
[pass] v2 fatura uma vez a R$ 28,00 e recusa a segunda com 409
       1ª HTTP 201 valor 28 | 2ª HTTP 409 {"erro":"Cotação já faturada"} | faturas 1
[pass] faturar cotação inexistente responde 404
       HTTP 404 {"erro":"Cotação não encontrada"}
[pass] cotação 1, já faturada na carga, responde 409
       HTTP 409 {"erro":"Cotação já faturada"}
[FAIL] v1 dois faturamentos simultâneos da cotação 70 geram uma única fatura
       HTTP 201 e 201. Faturas: 2. Soma cobrada: R$ 468.16. [{"id":61,"id_cotacao":70,"cliente":"Indústria Horizonte","valor":234.08,"emitida_em":"2026-09-23"},{"id":62,"id_cotacao":70,"cliente":"Indústria Horizonte","valor":234.08,"emitida_em":"2026-09-23"}]
[FAIL] v2 dois faturamentos simultâneos da cotação 70 geram uma única fatura
       HTTP 201 e 201. Faturas: 2. Soma cobrada: R$ 468.16. [{"id":61,"id_cotacao":70,"cliente":"Indústria Horizonte","valor":234.08,"emitida_em":"2026-09-23"},{"id":62,"id_cotacao":70,"cliente":"Indústria Horizonte","valor":234.08,"emitida_em":"2026-09-23"}]
[pass] criação sem campos obrigatórios ou com peso zero responde 422
       incompleto HTTP 422 {"erro":"Campos obrigatórios ausentes: peso_kg, volumes, uf_origem, uf_destino"} | peso 0 HTTP 422 {"erro":"Peso deve ser positivo e volumes no mínimo 1"}
[pass] filtro por cliente usa o total da consulta, não o tamanho da página
       total 34 itens 34

26 passaram, 15 falharam
```
