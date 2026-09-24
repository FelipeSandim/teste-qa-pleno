// Compara o release candidate (v2, porta 3002) com a produção (v1, porta 3001).
// Sobe e derruba os dois processos. Sai com código 1 se algum cenário falhar.
//
//   node regressao/suite.js

const { spawn } = require('node:child_process');
const path = require('node:path');
const { preco, reais } = require('./esperado.js');

const ROOT = path.join(__dirname, '..');
const V1 = 'http://127.0.0.1:3001';
const V2 = 'http://127.0.0.1:3002';

const filhos = [];
const resultados = [];

function registrar(nome, ok, detalhe = '') {
  resultados.push({ nome, ok });
  console.log(`[${ok ? 'pass' : 'FAIL'}] ${nome}`);
  if (detalhe) {
    console.log(detalhe.split('\n').map((linha) => `       ${linha}`).join('\n'));
  }
}

function subir(versao) {
  const filho = spawn(process.execPath, ['server.js', versao], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  filho.stdout.on('data', (parte) => { log += parte; });
  filho.stderr.on('data', (parte) => { log += parte; });
  filho.obterLog = () => log;
  filhos.push(filho);
  return filho;
}

function derrubar() {
  for (const filho of filhos) {
    if (!filho.killed) filho.kill('SIGTERM');
  }
}

async function esperar(url) {
  const limite = Date.now() + 8000;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(url);
      if (resposta.ok) return;
    } catch { /* ainda subindo */ }
    await new Promise((resolver) => setTimeout(resolver, 40));
  }
  throw new Error(`servidor não respondeu em ${url}`);
}

async function api(base, caminho, opcoes = {}) {
  const resposta = await fetch(base + caminho, opcoes);
  const texto = await resposta.text();
  let corpo = null;
  if (texto) corpo = JSON.parse(texto);
  return { status: resposta.status, corpo };
}

async function reset() {
  await api(V1, '/_reset', { method: 'POST' });
  await api(V2, '/_reset', { method: 'POST' });
}

function criar(base, cotacao) {
  return api(base, '/api/cotacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente: 'Comercial Aurora',
      ...cotacao,
    }),
  });
}

async function emLotes(itens, tamanho, fn) {
  const saida = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    const lote = itens.slice(i, i + tamanho);
    saida.push(...await Promise.all(lote.map(fn)));
  }
  return saida;
}

function soma(valores) {
  return (valores.reduce((total, valor) => total + valor, 0) / 100).toFixed(2);
}

async function detalhes(base) {
  const lista = await api(base, '/api/cotacoes?limit=500');
  const itens = await emLotes(lista.corpo.itens, 25, (item) => api(base, `/api/cotacoes/${item.id}`));
  return { lista: lista.corpo, itens: itens.map((item) => item.corpo) };
}

async function cenarioVersoes() {
  const v1 = await api(V1, '/api/versao');
  const v2 = await api(V2, '/api/versao');
  registrar(
    'as portas anunciam v1 e v2',
    v1.corpo.versao === 'v1' && v2.corpo.versao === 'v2',
    `v1=${v1.corpo.versao} v2=${v2.corpo.versao}`,
  );
}

