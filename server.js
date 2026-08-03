require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const painel = require('./painel');
const landing = require('./landing');
const { inspect, diagnostico } = require('./db');
const { buscarPorSlug, render, paginaNaoEncontrada, manifesto } = require('./webapp');
const { iniciar, confirmar, completar, ErroCadastro } = require('./cadastro');
const descadastro = require('./descadastro');

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

// Arquivos publicos (logo, icones, manifest). Ficam no repositorio e sobem
// junto no deploy — nao dependem de storage externo. Cache longo porque o
// conteudo desses arquivos so muda com um novo deploy.
app.use(
  '/assets',
  express.static('public', { maxAge: '7d', fallthrough: true, index: false })
);

// Antes da rota /:slug, senao "painel" seria interpretado como slug de
// candidato. O slug "painel" tambem esta na lista de reservados.
app.use('/painel', painel);

// A Hostinger injeta PORT. Escutar em 0.0.0.0 e obrigatorio para o proxy
// dela alcancar o processo - 127.0.0.1 nao funciona.
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.get('/', (req, res) => {
  res.type('html').send(landing.render());
});

// O status em JSON saiu da raiz para dar lugar a pagina de vendas, mas
// continua existindo — monitoramento externo pode depender dele.
app.get('/status', (req, res) => {
  res.json({ app: 'Candidato Online', status: 'online', version: '0.1.0' });
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

/// Carrega o tenant e devolve 404 se o slug nao existir. Todas as rotas de
/// cadastro passam por aqui: nenhuma escrita acontece sem tenant resolvido.
async function comTenant(req, res, next) {
  if (!SLUG_VALIDO.test(req.params.slug)) return next();
  try {
    const tenant = await buscarPorSlug(req.params.slug);
    if (!tenant) return res.status(404).json({ erro: 'Candidato nao encontrado.' });
    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

function contexto(req) {
  return {
    ip: req.ip,
    userAgent: String(req.get('user-agent') || '').slice(0, 500),
  };
}

async function tratar(res, acao) {
  try {
    res.json(await acao());
  } catch (err) {
    if (err instanceof ErroCadastro) {
      return res.status(err.status).json({ erro: err.message });
    }
    console.error('Erro no cadastro:', err);
    res.status(500).json({ erro: 'Erro inesperado. Tente novamente.' });
  }
}

// Saida da lista. O link assinado vai no rodape de cada disparo, entao
// precisa funcionar num toque, sem login e sem a pessoa digitar nada.
app.get('/:slug/sair', comTenant, (req, res) => {
  const id = descadastro.lerToken(req.query.t);
  res.type('html').send(
    descadastro.pagina(req.tenant, {
      estado: id ? 'confirmar' : 'invalido',
      telefone: id ? req.query.t : '',
    })
  );
});

app.post('/:slug/sair', comTenant, express.urlencoded({ extended: false }), async (req, res, next) => {
  try {
    const id = descadastro.lerToken(req.body?.t || req.query.t);
    if (!id) {
      return res.status(400).type('html').send(
        descadastro.pagina(req.tenant, { estado: 'invalido' })
      );
    }
    const removido = await descadastro.descadastrar(req.tenant.id, id, req.ip);
    res.type('html').send(
      descadastro.pagina(req.tenant, { estado: removido ? 'pronto' : 'invalido' })
    );
  } catch (err) {
    next(err);
  }
});

app.get('/:slug/manifest.json', comTenant, (req, res) => {
  res.type('application/manifest+json').send(JSON.stringify(manifesto(req.tenant)));
});

app.post('/:slug/apoiar/iniciar', comTenant, (req, res) =>
  tratar(res, () =>
    iniciar({
      tenant: req.tenant,
      telefone: req.body?.telefone,
      utm: req.body?.utm,
      ...contexto(req),
    })
  )
);

app.post('/:slug/apoiar/confirmar', comTenant, (req, res) =>
  tratar(res, () =>
    confirmar({
      tenant: req.tenant,
      telefone: req.body?.telefone,
      codigo: req.body?.codigo,
      ...contexto(req),
    })
  )
);

app.post('/:slug/apoiar/completar', comTenant, (req, res) =>
  tratar(res, () =>
    completar({
      tenant: req.tenant,
      telefone: req.body?.telefone,
      nome: req.body?.nome,
      cep: req.body?.cep,
    })
  )
);

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
  console.log(`Candidato Online ouvindo em http://${HOST}:${PORT}`);
});
