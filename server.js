require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const painel = require('./painel');
const master = require('./master');
const landing = require('./landing');
const { inspect, diagnostico } = require('./db');
const { buscarPorSlug, render, paginaNaoEncontrada, manifesto, proporcaoDaCapa } = require('./webapp');
const { iniciar, completar, ErroCadastro, PROPOSITO: PROPOSITO_APOIO } = require('./cadastro');
const chaves = require('./chaves');
const descadastro = require('./descadastro');
const midia = require('./midia');
const push = require('./push');
const disparo = require('./disparo');
const { getPrisma } = require('./prisma-client');

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
app.use('/master', master);

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

// O service worker precisa vir da raiz: o escopo dele nao pode subir acima da
// pasta onde e servido, e a inscricao de push vale para o dominio inteiro.
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.type('application/javascript').sendFile('sw.js', { root: 'public' });
});

// Imagens enviadas pelo painel. Ficam no banco, entao sobrevivem ao deploy.
app.get('/midia/:id', (req, res, next) => {
  midia.servir(req, res).catch(next);
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
    // Qualquer erro que traga um status de cliente e culpa do pedido, e a
    // mensagem dele ajuda quem esta preenchendo o formulario.
    const status = err instanceof ErroCadastro ? err.status : err.status;
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return res.status(status).json({ erro: err.message });
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

/// Registra a abertura da pagina, somada por dia. Responde 204 e sem corpo
/// porque o navegador dispara isso em segundo plano — ninguem espera resposta.
app.post('/:slug/visita', comTenant, async (req, res) => {
  try {
    const hoje = new Date();
    const dia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    // Aparelho novo no dia so entra na contagem de visitantes se a pessoa
    // aceitou ser reconhecida; sem aceite, conta so a abertura.
    const novoVisitante = req.body?.novo === true ? 1 : 0;

    await getPrisma().siteVisit.upsert({
      where: { tenantId_day: { tenantId: req.tenant.id, day: dia } },
      create: { tenantId: req.tenant.id, day: dia, views: 1, visitors: novoVisitante },
      update: { views: { increment: 1 }, visitors: { increment: novoVisitante } },
    });
  } catch (err) {
    // Contador nao pode derrubar a pagina de ninguem.
    console.error('[visita]', err.message);
  }
  res.status(204).end();
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

app.post('/:slug/apoiar/completar', comTenant, (req, res) =>
  tratar(res, () =>
    completar({
      tenant: req.tenant,
      chave: req.body?.chave,
      nome: req.body?.nome,
      cep: req.body?.cep,
    })
  )
);

// Inscricao de push do navegador. A chave assinada diz de quem e a inscricao;
// sem ela, bastaria o id de outra pessoa para receber as campanhas dirigidas
// a ela.
app.post('/:slug/apoiar/push', comTenant, (req, res) =>
  tratar(res, async () => {
    const id = chaves.ler(PROPOSITO_APOIO, req.body?.chave);
    const dono = id
      ? await getPrisma().supporter.findFirst({
          where: { id, tenantId: req.tenant.id },
          select: { id: true },
        })
      : null;

    return push.inscrever({
      tenantId: req.tenant.id,
      supporterId: dono?.id || null,
      inscricao: req.body?.inscricao,
      userAgent: req.get('user-agent'),
    });
  })
);

app.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  if (!SLUG_VALIDO.test(slug)) return next();

  try {
    const tenant = await buscarPorSlug(slug);
    if (!tenant) {
      return res.status(404).type('html').send(paginaNaoEncontrada());
    }
    res.type('html').send(
      render(tenant, {
        chavePush: push.chavePublica(),
        proporcaoCapa: await proporcaoDaCapa(tenant.bannerUrl),
        // Endereco absoluto para a previa do link: o WhatsApp busca a imagem
        // de fora, entao caminho relativo nao resolve para ele.
        origem: `${req.protocol}://${req.get('host')}`,
      })
    );
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

/// Gatilho externo do disparo, para um cron do hPanel acelerar a fila sem
/// esperar o intervalo. Protegido pelo mesmo token do diagnostico: sem ele,
/// qualquer um poderia martelar a fila de fora.
app.get('/tarefas/disparo', async (req, res) => {
  const esperado = process.env.DEBUG_TOKEN;
  if (!esperado || req.query.token !== esperado) return res.status(404).end();
  try {
    res.json(await disparo.rodada());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Candidato Online ouvindo em http://${HOST}:${PORT}`);
  // A fila vive no banco, entao o laco pode comecar e parar junto com o
  // processo: se a hospedagem reiniciar o app, o disparo retoma de onde parou.
  disparo.iniciarLaco();
});
