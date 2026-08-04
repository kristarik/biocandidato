const express = require('express');
const multer = require('multer');
const { getPrisma } = require('./prisma-client');
const midia = require('./midia');
const disparo = require('./disparo');
const {
  autenticar, criarCookie, limparCookie, exigirSessao, trocarSenha, MINIMO_SENHA,
} = require('./auth');
const vistas = require('./painel-views');

const router = express.Router();
router.use(express.urlencoded({ extended: false, limit: '64kb' }));

// Upload em memoria: a imagem e reduzida e vai direto para o banco, entao
// nunca precisa tocar o disco — que na Hostinger seria apagado no proximo
// deploy de qualquer forma.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: midia.ENTRADA_MAXIMA, files: 3 },
});

// A galeria recebe um lote de artes de uma vez: a campanha manda o pacote do
// designer inteiro, nao uma peca por dia.
const uploadEmLote = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: midia.ENTRADA_MAXIMA, files: 12 },
});

/// Recebe o arquivo de um campo, grava e devolve a URL publica. Devolve
/// undefined quando nada foi enviado, para o chamador manter o valor atual.
async function urlDoUpload(req, campo, tipo) {
  const arquivo = req.files?.[campo]?.[0] || (req.file?.fieldname === campo ? req.file : null);
  if (!arquivo?.buffer?.length) return undefined;
  const { url } = await midia.salvar({
    tenantId: req.tenant.id,
    tipo,
    buffer: arquivo.buffer,
    createdById: req.sessao.userId,
  });
  return url;
}

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
  res.type('html').send(vistas.telaEntrar({ erro: req.query.erro, usuario: req.query.usuario }));
});

