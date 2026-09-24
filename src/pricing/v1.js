const FAIXAS = [
  { ate: 10, preco: 25 },
  { ate: 50, preco: 60 },
  { ate: 100, preco: 110 },
  { ate: Infinity, preco: 180 },
];

const REGIOES = { SP: 'sudeste', RJ: 'sudeste', MG: 'sudeste', PR: 'sul', RS: 'sul', BA: 'nordeste' };
const IMPOSTO = 0.12;

function multiplicadorRota(origem, destino) {
  if (origem === destino) return 1;
  if (REGIOES[origem] && REGIOES[origem] === REGIOES[destino]) return 1.4;
  return 1.9;
}

function precificar(cotacao) {
  const faixa = FAIXAS.find((f) => Number(cotacao.peso_kg) <= f.ate);
  const multiplicador = multiplicadorRota(cotacao.uf_origem, cotacao.uf_destino);
  const valorRota = faixa.preco * multiplicador;
  const comImposto = valorRota * (1 + IMPOSTO);
  return {
    valor_base: faixa.preco,
    multiplicador,
    desconto: 0,
    valor_total: Math.round(comImposto * 100) / 100,
  };
}

module.exports = { precificar, multiplicadorRota, FAIXAS, IMPOSTO };