async function cenarioExemplosReadme() {
  const exemplos = [
    { peso_kg: 10, volumes: 1, uf_origem: 'SP', uf_destino: 'SP', rotulo: '10 kg SP→SP' },
    { peso_kg: 5, volumes: 1, uf_origem: 'SP', uf_destino: 'BA', rotulo: '5 kg SP→BA' },
    { peso_kg: 50, volumes: 1, uf_origem: 'SP', uf_destino: 'BA', rotulo: '50 kg SP→BA' },
    { peso_kg: 100, volumes: 1, uf_origem: 'SP', uf_destino: 'MG', rotulo: '100 kg SP→MG' },
    { peso_kg: 150, volumes: 1, uf_origem: 'SP', uf_destino: 'MG', rotulo: '150 kg SP→MG' },
    { peso_kg: 9.99, volumes: 1, uf_origem: 'SP', uf_destino: 'SP', rotulo: '9,99 kg ainda na 1ª faixa' },
    { peso_kg: 10.01, volumes: 1, uf_origem: 'SP', uf_destino: 'SP', rotulo: '10,01 kg na 2ª faixa' },
    { peso_kg: 50.01, volumes: 1, uf_origem: 'SP', uf_destino: 'SP', rotulo: '50,01 kg na 3ª faixa' },
    { peso_kg: 100.01, volumes: 1, uf_origem: 'SP', uf_destino: 'SP', rotulo: '100,01 kg na 4ª faixa' },
  ];

  for (const exemplo of exemplos) {
    await reset();
    const esperado = preco(exemplo);
    const v1 = await criar(V1, exemplo);
    const v2 = await criar(V2, exemplo);
    const ok = v1.corpo.valor_total === esperado.valor_total
      && v1.corpo.valor_base === esperado.valor_base
      && v2.corpo.valor_total === esperado.valor_total
      && v2.corpo.valor_base === esperado.valor_base;
    registrar(
      `README ${exemplo.rotulo} = R$ ${reais(esperado.valor_total)} nas duas versões`,
      ok,
      `esperado base ${esperado.valor_base} total ${reais(esperado.valor_total)} | v1 base ${v1.corpo.valor_base} total ${reais(v1.corpo.valor_total)} | v2 base ${v2.corpo.valor_base} total ${reais(v2.corpo.valor_total)}`,
    );
  }
}

async function cenarioRotas() {
  const rotas = [
    { uf_origem: 'SP', uf_destino: 'SP', multiplicador: 1, total: 28 },
    { uf_origem: 'SP', uf_destino: 'RJ', multiplicador: 1.4, total: 39.2 },
    { uf_origem: 'PR', uf_destino: 'RS', multiplicador: 1.4, total: 39.2 },
    { uf_origem: 'SP', uf_destino: 'PR', multiplicador: 1.9, total: 53.2 },
    { uf_origem: 'BA', uf_destino: 'RS', multiplicador: 1.9, total: 53.2 },
  ];
  for (const rota of rotas) {
    await reset();
    const corpo = { peso_kg: 5, volumes: 1, ...rota };
    const v1 = await criar(V1, corpo);
    const v2 = await criar(V2, corpo);
    const ok = v1.corpo.multiplicador === rota.multiplicador
      && v2.corpo.multiplicador === rota.multiplicador
      && v1.corpo.valor_total === rota.total
      && v2.corpo.valor_total === rota.total;
    registrar(
      `rota ${rota.uf_origem}→${rota.uf_destino} multiplicador ${rota.multiplicador}`,
      ok,
      `v1 mult ${v1.corpo.multiplicador} total ${reais(v1.corpo.valor_total)} | v2 mult ${v2.corpo.multiplicador} total ${reais(v2.corpo.valor_total)}`,
    );
  }
}

async function cenarioDesconto() {
  // 5 kg SP→SP parte de R$ 28,00. Critérios de aceite e as bordas da tabela.
  const casos = [
    { volumes: 3, desconto: 0, total: 28, aceite: 'critério 4' },
    { volumes: 9, desconto: 0, total: 28, aceite: 'abaixo de 10' },
    { volumes: 15, desconto: 0.05, total: 26.6, aceite: 'critério 1' },
    { volumes: 19, desconto: 0.05, total: 26.6, aceite: 'teto da faixa de 5%' },
    { volumes: 20, desconto: 0.1, total: 25.2, aceite: 'piso da faixa de 10%' },
    { volumes: 30, desconto: 0.1, total: 25.2, aceite: 'critério 2' },
    { volumes: 49, desconto: 0.1, total: 25.2, aceite: 'teto da faixa de 10%' },
    { volumes: 50, desconto: 0.15, total: 23.8, aceite: 'piso da faixa de 15%' },
    { volumes: 80, desconto: 0.15, total: 23.8, aceite: 'critério 3' },
  ];

  for (const caso of casos) {
    await reset();
    const corpo = { peso_kg: 5, volumes: caso.volumes, uf_origem: 'SP', uf_destino: 'SP' };
    const v1 = await criar(V1, corpo);
    const v2 = await criar(V2, corpo);
    const v1ok = v1.corpo.desconto === 0 && v1.corpo.valor_total === 28;
    const v2ok = v2.corpo.desconto === caso.desconto && v2.corpo.valor_total === caso.total;
    registrar(
      `desconto ${caso.volumes} volumes (${caso.aceite})`,
      v1ok && v2ok,
      `v1 desconto ${v1.corpo.desconto} total ${reais(v1.corpo.valor_total)} | v2 desconto ${v2.corpo.desconto} total ${reais(v2.corpo.valor_total)} | esperado v2 desconto ${caso.desconto} total ${reais(caso.total)}`,
    );
  }

  await reset();
  const dez = await criar(V2, { peso_kg: 5, volumes: 10, uf_origem: 'SP', uf_destino: 'SP' });
  registrar(
    'volume 10 fica de fora do veredito (tabela diz 5%, texto diz "acima de 10")',
    true,
    `v2 devolveu desconto ${dez.corpo.desconto} e total ${reais(dez.corpo.valor_total)}. Ver PERGUNTAS_AO_PO.md.`,
  );
}

