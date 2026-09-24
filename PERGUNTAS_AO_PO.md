# Perguntas ao Product Owner

## Perguntas em aberto

### 1. Dez volumes ganham 5% ou não?

**Onde apareceu:** `SPEC-desconto-por-volume.md`, seção 2. Tabela e o parágrafo logo abaixo.

**O que está ambíguo:**

- A tabela diz "10 a 19" com 5%.
- O texto diz: "A política vale para pedidos acima de 10 volumes".

"Acima de 10" deixa o 10 de fora. "10 a 19" inclui o 10. Os critérios de aceite usam 15, 30, 80 e 3 volumes, então não desfazem a dúvida.

**O que a v1 faz hoje:** desconto 0 em qualquer volume. Dez volumes de 5 kg SP→SP custam R$ 28,00.

**O que a v2 faz:** desconto 0 e R$ 28,00 no mesmo embarque. O código usa `volumes > 10`. Isso combina com o texto e não combina com a tabela.

**Por que isso importa:** a carga tem 36 cotações com exatamente 10 volumes (11 delas já faturadas). Se a tabela for a regra, essas 36 ficam sem um desconto de 5% que a spec teria concedido. Nas 33 em que a faixa de peso está certa, a soma desse 5% não aplicado é da ordem de R$ 368. Se o texto for a regra, a v2 está certa nesse ponto e eu não abro bug.

**Interpretação que adotei enquanto não há resposta:** não marquei o volume 10 como defeito. Os bugs 002 e a suíte julgam 20, 49 e 50, que a tabela fixa sem essa frase no meio. Se a resposta for "10 entra na faixa de 5%", o bug 002 ganha mais 36 cotações e o NO-GO continua. Se a resposta for "a partir de 11", o relatório perde essa ressalva e o NO-GO continua por causa da faixa de peso, dos pisos 20 e 50, da lista e da fatura duplicada.

**Bloqueia o go/no-go?** Não — o NO-GO já está fechado por outros defeitos. Bloqueia só o texto final do bug de desconto.

---

### 2. "Não retroativo" trava o detalhe da cotação ou só a fatura?

**Onde apareceu:** `SPEC-desconto-por-volume.md`, seção 5. "Cotações já faturadas mantêm o valor pelo qual foram faturadas; não há recálculo nem nota de ajuste."

**O que está ambíguo:**

- Leitura A: o `GET` da cotação já faturada continua mostrando o preço antigo. Recalcular o detalhe já é recálculo.
- Leitura B: a fatura é que não muda e não se emite nota de ajuste. O detalhe pode passar a mostrar o preço novo, como informação.

**O que a v1 faz hoje:** detalhe e a regra de produção são o mesmo número. As 60 faturas da carga não trazem `valor`, então a tela de faturas mostra "—".

**O que a v2 faz:** recalcula o detalhe. 29 das 60 cotações faturadas mudam de total em relação à v1. Soma (v2 − v1) = R$ 333,02. A fatura continua sem `valor`.

**Por que isso importa:** na leitura A, o bug 006 é quebra da spec e o operador explica a cobrança com um número novo. Na leitura B, o problema que sobra é a fatura sem valor gravado: não dá para provar que a cobrança antiga foi preservada, nas duas versões.

**Interpretação que adotei enquanto não há resposta:** leitura A. Cotação faturada mantém, no detalhe, o valor da v1. Se a resposta for a leitura B, eu tiro o recálculo do detalhe da lista de bloqueios e deixo o bug da fatura sem `valor` como falha das duas versões, ainda assim a corrigir, sem ser o motivo do NO-GO.

**Bloqueia o go/no-go?** Não. Faixa de peso, desconto, lista e fatura duplicada já barram a sexta.

---

## Decisões que tomei sem perguntar

- **Arredondamento.** O README manda a regra comercial no valor final. A spec manda o desconto depois do imposto e duas casas. Juntei as duas: imposto, depois desconto, depois meio centavo para cima. Truncar no meio do cálculo é defeito (bug 004), não uma segunda interpretação.
- **Nome do campo na lista.** O changelog pode enxugar o payload. O README ainda chama o preço de `valor_total` e diz que lista e detalhe mostram o mesmo número. Tratei o campo `total`, calculado sem desconto, como defeito (bug 003).
- **Pisos 20 e 50.** A frase "acima de 10" não fala dessas faixas. "20 a 49" e "50 ou mais" incluem o 20 e o 50. Bug 002, sem pergunta.
- **Faixa de peso.** Spec e changelog dizem que a tabela não muda, e o README marca o limite como inclusivo. Bug 001, sem pergunta.
