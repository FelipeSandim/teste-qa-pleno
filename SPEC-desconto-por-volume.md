# Especificação — Desconto por Volume

**Produto:** Cotação & Faturamento
**Solicitante:** Diretoria Comercial
**Responsável pela spec:** Product Owner — Renata Camargo
**Versão de destino:** 2.0
**Status:** Aprovada para desenvolvimento

---

## 1. Contexto comercial

Nossos clientes de maior porte vêm negociando condição diferenciada para embarques
com muitos volumes. Hoje a cotação não tem nenhum mecanismo de desconto: o valor
sai da tabela de faixa de peso, é multiplicado pelo fator de rota e recebe o
imposto. Quem quer condição especial precisa abrir exceção manual com o comercial,
o que hoje é feito por planilha e não fica registrado em lugar nenhum.

A diretoria aprovou uma política padrão de desconto por quantidade de volumes,
válida para toda a base, sem necessidade de aprovação caso a caso. A meta é
reduzir o número de exceções manuais e dar previsibilidade de preço ao cliente.

## 2. Regra

O desconto é definido pela quantidade de volumes do embarque, conforme a tabela:

| Volumes | Desconto |
|---|---|
| 10 a 19 | 5% |
| 20 a 49 | 10% |
| 50 ou mais | 15% |

O desconto incide sobre o valor final da cotação, já acrescido do imposto. Ou
seja: calcula-se o valor da rota, aplica-se o imposto vigente e só então se aplica
o percentual de desconto sobre esse resultado. O valor final continua expresso em
reais com duas casas decimais.

A política vale para pedidos acima de 10 volumes e não altera em nada a tabela de
faixa de peso nem os multiplicadores de rota, que permanecem exatamente como estão
hoje em produção.

## 3. Exposição na API e na tela

A cotação passa a expor o percentual de desconto aplicado em um campo próprio,
como fração decimal (`0.05`, `0.1`, `0.15`), e `0` quando não há desconto. A tela
de detalhe deve mostrar o percentual junto do valor final, para que o operador
consiga explicar o preço ao cliente sem precisar refazer a conta.

## 4. Critérios de aceite

1. Uma cotação de 15 volumes recebe 5% de desconto.
2. Uma cotação de 30 volumes recebe 10% de desconto.
3. Uma cotação de 80 volumes recebe 15% de desconto.
4. Uma cotação de 3 volumes não recebe desconto e mantém o valor de hoje.
5. O percentual aplicado fica visível na resposta da API e na tela de detalhe.
6. O valor final apresentado ao cliente é o valor com imposto e com desconto.

## 5. Restrições

- A política **não é retroativa**. Cotações já faturadas mantêm o valor pelo qual
  foram faturadas; não há recálculo nem nota de ajuste.
- Não há acúmulo com outras condições comerciais — o desconto por volume é o
  único desconto automático do sistema.
- A tabela de percentuais é fixa nesta versão. Parametrização por cliente ficou
  fora de escopo e será tratada em uma próxima etapa.

## 6. Fora de escopo

- Desconto por peso ou por valor total do embarque.
- Desconto negociado por contrato individual.
- Relatório de desconto concedido por período.
