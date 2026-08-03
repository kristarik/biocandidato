const express = require('express');
const { getPrisma } = require('./prisma-client');
const { autenticar, criarCookie, limparCookie, exigirSessao } = require('./auth');
const vistas = require('./painel-views');

const router = express.Router();
router.use(express.urlencoded({ extended: false, limit: '64kb' }));

const POR_PAGINA = 50;

/// Recado de sucesso ou erro vem pela URL apos o redirecionamento, para que
/// atualizar a pagina nao reenvie o formulario.
function recadoDaUrl(req) {
  if (req.query.ok) return { tipo: 'ok', texto: String(req.query.ok).slice(0, 200) };
  if (req.query.erro) return { tipo: 'erro', texto: String(req.query.erro).slice(0, 200) };
  return null;
}

function voltar(res, destino, mensagem, tipo = 'ok') {
  res.redirect(`${destino}?${tipo}=${encodeURIComponent(mensagem)}`);
}

function texto(valor, limite) {
  const t = String(valor ?? '').trim();
  return t ? t.slice(0, limite) : null;
}

// ---------------------------------------------------------------------------
// Sessao
// ---------------------------------------------------------------------------

router.get('/entrar', (req, res) => {
  res.type('html').send(vistas.telaEntrar({ erro: req.query.erro, email: req.query.email }));
});

router.post('/entrar', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    const resultado = await autenticar(email, senha);

    if (resultado.erro) {
      return res.status(401).type('html').send(
        vistas.telaEntrar({ erro: resultado.erro, email })
      );
    }

    criarCookie(res, resultado);
    res.redirect('/painel/inicio');
  } catch (err) {
    next(err);
  }
});

router.post('/sair', (req, res) => {
  limparCookie(res);
  res.redirect('/painel/entrar');
});

// Tudo daqui para baixo exige sessao. O tenant vem do token, nunca da URL.
router.use(exigirSessao);

router.get('/', (req, res) => res.redirect('/painel/inicio'));

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

