require('dotenv').config();

const express = require('express');
const { inspect, diagnostico } = require('./db');
const { buscarPorSlug, render, paginaNaoEncontrada } = require('./webapp');

const app = express();

// A Hostinger injeta PORT. Escutar em 0.0.0.0 e obrigatorio para o proxy
// dela alcancar o processo - 127.0.0.1 nao funciona.
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.get('/', (req, res) => {
  res.json({ app: 'Voto.IO', status: 'online', version: '0.1.0' });
});

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// Diagnostico de banco. Protegido por token porque expoe o schema.
// Fica desativado enquanto DEBUG_TOKEN estiver vazio.
app.get('/db-check', async (req, res) => {
  const expected = process.env.DEBUG_TOKEN;
  if (!expected || req.query.token !== expected) {
    return res.status(404).json({ error: 'not found' });
  }

  const env = diagnostico();

  try {
    const result = await inspect();
    res.json({ connected: true, env, ...result });
  } catch (err) {
    res.status(500).json({ connected: false, env, code: err.code, message: err.message });
  }
});

// WebApp publico do candidato: candidato.bio/{slug}
// Fica por ultimo para nao capturar as rotas fixas acima.
const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{1,59}$/;

app.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  if (!SLUG_VALIDO.test(slug)) return next();

  try {
    const tenant = await buscarPorSlug(slug);
    if (!tenant) {
      return res.status(404).type('html').send(paginaNaoEncontrada());
    }
    res.type('html').send(render(tenant));
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).type('html').send(paginaNaoEncontrada());
});

app.use((err, req, res, next) => {
  console.error('Erro nao tratado:', err);
  res.status(500).type('html').send(paginaNaoEncontrada());
});

app.listen(PORT, HOST, () => {
  console.log(`Voto.IO ouvindo em http://${HOST}:${PORT}`);
});
