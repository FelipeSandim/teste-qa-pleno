const { store } = require('./store.js');

function listar({ id_cotacao } = {}) {
  if (id_cotacao === undefined) return store.faturas;
  return store.faturas.filter((f) => f.id_cotacao === Number(id_cotacao));
}

async function faturar(idCotacao, motor) {
  const cotacao = store.cotacoes.find((c) => c.id === Number(idCotacao));
  if (!cotacao) return { status: 404, corpo: { erro: 'Cotação não encontrada' } };
  if (cotacao.faturada) return { status: 409, corpo: { erro: 'Cotação já faturada' } };

  const { valor_total } = motor.precificar(cotacao);
  await new Promise((resolve) => setTimeout(resolve, 15));

  const fatura = {
    id: store.faturas.length + 1,
    id_cotacao: cotacao.id,
    cliente: cotacao.cliente,
    valor: valor_total,
    emitida_em: new Date().toISOString().slice(0, 10),
  };
  store.faturas.push(fatura);
  cotacao.faturada = true;

  return { status: 201, corpo: fatura };
}

module.exports = { faturar, listar };
