// Oracle das regras do README (v1) e da tabela da SPEC (desconto da v2).
// Conta em centavos inteiros para não herdar o erro de ponto flutuante da v2.

const FAIXAS = [
  { ate: 10, preco: 25 },
  { ate: 50, preco: 60 },
  { ate: 100, preco: 110 },
  { ate: Infinity, preco: 180 },
];

const REGIOES = {
  SP: 'sudeste', RJ: 'sudeste', MG: 'sudeste',
  PR: 'sul', RS: 'sul', BA: 'nordeste',
};

function multiplicador(origem, destino) {
  if (origem === destino) return 1;
  if (REGIOES[origem] && REGIOES[origem] === REGIOES[destino]) return 1.4;
  return 1.9;
}

function centavosDaRota(pesoKg, origem, destino) {
  const peso = Number(pesoKg);
  const faixa = FAIXAS.find((item) => peso <= item.ate);
  const fator = multiplicador(origem, destino);
  let centavos;
  if (fator === 1) centavos = faixa.preco * 112;
  else if (fator === 1.4) centavos = (faixa.preco * 14 * 112) / 10;
  else centavos = (faixa.preco * 19 * 112) / 10;
  return { centavos, valor_base: faixa.preco, multiplicador: fator };
}

// Tabela da SPEC: 10–19 = 5%, 20–49 = 10%, 50+ = 15%.
// O volume 10 também aparece como "acima de 10" no texto da spec;
// a suíte não usa esta função para julgar exatamente 10 volumes.
function percentualTabela(volumes) {
  const qtd = Number(volumes);
  if (qtd >= 50) return 15;
  if (qtd >= 20) return 10;
  if (qtd >= 10) return 5;
  return 0;
}

function comDesconto(centavos, percentual) {
  if (!percentual) return centavos;
  return Math.round((centavos * (100 - percentual)) / 100);
}

function preco(cotacao, { desconto = false } = {}) {
  const rota = centavosDaRota(cotacao.peso_kg, cotacao.uf_origem, cotacao.uf_destino);
  const percentual = desconto ? percentualTabela(cotacao.volumes) : 0;
  return {
    valor_base: rota.valor_base,
    multiplicador: rota.multiplicador,
    desconto: percentual / 100,
    valor_total: comDesconto(rota.centavos, percentual) / 100,
  };
}

function reais(valor) {
  return (Math.round(Number(valor) * 100) / 100).toFixed(2);
}

module.exports = { preco, percentualTabela, reais };
