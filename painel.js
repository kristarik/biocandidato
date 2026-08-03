const express = require('express');
const { getPrisma } = require('./prisma-client');
const {
  autenticar, criarCookie, limparCookie, exigirSessao, trocarSenha, MINIMO_SENHA,
} = require('./auth');
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

// Enquanto a senha entregue pelo Master nao for trocada, o painel inteiro fica
// atras dessa tela. Bloquear so a interface nao bastaria: sem interceptar aqui,
// um POST direto continuaria funcionando.
router.use((req, res, next) => {
  if (!req.sessao.precisaTrocarSenha) return next();
  if (req.path === '/senha' || req.path === '/sair') return next();
  res.redirect('/painel/senha');
});

router.get('/', (req, res) => res.redirect('/painel/inicio'));

// ---------------------------------------------------------------------------
// Senha
// ---------------------------------------------------------------------------

function mostrarSenha(req, res, erro) {
  const obrigatoria = Boolean(req.sessao.precisaTrocarSenha);
  res.type('html').send(
    vistas.pagina({
      titulo: obrigatoria ? 'Crie sua senha' : 'Trocar senha',
      tenant: req.tenant,
      aba: 'senha',
      recado: erro ? null : recadoDaUrl(req),
      corpo: vistas.telaSenha({
        obrigatoria,
        erro,
        nome: req.sessao.nome,
        minimo: MINIMO_SENHA,
      }),
    })
  );
}

router.get('/senha', (req, res) => mostrarSenha(req, res));

