const { store } = require('./store.js');

function comValores(cotacao, motor) {
  return { ...cotacao, ...motor.precificar(cotacao) };
}

function buscar(id, motor) {
  const cotacao = store.cotacoes.find((c) => c.id === Number(id));
  return cotacao ? comValores(cotacao, motor) : null;
}

function itemDeLista(cotacao, motor, versao) {
  const valores = motor.precificar(cotacao);
  if (versao === 'v2') {
    const semDesconto = motor.precificar({ ...cotacao, volumes: 1 });
    return {
      id: cotacao.id, cliente: cotacao.cliente, peso_kg: cotacao.peso_kg,
      volumes: cotacao.volumes, uf_origem: cotacao.uf_origem, uf_destino: cotacao.uf_destino,
      faturada: cotacao.faturada, total: semDesconto.valor_total,
    };
  }
  return {
    id: cotacao.id, cliente: cotacao.cliente, peso_kg: cotacao.peso_kg,
    volumes: cotacao.volumes, uf_origem: cotacao.uf_origem, uf_destino: cotacao.uf_destino,
    faturada: cotacao.faturada, valor_total: valores.valor_total,
  };
}

function listar({ page = 1, limit = 20, cliente } = {}, motor, versao = 'v1') {
  let itens = store.cotacoes;
  if (cliente) itens = itens.filter((c) => c.cliente === cliente);
  const inicio = (Number(page) - 1) * Number(limit);
  return {
    total: itens.length,
    itens: itens.slice(inicio, inicio + Number(limit)).map((c) => itemDeLista(c, motor, versao)),
  };
}

function criar(dados, motor) {
  const obrigatorios = ['cliente', 'peso_kg', 'volumes', 'uf_origem', 'uf_destino'];
  const faltando = obrigatorios.filter((campo) => dados[campo] === undefined || dados[campo] === '');
  if (faltando.length > 0) {
    return { status: 422, corpo: { erro: `Campos obrigatórios ausentes: ${faltando.join(', ')}` } };
  }
  if (Number(dados.peso_kg) <= 0 || Number(dados.volumes) < 1) {
    return { status: 422, corpo: { erro: 'Peso deve ser positivo e volumes no mínimo 1' } };
  }

  const cotacao = {
    id: store.cotacoes.length + 1,
    cliente: dados.cliente,
    peso_kg: Number(dados.peso_kg),
    volumes: Number(dados.volumes),
    uf_origem: dados.uf_origem,
    uf_destino: dados.uf_destino,
    faturada: false,
    criada_em: new Date().toISOString().slice(0, 10),
  };
  store.cotacoes.push(cotacao);
  return { status: 201, corpo: comValores(cotacao, motor) };
}

module.exports = { criar, buscar, listar };
