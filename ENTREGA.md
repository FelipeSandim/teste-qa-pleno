# Entrega — validação da v2

Esta pasta é a análise de QA do release candidate de Cotação & Faturamento. A pergunta era se a v2 pode substituir a v1 na sexta-feira.

**Decisão: NO-GO.** O motivo que basta sozinho é a faixa de peso: 10 kg, 50 kg e 100 kg deixaram de ser inclusivos. O exemplo de 10 kg na mesma UF, R$ 28,00 na v1, sai a R$ 67,20 na v2. O detalhe está em [RELEASE_DECISION.md](./RELEASE_DECISION.md).

O [README.md](./README.md) continua sendo o contrato da v1. Este arquivo só explica a entrega.

## Por onde ler

| Ordem | Arquivo | O que tem |
|---|---|---|
| 1 | [RELEASE_DECISION.md](./RELEASE_DECISION.md) | NO-GO, o que bloqueia e o que precisa ficar verde para liberar |
| 2 | [bugs/](./bugs/) | Um arquivo por problema, com reprodução e impacto na carga de 200 cotações |
| 3 | [ESTRATEGIA.md](./ESTRATEGIA.md) | Risco, prioridade e o que ficou de fora de propósito |
| 4 | [MATRIZ_COBERTURA.md](./MATRIZ_COBERTURA.md) | O que foi coberto, como, e o resultado |
| 5 | [PERGUNTAS_AO_PO.md](./PERGUNTAS_AO_PO.md) | O que a spec não fecha. Volume 10 não virou bug |
| 6 | [regressao/README.md](./regressao/README.md) | Como a suíte compara as duas versões |

## Como reproduzir

Node 18 ou superior. Nada para instalar. As portas 3001 e 3002 precisam estar livres: a suíte sobe a v1 e a v2 e encerra as duas no final.

```bash
node regressao/suite.js
```

No candidato desta entrega o comando termina com código 1: **26 passaram, 15 falharam**. Código 0 é a condição para trocar o NO-GO por GO.

Para olhar a tela: `node server.js v1` em http://localhost:3001 e `node server.js v2` em http://localhost:3002.

## O que a suíte está provando

- Faixa de peso, rota, imposto e arredondamento do README. O esperado é o mesmo número nas duas versões. A v2 falha no limite da faixa e no centavo.
- Desconto da spec, aplicado depois do imposto. Os critérios de aceite (15, 30 e 80 volumes) passam. Os pisos de 20 e de 50 volumes falham.
- Listagem com o mesmo `valor_total` do detalhe.
- Uma cotação, uma fatura. Dois POST ao mesmo tempo na cotação 70 geram duas faturas.
- As 60 faturas da carga trazem o valor cobrado, e cotação já faturada não muda de preço.

O volume exatamente 10 fica registrado e sem veredito: a tabela da spec diz 5% e o texto diz "acima de 10 volumes".
