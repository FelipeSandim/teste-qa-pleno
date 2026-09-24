let selecionada = null;

function moeda(valor) {
  if (valor === undefined || valor === null) return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function percentual(valor) {
  if (!valor) return '—';
  return `${(Number(valor) * 100).toFixed(0)}%`;
}

function valorExibido(item) {
  return item.valor_total ?? item.total;
}

async function carregar() {
  const versao = await (await fetch('/api/versao')).json();
  document.querySelector('#versao').textContent = versao.versao;

  const params = new URLSearchParams({ limit: 500 });
  const cliente = document.querySelector('#filtro-cliente').value;
  if (cliente) params.set('cliente', cliente);

  const dados = await (await fetch(`/api/cotacoes?${params}`)).json();
  renderizarTabela(dados.itens);
  document.querySelector('#contador').textContent = `${dados.total} cotações`;

  await carregarFaturas();
}

function renderizarTabela(itens) {
  const corpo = document.querySelector('#tabela tbody');
  corpo.innerHTML = '';
  for (const item of itens) {
    const linha = document.createElement('tr');
    linha.dataset.id = item.id;
    linha.innerHTML = `
      <td>${item.id}</td>
      <td>${item.cliente}</td>
      <td>${item.peso_kg}</td>
      <td>${item.volumes}</td>
      <td>${item.uf_origem} → ${item.uf_destino}</td>
      <td>${percentual(item.desconto)}</td>
      <td>${moeda(valorExibido(item))}</td>
      <td>${item.faturada ? 'sim' : 'não'}</td>`;
    linha.addEventListener('click', () => abrirDetalhe(item.id));
    corpo.appendChild(linha);
  }
}

async function abrirDetalhe(id) {
  const resposta = await fetch(`/api/cotacoes/${id}`);
  if (!resposta.ok) return;
  const c = await resposta.json();
  selecionada = c.id;

  document.querySelector('#detalhe').innerHTML = `
    <dl>
      <dt>ID</dt><dd>${c.id}</dd>
      <dt>Cliente</dt><dd>${c.cliente}</dd>
      <dt>Peso</dt><dd>${c.peso_kg} kg</dd>
      <dt>Volumes</dt><dd>${c.volumes}</dd>
      <dt>Rota</dt><dd>${c.uf_origem} → ${c.uf_destino}</dd>
      <dt>Valor base</dt><dd>${moeda(c.valor_base)}</dd>
      <dt>Multiplicador</dt><dd>${c.multiplicador}</dd>
      <dt>Desconto</dt><dd>${percentual(c.desconto)}</dd>
      <dt>Total</dt><dd class="destaque">${moeda(valorExibido(c))}</dd>
      <dt>Faturada</dt><dd>${c.faturada ? 'sim' : 'não'}</dd>
      <dt>Criada em</dt><dd>${c.criada_em}</dd>
    </dl>`;

  document.querySelector('#faturar').disabled = c.faturada;
  document.querySelector('#aviso').textContent = '';
}

async function carregarFaturas() {
  const faturas = await (await fetch('/api/faturas')).json();
  const lista = document.querySelector('#faturas');
  lista.innerHTML = '';
  for (const f of faturas.slice(-10).reverse()) {
    const li = document.createElement('li');
    li.textContent = `#${f.id} · cotação ${f.id_cotacao} · ${f.cliente} · ${moeda(f.valor)}`;
    lista.appendChild(li);
  }
}

document.querySelector('#faturar').addEventListener('click', async () => {
  if (!selecionada) return;
  const resposta = await fetch(`/api/cotacoes/${selecionada}/faturar`, { method: 'POST' });
  const corpo = await resposta.json();
  if (resposta.status !== 201) {
    document.querySelector('#aviso').textContent = corpo.erro || 'Não foi possível faturar.';
    return;
  }
  document.querySelector('#aviso').textContent = `Fatura #${corpo.id} emitida no valor de ${moeda(corpo.valor)}.`;
  await carregar();
  await abrirDetalhe(selecionada);
});

document.querySelector('#form-cotacao').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const dados = Object.fromEntries(new FormData(evento.target).entries());
  const resposta = await fetch('/api/cotacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const corpo = await resposta.json();
  if (resposta.status !== 201) {
    document.querySelector('#aviso-form').textContent = corpo.erro || 'Não foi possível criar a cotação.';
    return;
  }
  document.querySelector('#aviso-form').textContent = `Cotação #${corpo.id} criada.`;
  await carregar();
  await abrirDetalhe(corpo.id);
});

document.querySelector('#filtro-cliente').addEventListener('change', carregar);

document.querySelector('#resetar').addEventListener('click', async () => {
  await fetch('/_reset', { method: 'POST' });
  selecionada = null;
  document.querySelector('#detalhe').innerHTML = '<p class="vazio">Selecione uma cotação na tabela.</p>';
  document.querySelector('#faturar').disabled = true;
  document.querySelector('#aviso').textContent = '';
  document.querySelector('#aviso-form').textContent = '';
  await carregar();
});

carregar();