router.get('/inicio', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenant.id;
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const semana = new Date(hoje.getTime() - 6 * 86_400_000);
    const mes = new Date(hoje.getTime() - 29 * 86_400_000);

    const contar = (extra = {}) => prisma.supporter.count({ where: { tenantId, deletedAt: null, ...extra } });

    const [total, contHoje, contSemana, contMes, confirmados, push, ultimos] = await Promise.all([
      contar(),
      contar({ createdAt: { gte: hoje } }),
      contar({ createdAt: { gte: semana } }),
      contar({ createdAt: { gte: mes } }),
      contar({ smsValidated: true }),
      contar({ pushActive: true }),
      prisma.supporter.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.type('html').send(
      vistas.pagina({
        titulo: 'Início',
        tenant: req.tenant,
        aba: 'inicio',
        recado: recadoDaUrl(req),
        corpo: vistas.telaInicio({
          numeros: { total, hoje: contHoje, semana: contSemana, mes: contMes, confirmados, push },
          ultimos,
        }),
      })
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Apoiadores
// ---------------------------------------------------------------------------

router.get('/apoiadores', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenant.id;

    const filtros = {
      busca: texto(req.query.busca, 80) || '',
      cidade: texto(req.query.cidade, 120) || '',
      status: ['PENDENTE', 'CONFIRMADO', 'COMPLETO'].includes(req.query.status) ? req.query.status : '',
      origem: texto(req.query.origem, 60) || '',
    };

    const where = { tenantId, deletedAt: null };
    if (filtros.cidade) where.city = filtros.cidade;
    if (filtros.status) where.status = filtros.status;
    if (filtros.origem) where.origin = { contains: filtros.origem };
    if (filtros.busca) {
      const digitos = filtros.busca.replace(/\D/g, '');
      where.OR = [
        { name: { contains: filtros.busca } },
        ...(digitos ? [{ phone: { contains: digitos } }] : []),
      ];
    }

    const paginaAtual = Math.max(1, Number(req.query.pagina) || 1);

    const [total, apoiadores, agrupadoCidades] = await Promise.all([
      prisma.supporter.count({ where }),
      prisma.supporter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (paginaAtual - 1) * POR_PAGINA,
        take: POR_PAGINA,
      }),
      prisma.supporter.groupBy({
        by: ['city'],
        where: { tenantId, deletedAt: null, city: { not: null } },
        _count: true,
      }),
    ]);

    res.type('html').send(
      vistas.pagina({
        titulo: 'Apoiadores',
        tenant: req.tenant,
        aba: 'apoiadores',
        recado: recadoDaUrl(req),
        corpo: vistas.telaApoiadores({
          apoiadores,
          filtros,
          cidades: agrupadoCidades.map((c) => c.city).filter(Boolean).sort(),
          total,
          pagina: paginaAtual,
          paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
        }),
      })
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Conteudo
// ---------------------------------------------------------------------------

router.get('/conteudo', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenant.id;

    const [propostas, redes, links, banners] = await Promise.all([
      prisma.proposal.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
      prisma.socialLink.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
      prisma.importantLink.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
      prisma.banner.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
    ]);

    res.type('html').send(
      vistas.pagina({
        titulo: 'Conteúdo',
        tenant: req.tenant,
        aba: 'conteudo',
        recado: recadoDaUrl(req),
        corpo: vistas.telaConteudo({ tenant: req.tenant, propostas, redes, links, banners }),
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/conteudo/perfil', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const b = req.body;
    const hex = (v, padrao) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : padrao);

    const antes = req.tenant;
    const depois = {
      name: texto(b.name, 120) || antes.name,
      number: texto(b.number, 10),
      party: texto(b.party, 80),
      city: texto(b.city, 120),
      state: texto(b.state, 2)?.toUpperCase() || null,
      slogan: texto(b.slogan, 200),
      bio: texto(b.bio, 1200),
      photoUrl: texto(b.photoUrl, 500),
      bannerUrl: texto(b.bannerUrl, 500),
      primaryColor: hex(b.primaryColor, antes.primaryColor),
      secondaryColor: hex(b.secondaryColor, antes.secondaryColor),
    };

    await prisma.$transaction([
      prisma.tenant.update({ where: { id: antes.id }, data: depois }),
      prisma.auditLog.create({
        data: {
          tenantId: antes.id,
          userId: req.sessao.userId,
          action: 'UPDATE',
          entity: 'Tenant',
          entityId: antes.id,
          after: depois,
          ip: req.ip,
        },
      }),
    ]);

    voltar(res, '/painel/conteudo', 'Identidade salva.');
  } catch (err) {
    next(err);
  }
});

/// Fabrica das rotas de adicionar e remover. O remover usa deleteMany filtrado
/// por tenantId: com delete simples, um id forjado apagaria conteudo de outro
/// candidato, ja que o MariaDB nao tem Row Level Security.
function recurso(nome, modelo, montarDados) {
  router.post(`/conteudo/${nome}`, async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.tenant.id;
      const dados = montarDados(req.body);
      if (!dados) return voltar(res, '/painel/conteudo', 'Preencha os campos obrigatórios.', 'erro');

      const ultima = await prisma[modelo].findFirst({
        where: { tenantId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      await prisma[modelo].create({
        data: { ...dados, tenantId, position: (ultima?.position ?? 0) + 1 },
      });

      voltar(res, '/painel/conteudo', 'Adicionado.');
    } catch (err) {
      if (err.code === 'P2002') {
        return voltar(res, '/painel/conteudo', 'Esse item já existe.', 'erro');
      }
      next(err);
    }
  });

  router.post(`/conteudo/${nome}/apagar`, async (req, res, next) => {
    try {
      const removidos = await getPrisma()[modelo].deleteMany({
        where: { id: String(req.body.id || ''), tenantId: req.tenant.id },
      });
      voltar(
        res,
        '/painel/conteudo',
        removidos.count ? 'Removido.' : 'Item não encontrado.',
        removidos.count ? 'ok' : 'erro'
      );
    } catch (err) {
      next(err);
    }
  });
}

const REDES_ACEITAS = ['whatsapp', 'instagram', 'tiktok', 'youtube', 'facebook', 'telegram', 'x', 'site'];

recurso('proposta', 'proposal', (b) => {
  const title = texto(b.title, 200);
  return title ? { title, description: texto(b.description, 300), content: texto(b.content, 8000) } : null;
});

recurso('rede', 'socialLink', (b) => {
  const url = texto(b.url, 500);
  const platform = REDES_ACEITAS.includes(b.platform) ? b.platform : null;
  return url && platform ? { platform, url } : null;
});

recurso('link', 'importantLink', (b) => {
  const label = texto(b.label, 120);
  const url = texto(b.url, 500);
  return label && url ? { label, url, iconUrl: texto(b.iconUrl, 500) } : null;
});

recurso('banner', 'banner', (b) => {
  const imageUrl = texto(b.imageUrl, 500);
  const slot = ['TOPO', 'MEIO', 'RODAPE'].includes(b.slot) ? b.slot : 'MEIO';
  return imageUrl ? { imageUrl, slot, linkUrl: texto(b.linkUrl, 500) } : null;
});

module.exports = router;