router.post('/entrar', async (req, res, next) => {
  try {
    const { usuario, senha } = req.body;
    const resultado = await autenticar(usuario, senha);

    if (resultado.erro) {
      return res.status(401).type('html').send(
        vistas.telaEntrar({ erro: resultado.erro, usuario })
      );
    }

    criarCookie(res, resultado);
    // Uma porta de entrada só: o papel decide para onde a pessoa vai.
    res.redirect(resultado.user.role === 'MASTER' ? '/master' : '/painel/inicio');
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

// A sessao do Master nao tem candidato, entao nenhuma tela daqui faz sentido
// para ele — exceto a troca da propria senha.
router.use((req, res, next) => {
  if (req.tenant || req.path === '/senha' || req.path === '/sair') return next();
  res.redirect('/master');
});

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
      nome: req.sessao.nome,
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
    voltar(
      res,
      req.sessao.papel === 'MASTER' ? '/master' : '/painel/inicio',
      'Senha alterada. Use a nova no próximo acesso.'
    );
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
  PENDENTE: 'Cadastro incompleto',
  CONFIRMADO: 'Deixou só o telefone',
  COMPLETO: 'Informou nome e CEP',
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

/// Le os filtros da URL e monta a consulta. Compartilhado pela listagem e pela
/// exportacao: se cada uma montasse o proprio filtro, o CSV acabaria trazendo
/// um recorte diferente do que a pessoa esta vendo na tela.
async function filtrosDeApoiadores(req) {
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

  return { filtros, where };
}

router.get('/apoiadores', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.tenant.id;
    const { filtros, where } = await filtrosDeApoiadores(req);

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

const COLUNAS_CSV = [
  ['Nome', (s) => s.name],
  ['WhatsApp', (s) => s.phone],
  ['Status', (s) => s.status],
  ['CEP', (s) => s.cep],
  ['Cidade', (s) => s.city],
  ['Estado', (s) => s.state],
  ['Origem', (s) => s.origin],
  ['SMS confirmado', (s) => (s.smsValidated ? 'sim' : 'nao')],
  ['Push ativo', (s) => (s.pushActive ? 'sim' : 'nao')],
  ['utm_source', (s) => s.utmSource],
  ['utm_medium', (s) => s.utmMedium],
  ['utm_campaign', (s) => s.utmCampaign],
  ['Cadastro', (s) => s.createdAt.toISOString()],
];

/// Escapa um valor para CSV. O prefixo em campos que comecam com sinal impede
/// que o Excel interprete o conteudo como formula ao abrir o arquivo — um nome
/// como "=CMD" viraria execucao na maquina de quem abrir.
function celulaCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replaceAll('"', '""')}"`;
}

router.get('/apoiadores/exportar', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const { where } = await filtrosDeApoiadores(req);

    const apoiadores = await prisma.supporter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50_000,
    });

    const linhas = [
      COLUNAS_CSV.map(([titulo]) => celulaCsv(titulo)).join(';'),
      ...apoiadores.map((s) => COLUNAS_CSV.map(([, ler]) => celulaCsv(ler(s))).join(';')),
    ];

    const carimbo = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="apoiadores-${req.tenant.slug}-${carimbo}.csv"`
    );
    // BOM na frente: sem ele o Excel abre o arquivo em latin-1 e todo acento
    // vira caractere quebrado.
    res.send(`﻿${linhas.join('\r\n')}\r\n`);

    await prisma.auditLog.create({
      data: {
        tenantId: req.tenant.id,
        userId: req.sessao.userId,
        action: 'EXPORT',
        entity: 'Supporter',
        after: { total: apoiadores.length, filtros: req.query },
        ip: req.ip,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Turbinar
// ---------------------------------------------------------------------------

/// Quem cada canal alcanca. Push exige que o navegador tenha devolvido uma
/// inscricao valida; WhatsApp, SMS e RCS alcancam todo mundo que informou o
/// telefone, ja que o cadastro nao pede confirmacao por codigo.
function filtroDoCanal(canal) {
  return canal === 'PUSH' ? { pushActive: true } : {};
}

async function alcancePorCanal(prisma, tenantId, extra = {}) {
  // Quem pediu para sair fica fora de qualquer canal. Sem este filtro o botao
  // de descadastro seria decorativo, e a pessoa continuaria recebendo.
  const base = { tenantId, deletedAt: null, optedOutAt: null, ...extra };
  const [push, telefone] = await Promise.all([
    prisma.supporter.count({ where: { ...base, pushActive: true } }),
    prisma.supporter.count({ where: base }),
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
        alcance: { ...alcance, saldo: req.tenant.creditBalance },
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
        optedOutAt: null,
        ...filtroDoCanal(channel),
        ...(cidade ? { city: cidade } : {}),
      },
    });

    if (!totalRecipients) {
      return voltar(res, '/painel/turbinar', 'Nenhum apoiador se encaixa nesses filtros.', 'erro');
    }

    // Barrar aqui, e nao no disparo: montar uma campanha que nunca poderia
    // sair daria ao candidato a impressao de que a mensagem esta a caminho.
    if (totalRecipients > req.tenant.creditBalance) {
      return voltar(
        res,
        '/painel/turbinar',
        `Esta campanha precisa de ${totalRecipients.toLocaleString('pt-BR')} disparos e você tem ${req.tenant.creditBalance.toLocaleString('pt-BR')}. Fale com a gente para liberar mais.`,
        'erro'
      );
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
      channel === 'PUSH'
        ? `Campanha criada para ${totalRecipients.toLocaleString('pt-BR')} pessoas. Clique em "Enviar agora" para disparar.`
        : `Campanha criada para ${totalRecipients.toLocaleString('pt-BR')} pessoas. O envio por ${channel} aguarda a conexão do provedor.`
    );
  } catch (err) {
    next(err);
  }
});

router.post('/turbinar/:id/enviar', async (req, res, next) => {
  try {
    const { total } = await disparo.liberar(req.params.id, req.tenant.id, req.sessao.userId);
    voltar(
      res,
      '/painel/turbinar',
      `Disparo liberado para ${total.toLocaleString('pt-BR')} pessoas. O envio começa em instantes.`
    );
  } catch (err) {
    if (err instanceof disparo.ErroDisparo) {
      return voltar(res, '/painel/turbinar', err.message, 'erro');
    }
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

    const [propostas, experiencias, pecas, redes, links, banners] = await Promise.all([
      prisma.proposal.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
      prisma.experience.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
      prisma.photo.findMany({ where: { tenantId }, orderBy: { position: 'asc' } }),
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
        corpo: vistas.telaConteudo({
          tenant: req.tenant, propostas, experiencias, pecas, redes, links, banners,
        }),
      })
    );
  } catch (err) {
    next(err);
  }
});

const camposDeImagem = upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'cidade', maxCount: 1 },
]);

router.post('/conteudo/perfil', camposDeImagem, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const b = req.body;
    const hex = (v, padrao) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : padrao);

    const antes = req.tenant;
    const fotoNova = await urlDoUpload(req, 'foto', 'foto');
    const bannerNovo = await urlDoUpload(req, 'banner', 'banner');
    const cidadeNova = await urlDoUpload(req, 'cidade', 'cidade');

    const depois = {
      name: texto(b.name, 120) || antes.name,
      number: texto(b.number, 10),
      party: texto(b.party, 80),
      city: texto(b.city, 120),
      state: texto(b.state, 2)?.toUpperCase() || null,
      slogan: texto(b.slogan, 200),
      bio: texto(b.bio, 1200),
      curriculum: texto(b.curriculum, 4000),
      // Sem arquivo novo, mantem o atual; a caixa "remover" limpa o campo.
      photoUrl: b.removerFoto === '1' ? null : fotoNova ?? antes.photoUrl,
      bannerUrl: b.removerBanner === '1' ? null : bannerNovo ?? antes.bannerUrl,
      proposalsBgUrl: b.removerCidade === '1' ? null : cidadeNova ?? antes.proposalsBgUrl,
      primaryColor: hex(b.primaryColor, antes.primaryColor),
      secondaryColor: hex(b.secondaryColor, antes.secondaryColor),
      darkColor: hex(b.darkColor, antes.darkColor),
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
function recurso(nome, modelo, montarDados, meioDeCampo = []) {
  router.post(`/conteudo/${nome}`, ...meioDeCampo, async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.tenant.id;
      const dados = await montarDados(req.body, req);
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

router.post(
  '/conteudo/peca',
  uploadEmLote.array('pecas', 12),
  async (req, res, next) => {
    try {
      const arquivos = (req.files || []).filter((a) => a?.buffer?.length);
      if (!arquivos.length) {
        return voltar(res, '/painel/conteudo', 'Escolha ao menos uma arte.', 'erro');
      }

      const prisma = getPrisma();
      const ultima = await prisma.photo.findFirst({
        where: { tenantId: req.tenant.id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      let posicao = ultima?.position ?? 0;
      for (const arquivo of arquivos) {
        const { url } = await midia.salvar({
          tenantId: req.tenant.id,
          tipo: 'peca',
          buffer: arquivo.buffer,
          createdById: req.sessao.userId,
        });
        posicao += 1;
        await prisma.photo.create({
          data: { tenantId: req.tenant.id, url, album: 'compartilhe', position: posicao },
        });
      }

      voltar(
        res,
        '/painel/conteudo',
        `${arquivos.length} arte(s) adicionada(s) ao Compartilhe.`
      );
    } catch (err) {
      next(err);
    }
  }
);

router.post('/conteudo/peca/apagar', async (req, res, next) => {
  try {
    const removidos = await getPrisma().photo.deleteMany({
      where: { id: String(req.body.id || ''), tenantId: req.tenant.id },
    });
    voltar(
      res,
      '/painel/conteudo',
      removidos.count ? 'Arte removida.' : 'Arte não encontrada.',
      removidos.count ? 'ok' : 'erro'
    );
  } catch (err) {
    next(err);
  }
});

recurso('experiencia', 'experience', (b) => {
  const title = texto(b.title, 150);
  return title ? { title, detail: texto(b.detail, 200) } : null;
});

recurso('rede', 'socialLink', (b) => {
  const url = texto(b.url, 500);
  const platform = REDES_ACEITAS.includes(b.platform) ? b.platform : null;
  return url && platform ? { platform, url } : null;
});

recurso(
  'link',
  'importantLink',
  async (b, req) => {
    const label = texto(b.label, 120);
    const url = texto(b.url, 500);
    if (!label || !url) return null;
    return { label, url, iconUrl: (await urlDoUpload(req, 'icone', 'icone')) || null };
  },
  [upload.fields([{ name: 'icone', maxCount: 1 }])]
);

recurso(
  'banner',
  'banner',
  async (b, req) => {
    const imageUrl = await urlDoUpload(req, 'imagem', 'divulgacao');
    if (!imageUrl) return null;
    const slot = ['TOPO', 'MEIO', 'RODAPE'].includes(b.slot) ? b.slot : 'MEIO';
    return { imageUrl, slot, linkUrl: texto(b.linkUrl, 500) };
  },
  [upload.fields([{ name: 'imagem', maxCount: 1 }])]
);

/// Erro de imagem vira recado na tela, nao pagina de erro: a pessoa acabou de
/// escolher um arquivo e precisa saber o que houve com ele.
router.use((err, req, res, next) => {
  if (err instanceof midia.ErroMidia) {
    return voltar(res, '/painel/conteudo', err.message, 'erro');
  }
  if (err instanceof multer.MulterError) {
    const recado =
      err.code === 'LIMIT_FILE_SIZE'
        ? `A imagem passa de ${midia.ENTRADA_MAXIMA / 1048576} MB. Reduza antes de enviar.`
        : 'Não foi possível receber o arquivo. Tente novamente.';
    return voltar(res, '/painel/conteudo', recado, 'erro');
  }
  next(err);
});

module.exports = router;
