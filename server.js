require('dotenv').config();

const express = require('express');
const { inspect } = require('./db');

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

  try {
    const result = await inspect();
    res.json({ connected: true, ...result });
  } catch (err) {
    res.status(500).json({ connected: false, code: err.code, message: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Voto.IO ouvindo em http://${HOST}:${PORT}`);
});
