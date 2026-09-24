const CLIENTES = ['Comercial Aurora', 'Metalúrgica Vale', 'Distribuidora Sul',
  'Atacado Primavera', 'Indústria Horizonte', 'Rede Bom Preço'];
const UFS = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA'];
const PESOS_LIMITE = [10, 50, 100];

function seedCotacoes() {
  const cotacoes = [];
  for (let i = 1; i <= 200; i++) {
    const peso = i % 11 === 0 ? PESOS_LIMITE[i % 3] : Number(((i * 3.3) % 140 + 1).toFixed(2));
    const volumes = i % 7 === 0 ? 10 : (i % 23) + 1;
    const dia = String((i % 28) + 1).padStart(2, '0');
    cotacoes.push({
      id: i,
      cliente: CLIENTES[i % CLIENTES.length],
      peso_kg: peso,
      volumes,
      uf_origem: UFS[i % UFS.length],
      uf_destino: UFS[(i + 2) % UFS.length],
      faturada: i <= 60,
      criada_em: `2026-06-${dia}`,
    });
  }
  return cotacoes;
}

function seedFaturas() {
  return seedCotacoes()
    .filter((c) => c.faturada)
    .map((c, indice) => ({
      id: indice + 1,
      id_cotacao: c.id,
      cliente: c.cliente,
      emitida_em: c.criada_em,
    }));
}

module.exports = { seedCotacoes, seedFaturas };
