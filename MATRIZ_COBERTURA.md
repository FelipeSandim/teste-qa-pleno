# Matriz de cobertura

## Como ler esta matriz

| Nível | Significado |
|---|---|
| Automatizado | `node regressao/suite.js` cria o caso ou varre a carga e falha se o resultado fugir do README ou da spec |
| Manual | Conferido na API com curl e, onde o preço aparece para o operador, na tela da v2 |
| Não coberto | Fora desta rodada, com o motivo em `ESTRATEGIA.md` |

"Falhou" quer dizer que o release candidate não cumpre a regra. O cenário permanece na suíte de propósito: volta a passar quando o conserto entrar.

## Risco × cobertura

| # | Risco | Área | Como foi coberto | Automatizado? | Resultado | Problema aberto |
|---|---|---|---|---|---|---|
| 1 | 10, 50 e 100 kg sobem de faixa | Preço | Exemplos do README e varredura das 200 | Automatizado | Falhou. 20 cotações, +R$ 1.941,91 contra a v1 | 001 |
| 2 | Piso de 20 e de 50 volumes no desconto errado | Desconto | 3, 9, 15, 19, 20, 30, 49, 50, 80 volumes | Automatizado | 15, 30 e 80 passam. 20 e 50 falham. 7 cotações com 20 volumes | 002 |
| 3 | Desconto antes do imposto, centavo truncado | Desconto | 150 kg SP→MG e 15 vol SP→BA; varredura | Automatizado | Falhou. 66 cotações, −R$ 0,89 | 004 |
| 4 | Lista mostra preço sem desconto | Listagem | 200 itens contra o detalhe; tela da cotação 19 | Automatizado e manual | Falhou. 200 sem `valor_total`, 95 com preço diferente, +R$ 1.225,87 na tela | 003 |
| 5 | Duas faturas na mesma cotação | Faturamento | Dois POST paralelos na cotação 70, nas duas portas | Automatizado | Falhou. 2 × R$ 234,08 = R$ 468,16 | 005 |
| 6 | Fatura sequencial duplicada, id inexistente | Faturamento | Segunda chamada, id 99999, cotação 1 da carga | Automatizado | Passou. 409, 404, 409 | — |
| 7 | Fatura da carga sem valor e detalhe recalculado | Retroatividade | `GET /api/faturas` e detalhe v1 × v2 das 60 | Automatizado | Falhou. 60 sem `valor`; 29/60 mudam, +R$ 333,02 | 006 |
| 8 | Rota e imposto nas faixas que não são o limite | Preço | SP, RJ, MG, PR, RS, BA com 5 kg; carga da v1 | Automatizado | Passou. v1 200/200 | — |
| 9 | Validação 422 e filtro por cliente | Contrato | Corpo incompleto, peso 0, cliente Metalúrgica Vale | Automatizado | Passou. 422 e total 34 | — |
| 10 | Volume 10 | Desconto | Criado na suíte, sem veredito | Automatizado só como registro | v2 devolve desconto 0 e R$ 28,00 | Pergunta ao PO |

## Cobertura por regra de negócio

| Regra | Fonte | Cenários testados | Situação |
|---|---|---|---|
| Faixa de peso | README | 9,99 / 10 / 10,01 / 50 / 50,01 / 100 / 100,01 / 150 kg e as 200 da carga | v1 certa. v2 erra o limite exato (001) e erra 150 kg em R$ 0,02 (004) |
| Multiplicador de rota | README | mesma UF, mesma região (SP–RJ, PR–RS) e regiões diferentes (SP–PR, BA–RS) | Igual nas duas versões |
| Imposto | README | 12% dentro dos exemplos do README | Certo na v1. Na v2 o imposto é aplicado depois de um desconto já truncado (004) |
| Arredondamento do valor final | README | 150 kg SP→MG = R$ 282,24; varredura das 200 | v2 trunca. 66 cotações, −R$ 0,89 (004) |
| Fatura única por cotação | README | Sequência 201 depois 409; dois POST juntos; 404; cotação já faturada | Sequência certa. Concorrência gera duas faturas (005) |
| Desconto por volume | SPEC | Critérios 1–4 e pisos 19, 20, 49, 50 | Meio da faixa certo. Pisos 20 e 50 errados (002). Ordem com o imposto errada (004) |
| Contrato das rotas da API | README | `valor_total` lista = detalhe; 422; filtro; `GET /api/faturas` | Lista da v2 quebra o contrato (003). Faturas da carga sem `valor` (006). 422 e filtro passam |

## Lacunas conhecidas

Combinam com "O que decidi NÃO testar" na estratégia.

- Volume 10, até o PO escolher entre a tabela e a frase "acima de 10".
- UF fora das seis do README, e UF em minúscula.
- `page` e `limit` inválidos.
- Tempo de resposta da listagem.
- Aparência da tela além do preço, do desconto e do valor da fatura.