async function cenarioOrdemDoDesconto() {
  await reset();
  // 25 × 1,9 × 1,12 = 53,20; 5% depois do imposto = 50,54.
  const corpo = { peso_kg: 5, volumes: 15, uf_origem: 'SP', uf_destino: 'BA' };
  const esperado = preco(corpo, { desconto: true });
  const v2 = await criar(V2, corpo);
  registrar(
    'desconto de 5% incide depois do imposto (5 kg, 15 vol, SP→BA = R$ 50,54)',
    v2.corpo.valor_total === esperado.valor_total && v2.corpo.desconto === 0.05,
    `esperado ${reais(esperado.valor_total)} | v2 ${reais(v2.corpo.valor_total)} desconto ${v2.corpo.desconto}`,
  );
}

async function cenarioCargaInicial() {
  await reset();
  const [d1, d2] = await Promise.all([detalhes(V1), detalhes(V2)]);
  const porId = new Map(d2.itens.map((item) => [item.id, item]));

  const v1Errado = d1.itens.filter((item) => {
    const esperado = preco(item);
    return item.valor_base !== esperado.valor_base || item.valor_total !== esperado.valor_total || item.desconto !== 0;
  });
  registrar(
    'carga inicial da v1 bate com a tabela de peso, a rota e o imposto',
    v1Errado.length === 0,
    v1Errado.length ? `${v1Errado.length} cotações fora do README. Ex.: #${v1Errado[0].id}` : '200/200',
  );

  const faixaErrada = d2.itens.filter((item) => item.valor_base !== preco(item).valor_base);
  const deltaDe = (lista) => soma(lista.map((item) => {
    const producao = d1.itens.find((cotacao) => cotacao.id === item.id);
    return Math.round((item.valor_total - producao.valor_total) * 100);
  }));
  const faixaFaturada = faixaErrada.filter((item) => item.faturada);
  const faixaAberta = faixaErrada.filter((item) => !item.faturada);
  registrar(
    'carga inicial da v2 mantém a faixa de peso inclusiva',
    faixaErrada.length === 0,
    `${faixaErrada.length}/200 com a faixa seguinte. Soma (v2 − v1) = R$ ${deltaDe(faixaErrada)} `
    + `(${faixaFaturada.length} já faturadas, R$ ${deltaDe(faixaFaturada)}; `
    + `${faixaAberta.length} em aberto, R$ ${deltaDe(faixaAberta)}). `
    + `ids: ${faixaErrada.map((item) => item.id).join(', ')}`,
  );

  const limiarErrado = d2.itens.filter((item) => {
    if (Number(item.volumes) === 10) return false;
    return item.desconto !== preco(item, { desconto: true }).desconto;
  });
  const deltaLimiar = limiarErrado
    .filter((item) => item.valor_base === preco(item).valor_base)
    .map((item) => Math.round((item.valor_total - preco(item, { desconto: true }).valor_total) * 100));
  registrar(
    'carga inicial da v2 aplica o percentual da tabela (exceto volume 10)',
    limiarErrado.length === 0,
    `${limiarErrado.length} cotações com 20 volumes recebem 5% em vez de 10%. `
    + `Nas ${deltaLimiar.length} em que a faixa de peso está certa, a soma (v2 − tabela) = R$ ${soma(deltaLimiar)}. `
    + limiarErrado.map((item) => `#${item.id}${item.faturada ? ' faturada' : ''}`).join(', '),
  );

  const centavosErrados = d2.itens.filter((item) => {
    if (Number(item.volumes) === 10) return false;
    const esperado = preco(item, { desconto: true });
    return item.valor_base === esperado.valor_base
      && item.desconto === esperado.desconto
      && item.valor_total !== esperado.valor_total;
  });
  const deltaCentavos = centavosErrados.map((item) => Math.round((item.valor_total - preco(item, { desconto: true }).valor_total) * 100));
  registrar(
    'carga inicial da v2 arredonda o valor final como a v1',
    centavosErrados.length === 0,
    `${centavosErrados.length} cotações com faixa e percentual certos e valor diferente. Soma (v2 − esperado) = R$ ${soma(deltaCentavos)}.`,
  );

  const faturadas = d1.itens.filter((item) => item.faturada);
  const recalculadas = faturadas.filter((item) => porId.get(item.id).valor_total !== item.valor_total);
  const deltaRecalculo = recalculadas.map((item) => Math.round((porId.get(item.id).valor_total - item.valor_total) * 100));
  registrar(
    'cotações já faturadas mantêm na v2 o valor cobrado na v1',
    recalculadas.length === 0,
    `${recalculadas.length}/${faturadas.length} mudaram de valor. Soma (v2 − v1) = R$ ${soma(deltaRecalculo)}.`,
  );

  const semCampo = d2.lista.itens.filter((item) => item.valor_total === undefined);
  const listaDiverge = [];
  for (const item of d2.lista.itens) {
    const detalhe = porId.get(item.id);
    const mostrado = item.valor_total ?? item.total;
    if (mostrado !== detalhe.valor_total) listaDiverge.push(Math.round((mostrado - detalhe.valor_total) * 100));
  }
  registrar(
    'listagem da v2 traz valor_total igual ao detalhe',
    semCampo.length === 0 && listaDiverge.length === 0,
    `${semCampo.length}/200 sem o campo valor_total. ${listaDiverge.length}/200 com o preço da lista diferente do detalhe. Soma (lista − detalhe) = R$ ${soma(listaDiverge)}.`,
  );
}

