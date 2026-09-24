# Changelog — versão 2.0

Release candidate preparado pelo time de desenvolvimento. Abaixo, o que mudou em
relação à versão que está em produção hoje.

**Responsável pelo build:** Time Plataforma
**Data de corte:** 2026-08-05
**Janela de subida prevista:** sexta-feira

---

## Novidades

### Desconto por volume

Implementada a política de desconto por quantidade de volumes descrita em
`SPEC-desconto-por-volume.md`, aprovada pela diretoria comercial. A cotação passa
a expor o percentual aplicado em campo próprio, e a tela de detalhe mostra o
percentual junto do valor final.

## Melhorias

### Ajustes de performance na listagem

A listagem de cotações passou a devolver um payload mais enxuto. Antes cada item
carregava a estrutura completa da cotação; agora traz apenas o que a tabela da
tela precisa exibir. Em bases grandes a resposta ficou sensivelmente menor.

### Melhorias no fluxo de faturamento

Pequenos ajustes na emissão de fatura para deixar o caminho de gravação mais
próximo do que será usado quando o armazenamento sair da memória.

---

## Sem alterações nesta versão

- Tela de operação (apenas o campo de desconto foi acrescentado ao detalhe).
- Formato das rotas de criação e de detalhe de cotação.
- Carga inicial de dados.
