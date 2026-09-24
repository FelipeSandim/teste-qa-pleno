# Desafio técnico — QA Pleno

## A situação

A **v2 do Cotação & Faturamento está agendada para produção na sexta-feira.**

O time de desenvolvimento entregou o release candidate e o changelog. O produto
aprovou a especificação da feature nova. A operação já foi avisada da data.

Falta uma coisa: alguém validar se a v2 pode subir.

**Esse alguém é você. Sua análise decide se ela vai.**

Este é um sistema financeiro: cada cotação vira uma fatura, e cada fatura vira
cobrança de cliente. Erro de preço aqui não é incômodo de usuário — é dinheiro
cobrado a mais ou a menos, em cima de uma base de clientes inteira.

## O que você tem em mãos

| Arquivo | O que é |
|---|---|
| `README.md` | As regras vigentes e o contrato da API como estão hoje em produção |
| `SPEC-desconto-por-volume.md` | A especificação da feature nova da v2, aprovada pelo produto |
| `CHANGELOG-v2.md` | O que o time de desenvolvimento diz que mudou |

E as duas versões, rodáveis lado a lado:

```bash
node server.js v1   # produção hoje    -> http://localhost:3001
node server.js v2   # release candidate -> http://localhost:3002
```

Node 18 ou superior. Nenhuma dependência para instalar.

## O que entregar

Preencha os arquivos que já estão no repositório:

| Arquivo | O que se espera |
|---|---|
| `ESTRATEGIA.md` | Sua análise de risco, sua priorização e **o que você decidiu não testar, com justificativa** |
| `MATRIZ_COBERTURA.md` | Risco × cobertura: o que foi coberto, como, e o que ficou descoberto |
| `bugs/` | Um arquivo por problema encontrado, no formato de `bugs/_TEMPLATE.md` |
| `regressao/` | Uma suíte automatizada que compare a v1 e a v2 |
| `PERGUNTAS_AO_PO.md` | O que você precisou perguntar antes de assumir comportamento |
| `RELEASE_DECISION.md` | Seu go/no-go, justificado |

### Sobre a suíte de regressão

Ferramenta livre. Pode ser o runner nativo do Node, pode ser qualquer framework
que você domine, pode ser shell script. Duas exigências:

1. **Roda com um comando**, documentado em `regressao/README.md`.
2. Se precisar de instalação, o `regressao/README.md` explica como.

O que avaliamos não é a ferramenta: é a escolha dos cenários, a legibilidade e se
a suíte de fato pega o que se propõe a pegar.

### Sobre os problemas encontrados

Para cada um, queremos **impacto quantificado**. Não basta dizer "afeta o cálculo
de frete". Quantas cotações da carga inicial são afetadas? A API responde isso —
consulte e mostre o número.

### Sobre ambiguidade

Se algo no enunciado, no changelog ou na especificação estiver ambíguo, **não
adivinhe em silêncio**. Registre a dúvida em `PERGUNTAS_AO_PO.md`. Decidir sob
incerteza também é avaliado, e a decisão certa nem sempre é escolher um lado.

## Prazo e forma de entrega

- **Prazo: 5 dias corridos** a partir do recebimento.
- Repositório **público** no GitHub, sem o nome da empresa em lugar nenhum.
- **Commits incrementais.** Queremos ver seu raciocínio em etapas, não um commit
  único no último dia.
- No envio ao recrutador: nome completo, link do repositório e LinkedIn.

## Como avaliamos

| Eixo | O que olhamos |
|---|---|
| Estratégia e priorização | Você atacou primeiro o que dava mais prejuízo? |
| Cobertura | Quanto do risco real sua análise alcançou |
| Qualidade do report | Reprodutível por outra pessoa, com impacto medido |
| Suíte de regressão | Roda, compara as duas versões e é legível |
| Decisão de release | Go/no-go coerente com o que você mesmo encontrou |
| Comunicação | Clareza para quem vai ler e decidir junto |
| Higiene de engenharia | Commits, organização, instruções de execução |

Não existe pontuação por quantidade de problemas encontrados. Um relatório com
três problemas bem investigados, medidos e priorizados vale mais do que uma lista
de quinze itens rasos.