router.post('/senha', async (req, res, next) => {
  try {
    const resultado = await trocarSenha({
      userId: req.sessao.userId,
      atual: req.body.atual,
      nova: req.body.nova,
      confirmacao: req.body.confirmacao,
      ip: req.ip,
    });

    if (resultado.erro) return mostrarSenha(req, res, resultado.erro);
    voltar(res, '/painel/inicio', 'Senha alterada. Use a nova no próximo acesso.');
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

const DIA = 86_400_000;

/// Variacao percentual entre dois periodos. Sem base anterior nao existe
/// variacao — devolve null em vez de fingir 100%.
function variacao(atual, anterior) {
  if (!anterior) return atual > 0 ? null : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

const NOME_ETAPA = {
  PENDENTE: 'Informou o número',
  CONFIRMADO: 'Confirmou o código',
  COMPLETO: 'Completou o cadastro',
};

router.get('/inicio', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenant.id;
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicio7 = new Date(hoje.getTime() - 6 * DIA);
    const inicio14 = new Date(hoje.getTime() - 13 * DIA);
    const inicio30 = new Date(hoje.getTime() - 29 * DIA);
    const inicio60 = new Date(hoje.getTime() - 59 * DIA);

    const contar = (extra = {}) =>
      prisma.supporter.count({ where: { tenantId, deletedAt: null, ...extra } });

    const [
      total, contHoje, cont7, cont7Anterior, cont30, cont30Anterior,
      confirmados, completos, push, porDia, porStatus, porOrigem, porCidade, ultimos,
    ] = await Promise.all([
      contar(),
      contar({ createdAt: { gte: hoje } }),
      contar({ createdAt: { gte: inicio7 } }),
      contar({ createdAt: { gte: inicio14, lt: inicio7 } }),
      contar({ createdAt: { gte: inicio30 } }),
      contar({ createdAt: { gte: inicio60, lt: inicio30 } }),
      contar({ smsValidated: true }),
      contar({ status: 'COMPLETO' }),
      contar({ pushActive: true }),
      // Agrupar por dia no banco: o groupBy do Prisma agrupa pelo instante
      // exato, o que daria um balde por cadastro em vez de um por dia.
      prisma.$queryRaw`
        SELECT DATE(created_at) AS dia, COUNT(*) AS total
        FROM supporters
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= ${inicio30}
        GROUP BY dia ORDER BY dia`,
      prisma.supporter.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.supporter.groupBy({
        by: ['origin'],
        where: { tenantId, deletedAt: null, origin: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { origin: 'desc' } },
        take: 6,
      }),
      prisma.supporter.groupBy({
        by: ['city'],
        where: { tenantId, deletedAt: null, city: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { city: 'desc' } },
        take: 6,
      }),
      prisma.supporter.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Dias sem cadastro precisam existir na serie, senao a linha "pula" o
    // vazio e sugere movimento que nao houve.
    const porChave = new Map(
      porDia.map((r) => [String(r.dia).slice(0, 10), Number(r.total)])
    );
    const serie = Array.from({ length: 30 }, (_, i) => {
      const data = new Date(inicio30.getTime() + i * DIA);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
      return { data, valor: porChave.get(chave) || 0 };
    });

    const contagemStatus = Object.fromEntries(
      porStatus.map((s) => [s.status, s._count._all])
    );
    const funil = ['PENDENTE', 'CONFIRMADO', 'COMPLETO']
      .map((s) => ({ rotulo: NOME_ETAPA[s], valor: contagemStatus[s] || 0 }))
      .filter((f, _, todos) => todos.some((t) => t.valor > 0));

    res.type('html').send(
      vistas.pagina({
        titulo: 'Início',
        tenant: req.tenant,
        aba: 'inicio',
        recado: recadoDaUrl(req),
        corpo: vistas.telaInicio({
          numeros: {
            total,
            hoje: contHoje,
            semana: cont7,
            mes: cont30,
            confirmados,
            completos,
            push,
            deltaSemana: variacao(cont7, cont7Anterior),
            deltaMes: variacao(cont30, cont30Anterior),
          },
          serie,
          funil,
          origens: porOrigem.map((o) => ({ rotulo: o.origin, valor: o._count._all })),
          cidades: porCidade.map((c) => ({ rotulo: c.city, valor: c._count._all })),
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

const TETO_BUSCA = 5000;

/// Ids que casam com o texto buscado, por nome ou por telefone.
async function idsDaBusca(prisma, tenantId, termo) {
  const alvo = `%${termo}%`;
  const digitos = termo.replace(/\D/g, '');

  const linhas = digitos
    ? await prisma.$queryRaw`
        SELECT id FROM supporters
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
          AND (name LIKE ${alvo} OR phone LIKE ${`%${digitos}%`})
        LIMIT ${TETO_BUSCA}`
    : await prisma.$queryRaw`
        SELECT id FROM supporters
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND name LIKE ${alvo}
        LIMIT ${TETO_BUSCA}`;

  return linhas.map((l) => l.id);
}

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
    if (filtros.origem) where.origin = filtros.origem;

    // A busca textual precisa de SQL puro: o `contains` do Prisma envia o
    // parametro com colacao binaria e o MariaDB recusa comparar com a coluna
    // utf8mb4_unicode_ci ("Illegal mix of collations"). O LIKE cru respeita a
    // colacao da coluna, o que tambem mantem a busca sem diferenciar
    // maiusculas de minusculas.
    if (filtros.busca) {
      where.id = { in: await idsDaBusca(prisma, tenantId, filtros.busca) };
    }

    const paginaAtual = Math.max(1, Number(req.query.pagina) || 1);

    const [total, apoiadores, agrupadoCidades, agrupadoOrigens] = await Promise.all([
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
      prisma.supporter.groupBy({
        by: ['origin'],
        where: { tenantId, deletedAt: null, origin: { not: null } },
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
          origens: agrupadoOrigens.map((o) => o.origin).filter(Boolean).sort(),
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
// Turbinar
// ---------------------------------------------------------------------------

/// Quem cada canal alcanca. Push exige autorizacao de notificacao no
/// aparelho; WhatsApp, SMS e RCS exigem numero confirmado, porque todos
/// dependem do telefone — RCS chega na mesma caixa do SMS, e o WhatsApp usa o
/// mesmo numero que a pessoa confirmou por codigo.
function filtroDoCanal(canal) {
  if (canal === 'PUSH') return { pushActive: true };
  return { smsValidated: true };
}

async function alcancePorCanal(prisma, tenantId, extra = {}) {
  const base = { tenantId, deletedAt: null, ...extra };
  const [push, telefone] = await Promise.all([
    prisma.supporter.count({ where: { ...base, pushActive: true } }),
    prisma.supporter.count({ where: { ...base, smsValidated: true } }),
  ]);
  return { PUSH: push, WHATSAPP: telefone, SMS: telefone, RCS: telefone };
}

async function montarTurbinar(req, res, aviso) {
  const prisma = getPrisma();
  const tenantId = req.tenant.id;

  const [alcance, agrupadoCidades, campanhas] = await Promise.all([
    alcancePorCanal(prisma, tenantId),
    prisma.supporter.groupBy({
      by: ['city'],
      where: { tenantId, deletedAt: null, city: { not: null } },
      _count: true,
    }),
    prisma.campaign.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 15 }),
  ]);

  res.type('html').send(
    vistas.pagina({
      titulo: 'Turbinar',
      tenant: req.tenant,
      aba: 'turbinar',
      recado: recadoDaUrl(req),
      corpo: vistas.telaTurbinar({
        alcance,
        cidades: agrupadoCidades.map((c) => c.city).filter(Boolean).sort(),
        campanhas,
        aviso,
      }),
    })
  );
}

router.get('/turbinar', async (req, res, next) => {
  try {
    await montarTurbinar(req, res);
  } catch (err) {
    next(err);
  }
});

router.post('/turbinar', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenant.id;
    const b = req.body;

    const channel = ['PUSH', 'WHATSAPP', 'SMS', 'RCS'].includes(b.channel) ? b.channel : null;
    const name = texto(b.name, 150);
    const message = texto(b.message, 1000);
    if (!channel || !name || !message) {
      return voltar(res, '/painel/turbinar', 'Escolha o canal e preencha nome e mensagem.', 'erro');
    }

    const cidade = texto(b.city, 120);
    const filtros = { channel, city: cidade };

    // O total e congelado no momento da criacao para o relatorio depois bater
    // com o publico real — a base cresce todo dia.
    const totalRecipients = await prisma.supporter.count({
      where: {
        tenantId,
        deletedAt: null,
        ...filtroDoCanal(channel),
        ...(cidade ? { city: cidade } : {}),
      },
    });

    if (!totalRecipients) {
      return voltar(res, '/painel/turbinar', 'Nenhum apoiador se encaixa nesses filtros.', 'erro');
    }

    await prisma.campaign.create({
      data: {
        tenantId,
        name,
        channel,
        title: texto(b.title, 150),
        message,
        linkUrl: texto(b.linkUrl, 500),
        filters: filtros,
        status: 'DRAFT',
        totalRecipients,
        createdById: req.sessao.userId,
      },
    });

    voltar(
      res,
      '/painel/turbinar',
      `Campanha criada para ${totalRecipients} pessoas. O disparo aguarda a conexão do provedor.`
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