async function cenarioFaturasSemValor() {
  await reset();
  const faturas = await api(V2, '/api/faturas');
  const semValor = faturas.corpo.filter((fatura) => fatura.valor === undefined);
  registrar(
    'as 60 faturas da carga inicial trazem o valor cobrado',
    semValor.length === 0 && faturas.corpo.length === 60,
    `${faturas.corpo.length} faturas, ${semValor.length} sem campo valor. Primeira: ${JSON.stringify(faturas.corpo[0])}`,
  );
}

async function cenarioFaturarUmaVez() {
  await reset();
  for (const [base, nome] of [[V1, 'v1'], [V2, 'v2']]) {
    const criada = await criar(base, { peso_kg: 5, volumes: 1, uf_origem: 'SP', uf_destino: 'SP' });
    const primeira = await api(base, `/api/cotacoes/${criada.corpo.id}/faturar`, { method: 'POST' });
    const segunda = await api(base, `/api/cotacoes/${criada.corpo.id}/faturar`, { method: 'POST' });
    const lista = await api(base, `/api/faturas?id_cotacao=${criada.corpo.id}`);
    const ok = primeira.status === 201
      && primeira.corpo.valor === 28
      && segunda.status === 409
      && segunda.corpo.erro === 'Cotação já faturada'
      && lista.corpo.length === 1;
    registrar(
      `${nome} fatura uma vez a R$ 28,00 e recusa a segunda com 409`,
      ok,
      `1ª HTTP ${primeira.status} valor ${primeira.corpo.valor} | 2ª HTTP ${segunda.status} ${JSON.stringify(segunda.corpo)} | faturas ${lista.corpo.length}`,
    );
  }

  const ausente = await api(V1, '/api/cotacoes/99999/faturar', { method: 'POST' });
  registrar(
    'faturar cotação inexistente responde 404',
    ausente.status === 404 && ausente.corpo.erro === 'Cotação não encontrada',
    `HTTP ${ausente.status} ${JSON.stringify(ausente.corpo)}`,
  );

  const jaFaturada = await api(V2, '/api/cotacoes/1/faturar', { method: 'POST' });
  registrar(
    'cotação 1, já faturada na carga, responde 409',
    jaFaturada.status === 409,
    `HTTP ${jaFaturada.status} ${JSON.stringify(jaFaturada.corpo)}`,
  );
}

