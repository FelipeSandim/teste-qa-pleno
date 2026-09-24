const { seedCotacoes, seedFaturas } = require('./seed.js');

const store = {
  cotacoes: seedCotacoes(),
  faturas: seedFaturas(),
};

function reset() {
  store.cotacoes = seedCotacoes();
  store.faturas = seedFaturas();
}

module.exports = { store, reset };
