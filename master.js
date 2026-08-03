const express = require('express');
const { getPrisma } = require('./prisma-client');
const { exigirSessao, exigirMaster } = require('./auth');
const { criarCandidato, redefinirSenha, ErroProvisionamento } = require('./provisionar');
const creditos = require('./creditos');
const vistas = require('./master-views');

const router = express.Router();
router.use(express.urlencoded({ extended: false, limit: '64kb' }));
router.use(exigirSessao, exigirMaster);

// A regra da senha temporaria vale igual aqui: a conta que administra a
// plataforma inteira nao pode ficar com a senha que veio por mensagem.
router.use((req, res, next) => {
  if (!req.sessao.precisaTrocarSenha) return next();
  res.redirect('/painel/senha');
});

const DIA = 86_400_000;

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
// Lista de candidatos
// ---------------------------------------------------------------------------

router.get('/', async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const trintaDias = new Date(Date.now() - 30 * DIA);

    const [tenants, porTenant, novosPorTenant, campanhasPorTenant, somaCreditos, totalApoiadores, totalCampanhas] =
      await Promise.all([
        prisma.tenant.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'desc' }] }),
        prisma.supporter.groupBy({ by: ['tenantId'], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.supporter.groupBy({
          by: ['tenantId'],
          where: { deletedAt: null, createdAt: { gte: trintaDias } },
          _count: { _all: true },
        }),
        prisma.campaign.groupBy({ by: ['tenantId'], _count: { _all: true } }),
        prisma.creditTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
        prisma.supporter.count({ where: { deletedAt: null } }),
        prisma.campaign.count(),
      ]);

    const mapa = (lista) => new Map(lista.map((l) => [l.tenantId, l._count._all]));
    const apoiadores = mapa(porTenant);
    const novos = mapa(novosPorTenant);
    const campanhas = mapa(campanhasPorTenant);

    const somaTipos = (tipos) =>
      somaCreditos.filter((c) => tipos.includes(c.type)).reduce((t, c) => t + (c._sum.amount || 0), 0);

    res.type('html').send(
      vistas.pagina({
        titulo: 'Candidatos',
        aba: 'candidatos',
        nome: req.sessao.nome,
        recado: recadoDaUrl(req),
        corpo: vistas.telaCandidatos({
          candidatos: tenants.map((t) => ({
            ...t,
            apoiadores: apoiadores.get(t.id) || 0,
            novos30: novos.get(t.id) || 0,
            campanhas: campanhas.get(t.id) || 0,
          })),
          totais: {
            ativos: tenants.filter((t) => t.active).length,
            apoiadores: totalApoiadores,
            campanhas: totalCampanhas,
            saldo: tenants.reduce((t, x) => t + x.creditBalance, 0),
            creditado: somaTipos(['COMPRA', 'BONUS', 'ESTORNO']) + Math.max(0, somaTipos(['AJUSTE'])),
            consumido: Math.abs(somaTipos(['CONSUMO'])),
          },
        }),
      })
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Novo candidato
// ---------------------------------------------------------------------------

router.get('/novo', (req, res) => {
  res.type('html').send(
    vistas.pagina({
      titulo: 'Novo candidato',
      aba: 'novo',
      nome: req.sessao.nome,
      recado: recadoDaUrl(req),
      corpo: vistas.telaNovoCandidato({ erro: req.query.erro }),
    })
  );
});

router.post('/novo', async (req, res, next) => {
  try {
    const { tenant, user, senha } = await criarCandidato(req.body, {
      createdById: req.sessao.userId,
    });

    res.type('html').send(
      vistas.pagina({
        titulo: 'Candidato criado',
        aba: 'novo',
        nome: req.sessao.nome,
        corpo: vistas.telaNovoCandidato({
          criado: { id: tenant.id, nome: tenant.name, slug: tenant.slug, email: user.email, senha },
        }),
      })
    );
  } catch (err) {
    if (err instanceof ErroProvisionamento) {
      return res.status(400).type('html').send(
        vistas.pagina({
          titulo: 'Novo candidato',
          aba: 'novo',
          nome: req.sessao.nome,
          corpo: vistas.telaNovoCandidato({ erro: err.message, valores: req.body }),
        })
      );
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Ficha do candidato
// ---------------------------------------------------------------------------

async function mostrarCandidato(req, res, extras = {}) {
  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
  if (!tenant) return res.status(404).redirect('/master?erro=Candidato%20n%C3%A3o%20encontrado');

  const base = { tenantId: tenant.id, deletedAt: null };
  const [apoiadores, push, telefone, saiu, campanhas, somaDestinatarios, resumoCreditos, extrato, vinculo] =
    await Promise.all([
      prisma.supporter.count({ where: base }),
      prisma.supporter.count({ where: { ...base, optedOutAt: null, pushActive: true } }),
      prisma.supporter.count({ where: { ...base, optedOutAt: null, smsValidated: true } }),
      prisma.supporter.count({ where: { ...base, optedOutAt: { not: null } } }),
      prisma.campaign.count({ where: { tenantId: tenant.id } }),
      prisma.campaign.aggregate({ where: { tenantId: tenant.id }, _sum: { totalRecipients: true } }),
      creditos.resumo(tenant.id),
      creditos.extrato(tenant.id),
      prisma.tenantUser.findFirst({ where: { tenantId: tenant.id }, include: { user: true } }),
    ]);

  res.type('html').send(
    vistas.pagina({
      titulo: tenant.name,
      aba: 'candidatos',
      nome: req.sessao.nome,
      recado: extras.recado || recadoDaUrl(req),
      corpo: vistas.telaCandidato({
        tenant,
        numeros: {
          apoiadores,
          push,
          telefone,
          saiu,
          campanhas,
          disparosPrevistos: somaDestinatarios._sum.totalRecipients || 0,
        },
        creditos: resumoCreditos,
        extrato,
        acesso: vinculo?.user,
        senhaNova: extras.senhaNova,
      }),
    })
  );
}

router.get('/candidato/:id', async (req, res, next) => {
  try {
    await mostrarCandidato(req, res);
  } catch (err) {
    next(err);
  }
});

router.post('/candidato/:id/creditos', async (req, res, next) => {
  const destino = `/master/candidato/${req.params.id}`;
  try {
    const tipo = ['COMPRA', 'BONUS', 'AJUSTE', 'ESTORNO'].includes(req.body.tipo)
      ? req.body.tipo
      : 'AJUSTE';

    const saldo = await creditos.lancar({
      tenantId: req.params.id,
      tipo,
      quantidade: req.body.quantidade,
      descricao: texto(req.body.descricao, 250),
      createdById: req.sessao.userId,
    });

    voltar(res, destino, `Lançamento registrado. Saldo agora: ${saldo.toLocaleString('pt-BR')} disparos.`);
  } catch (err) {
    if (err instanceof creditos.ErroCredito) return voltar(res, destino, err.message, 'erro');
    next(err);
  }
});

router.post('/candidato/:id/senha', async (req, res, next) => {
  try {
    const { senha } = await redefinirSenha(req.params.id, { createdById: req.sessao.userId });
    await mostrarCandidato(req, res, {
      senhaNova: senha,
      recado: { tipo: 'ok', texto: 'Nova senha gerada. Ela aparece uma única vez.' },
    });
  } catch (err) {
    if (err instanceof ErroProvisionamento) {
      return voltar(res, `/master/candidato/${req.params.id}`, err.message, 'erro');
    }
    next(err);
  }
});

router.post('/candidato/:id/status', async (req, res, next) => {
  const destino = `/master/candidato/${req.params.id}`;
  try {
    const ativo = req.body.ativo === '1';
    await getPrisma().$transaction([
      getPrisma().tenant.update({ where: { id: req.params.id }, data: { active: ativo } }),
      getPrisma().auditLog.create({
        data: {
          tenantId: req.params.id,
          userId: req.sessao.userId,
          action: ativo ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'Tenant',
          entityId: req.params.id,
          ip: req.ip,
        },
      }),
    ]);
    voltar(res, destino, ativo ? 'Candidato reativado.' : 'Candidato desativado. O site saiu do ar.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