async function cenarioCorrida() {
  for (const [base, nome] of [[V1, 'v1'], [V2, 'v2']]) {
    await reset();
    const [a, b] = await Promise.all([
      api(base, '/api/cotacoes/70/faturar', { method: 'POST' }),
      api(base, '/api/cotacoes/70/faturar', { method: 'POST' }),
    ]);
    const faturas = await api(base, '/api/faturas?id_cotacao=70');
    const statuses = [a.status, b.status].sort();
    const ok = statuses[0] === 201 && statuses[1] === 409 && faturas.corpo.length === 1;
    const cobrado = faturas.corpo.reduce((total, fatura) => total + Number(fatura.valor || 0), 0);
    registrar(
      `${nome} dois faturamentos simultâneos da cotação 70 geram uma única fatura`,
      ok,
      `HTTP ${a.status} e ${b.status}. Faturas: ${faturas.corpo.length}. Soma cobrada: R$ ${reais(cobrado)}. ${JSON.stringify(faturas.corpo)}`,
    );
  }
}

async function cenarioContrato() {
  await reset();
  const incompleto = await api(V1, '/api/cotacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cliente: 'Comercial Aurora' }),
  });
  const pesoZero = await api(V2, '/api/cotacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cliente: 'Comercial Aurora', peso_kg: 0, volumes: 1, uf_origem: 'SP', uf_destino: 'RJ' }),
  });
  registrar(
    'criação sem campos obrigatórios ou com peso zero responde 422',
    incompleto.status === 422 && pesoZero.status === 422,
    `incompleto HTTP ${incompleto.status} ${JSON.stringify(incompleto.corpo)} | peso 0 HTTP ${pesoZero.status} ${JSON.stringify(pesoZero.corpo)}`,
  );

  const filtro = await api(V1, '/api/cotacoes?cliente=Metal%C3%BArgica%20Vale&limit=500');
  const nomes = filtro.corpo.itens.every((item) => item.cliente === 'Metalúrgica Vale');
  registrar(
    'filtro por cliente usa o total da consulta, não o tamanho da página',
    filtro.corpo.total === 34 && filtro.corpo.itens.length === 34 && nomes,
    `total ${filtro.corpo.total} itens ${filtro.corpo.itens.length}`,
  );
}

async function main() {
  const v1 = subir('v1');
  const v2 = subir('v2');
  try {
    await Promise.all([esperar(`${V1}/api/versao`), esperar(`${V2}/api/versao`)]);
    await cenarioVersoes();
    await cenarioExemplosReadme();
    await cenarioRotas();
    await cenarioDesconto();
    await cenarioOrdemDoDesconto();
    await cenarioCargaInicial();
    await cenarioFaturasSemValor();
    await cenarioFaturarUmaVez();
    await cenarioCorrida();
    await cenarioContrato();
  } catch (erro) {
    console.error(erro);
    console.error('log v1:', v1.obterLog());
    console.error('log v2:', v2.obterLog());
    process.exitCode = 1;
  } finally {
    derrubar();
  }

  const falhas = resultados.filter((item) => !item.ok).length;
  console.log('');
  console.log(`${resultados.length - falhas} passaram, ${falhas} falharam`);
  if (falhas > 0) process.exitCode = 1;
}

process.on('SIGINT', () => { derrubar(); process.exit(1); });
main();
