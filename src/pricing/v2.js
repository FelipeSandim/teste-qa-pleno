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

function descontoPorVolume(volumes) {
  const qtd = Number(volumes);
  if (qtd > 50) return 0.15;
  if (qtd > 20) return 0.10;
  if (qtd > 10) return 0.05;
  return 0;
}

function precificar(cotacao) {
  const faixa = FAIXAS.find((f) => Number(cotacao.peso_kg) < f.ate);
  const multiplicador = multiplicadorRota(cotacao.uf_origem, cotacao.uf_destino);
  const desconto = descontoPorVolume(cotacao.volumes);

  const valorRota = faixa.preco * multiplicador;
  const comDesconto = Math.trunc(valorRota * (1 - desconto) * 100) / 100;
  const comImposto = comDesconto * (1 + IMPOSTO);

  return {
    valor_base: faixa.preco,
    multiplicador,
    desconto,
    valor_total: Math.trunc(comImposto * 100) / 100,
  };
}

module.exports = { precificar, descontoPorVolume, multiplicadorRota, FAIXAS, IMPOSTO };
