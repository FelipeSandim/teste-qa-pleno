const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { reset } = require('./src/store.js');
const { criar, buscar, listar } = require('./src/cotacoes.js');
const { faturar, listar: listarFaturas } = require('./src/faturas.js');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (parte) => { dados += parte; });
    req.on('end', () => {
      try { resolve(dados ? JSON.parse(dados) : {}); } catch { resolve({}); }
    });
  });
}

function servirEstatico(res, url) {
  const arquivo = url === '/' ? '/index.html' : url;
  const destino = path.join(__dirname, 'public', arquivo);
  if (!destino.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(destino)) {
    res.writeHead(404); res.end('Não encontrado'); return;
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(destino)] || 'text/plain' });
  res.end(fs.readFileSync(destino));
}

async function rotear(req, res, versao) {
  const url = new URL(req.url, 'http://localhost');
  const rota = url.pathname;

  const motor = require(`./src/pricing/${versao}.js`);

  if (req.method === 'GET' && rota === '/api/versao') return json(res, 200, { versao });
  if (req.method === 'POST' && rota === '/_reset') { reset(); return json(res, 200, { ok: true }); }

  if (req.method === 'GET' && rota === '/api/cotacoes') {
    return json(res, 200, listar({
      page: url.searchParams.get('page') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cliente: url.searchParams.get('cliente') ?? undefined,
    }, motor, versao));
  }

  if (req.method === 'POST' && rota === '/api/cotacoes') {
    const corpo = await lerCorpo(req);
    const resultado = criar(corpo, motor);
    return json(res, resultado.status, resultado.corpo);
  }

  const faturarRota = rota.match(/^\/api\/cotacoes\/(\d+)\/faturar$/);
  if (req.method === 'POST' && faturarRota) {
    const resultado = await faturar(faturarRota[1], motor);
    return json(res, resultado.status, resultado.corpo);
  }

  if (req.method === 'GET' && rota === '/api/faturas') {
    return json(res, 200, listarFaturas({
      id_cotacao: url.searchParams.get('id_cotacao') ?? undefined,
    }));
  }

  const detalhe = rota.match(/^\/api\/cotacoes\/(\d+)$/);
  if (req.method === 'GET' && detalhe) {
    const cotacao = buscar(detalhe[1], motor);
    if (!cotacao) return json(res, 404, { erro: 'Cotação não encontrada' });
    return json(res, 200, cotacao);
  }

  if (req.method === 'GET') return servirEstatico(res, rota);
  return json(res, 404, { erro: 'Rota não encontrada' });
}

function createServer(port, versao = 'v1') {
  const servidor = http.createServer((req, res) => {
    rotear(req, res, versao).catch(() => json(res, 500, { erro: 'Erro interno' }));
  });
  servidor.listen(port);
  return servidor;
}

if (require.main === module) {
  const versao = process.argv[2] === 'v2' ? 'v2' : 'v1';
  const porta = versao === 'v2' ? 3002 : 3001;
  createServer(porta, versao);
  console.log(`Cotação & Faturamento ${versao} em http://localhost:${porta}`);
}

module.exports = { createServer, lerCorpo, json };
