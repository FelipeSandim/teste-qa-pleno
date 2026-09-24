# Cotação & Faturamento

A validação da v2 está preenchida neste repositório. Decisão: **NO-GO**.
O mapa da entrega está em [ENTREGA.md](./ENTREGA.md).

Este documento descreve as **regras vigentes em produção** e o **contrato da API**
como estão hoje na v1.

---

## Por onde começar

Leia nesta ordem:

1. **[DESAFIO.md](./DESAFIO.md)** — o que você precisa entregar, o prazo e o
   contexto da decisão que está nas suas mãos.
2. **Este README** — as regras vigentes da v1 e o contrato da API. É a
   referência do que é considerado correto hoje.
3. **[CHANGELOG-v2.md](./CHANGELOG-v2.md)** — o que o time de desenvolvimento
   informou que mudou na v2.
4. **[SPEC-desconto-por-volume.md](./SPEC-desconto-por-volume.md)** — a
   especificação comercial da feature nova que a v2 traz.

## O que você vai entregar

Cada arquivo abaixo já está no repositório, com as seções prontas para
preencher. O detalhamento do que se espera de cada um está no
[DESAFIO.md](./DESAFIO.md).

| Arquivo | O que colocar nele |
|---------|--------------------|
| [ESTRATEGIA.md](./ESTRATEGIA.md) | Análise de risco, priorização e o que decidiu **não** testar |
| [MATRIZ_COBERTURA.md](./MATRIZ_COBERTURA.md) | Risco × cobertura |
| [bugs/](./bugs/) | Um arquivo por problema, com causa provável e impacto, seguindo o [modelo](./bugs/_TEMPLATE.md) |
| [regressao/](./regressao/) | Sua suíte automatizada comparando v1 e v2 ([leia primeiro](./regressao/README.md)) |
| [PERGUNTAS_AO_PO.md](./PERGUNTAS_AO_PO.md) | O que ficou ambíguo e você precisa confirmar antes de assumir |
| [RELEASE_DECISION.md](./RELEASE_DECISION.md) | Sua decisão de **GO / NO-GO** sobre a v2, justificada |

---

## Como rodar

Requer apenas Node.js 18 ou superior. Não há dependências para instalar.

### Já tem o Node instalado?

Abra o terminal e rode:

```bash
node --version
```

Se aparecer `v18` ou maior, está pronto — pule para o passo seguinte. Se aparecer
`command not found` (macOS/Linux) ou `não é reconhecido como um comando`
(Windows), instale por um destes caminhos:

| Sistema | Como instalar |
|---------|---------------|
| Qualquer um | Baixe a versão **LTS** em <https://nodejs.org/pt-br/download> e siga o instalador |
| Windows (terminal) | `winget install OpenJS.NodeJS.LTS` |
| macOS (Homebrew) | `brew install node` |
| Linux, ou quem prefere alternar versões | [nvm](https://github.com/nvm-sh/nvm) e depois `nvm install --lts` |

Feche e reabra o terminal depois de instalar, e confira de novo com
`node --version`. Qualquer versão LTS a partir da 18 serve.

> Se a máquina for corporativa e bloquear a instalação, avise o recrutador —
> a gente resolve.

### Subindo as duas versões

```bash
node server.js v1   # versão em produção  -> http://localhost:3001
node server.js v2   # release candidate   -> http://localhost:3002
```

As duas podem rodar ao mesmo tempo, em terminais separados. Cada processo tem os
próprios dados em memória: o que você faz numa porta não afeta a outra.

O cabeçalho da tela mostra qual versão está respondendo naquela aba.

## Dados

Os dados ficam em memória, com carga inicial fixa de **200 cotações** e
**60 faturas** (as cotações de 1 a 60 já nascem faturadas). Nada é gravado em
disco: reiniciar o processo volta ao estado inicial.

Para voltar à carga inicial sem reiniciar, use o botão **Resetar dados** na tela
ou `POST /_reset`.

---

## Regras de precificação

### Faixa de peso

O valor base sai da faixa de peso da cotação. Os limites são **inclusivos**: uma
cotação de exatamente 10 kg pertence à primeira faixa, uma de exatamente 50 kg à
segunda, e uma de exatamente 100 kg à terceira.

| Faixa de peso | Valor base |
|---|---|
| até 10 kg, inclusive | R$ 25,00 |
| acima de 10 kg e até 50 kg, inclusive | R$ 60,00 |
| acima de 50 kg e até 100 kg, inclusive | R$ 110,00 |
| acima de 100 kg | R$ 180,00 |

### Multiplicador de rota

O valor base é multiplicado por um fator que depende das UFs de origem e destino:

| Situação | Multiplicador |
|---|---|
| mesma UF | 1,0 |
| UFs diferentes da mesma região | 1,4 |
| UFs de regiões diferentes | 1,9 |

Regiões consideradas: **Sudeste** (SP, RJ, MG), **Sul** (PR, RS) e
**Nordeste** (BA).

### Imposto

Sobre o valor da rota incide imposto de **12%**.

### Valor final

```
valor da rota = valor base × multiplicador
valor final   = valor da rota × 1,12
```

O valor final é apresentado em reais com **duas casas decimais**, arredondado
pela regra comercial (a partir de cinco milésimos, arredonda para cima).

Exemplos conferidos com o comercial:

| Peso | Rota | Conta | Valor final |
|---|---|---|---|
| 10 kg | SP → SP | 25 × 1,0 × 1,12 | R$ 28,00 |
| 5 kg | SP → BA | 25 × 1,9 × 1,12 | R$ 53,20 |
| 50 kg | SP → BA | 60 × 1,9 × 1,12 | R$ 127,68 |
| 100 kg | SP → MG | 110 × 1,4 × 1,12 | R$ 172,48 |
| 150 kg | SP → MG | 180 × 1,4 × 1,12 | R$ 282,24 |

---

## Regras de faturamento

- Uma cotação só pode ser faturada **uma única vez**.
- A fatura é emitida pelo valor final vigente da cotação no momento da emissão.
- Uma segunda tentativa de faturar a mesma cotação deve ser recusada com
  status `409` e a mensagem `Cotação já faturada`.
- Faturar uma cotação inexistente deve responder `404`.

---

## Contrato da API

Todas as respostas são JSON com `charset=utf-8`.

### `GET /api/versao`

Informa qual versão está respondendo.

```json
{ "versao": "v1" }
```

### `GET /api/cotacoes`

Lista as cotações. Parâmetros opcionais de query:

| Parâmetro | Padrão | Descrição |
|---|---|---|
| `page` | `1` | página, começando em 1 |
| `limit` | `20` | quantidade de itens por página |
| `cliente` | — | filtra pelo nome exato do cliente |

Resposta `200`:

```json
{
  "total": 200,
  "itens": [
    {
      "id": 12,
      "cliente": "Comercial Aurora",
      "peso_kg": 40.6,
      "volumes": 13,
      "uf_origem": "SP",
      "uf_destino": "MG",
      "faturada": true,
      "valor_total": 94.08
    }
  ]
}
```

O campo `total` é a contagem de cotações que atendem ao filtro, não a quantidade
de itens da página.

### `GET /api/cotacoes/{id}`

Detalha uma cotação. Resposta `200`:

```json
{
  "id": 12,
  "cliente": "Comercial Aurora",
  "peso_kg": 40.6,
  "volumes": 13,
  "uf_origem": "SP",
  "uf_destino": "MG",
  "faturada": true,
  "criada_em": "2026-06-13",
  "valor_base": 60,
  "multiplicador": 1.4,
  "desconto": 0,
  "valor_total": 94.08
}
```

O campo `valor_total` é o mesmo apresentado na listagem para a mesma cotação.

Cotação inexistente responde `404` com `{ "erro": "Cotação não encontrada" }`.

### `POST /api/cotacoes`

Cria uma cotação. Corpo esperado:

```json
{
  "cliente": "Comercial Aurora",
  "peso_kg": 10,
  "volumes": 4,
  "uf_origem": "SP",
  "uf_destino": "RJ"
}
```

Os cinco campos são obrigatórios. `peso_kg` precisa ser positivo e `volumes` no
mínimo 1.

- `201` — devolve a cotação criada, no mesmo formato do detalhe.
- `422` — devolve `{ "erro": "..." }` descrevendo o problema de validação.

### `POST /api/cotacoes/{id}/faturar`

Emite a fatura da cotação.

- `201` — devolve a fatura emitida.
- `409` — `{ "erro": "Cotação já faturada" }`.
- `404` — `{ "erro": "Cotação não encontrada" }`.

Formato da fatura:

```json
{
  "id": 61,
  "id_cotacao": 61,
  "cliente": "Metalúrgica Vale",
  "valor": 127.68,
  "emitida_em": "2026-06-06"
}
```

### `GET /api/faturas`

Lista as faturas emitidas. Aceita o parâmetro opcional `id_cotacao` para filtrar
pelas faturas de uma cotação específica. Resposta `200` com um array de faturas.

### `POST /_reset`

Restaura a carga inicial de dados. Responde `200` com `{ "ok": true }`.

---

## Estrutura do projeto

```
server.js              roteamento HTTP e arquivos estáticos
src/store.js           estado em memória e restauração da carga inicial
src/seed.js            carga inicial de cotações e faturas
src/pricing/v1.js      motor de preço da versão em produção
src/pricing/v2.js      motor de preço do release candidate
src/cotacoes.js        criação, busca e listagem de cotações
src/faturas.js         emissão de faturas
public/                tela de operação
```
