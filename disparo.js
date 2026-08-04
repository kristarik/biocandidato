const { Prisma } = require('@prisma/client');
const { getPrisma } = require('./prisma-client');
const creditos = require('./creditos');
const push = require('./push');

/// Quantas notificacoes saem por rodada. Blocos pequenos mantem o processo
/// responsivo e deixam o disparo retomar de onde parou se a hospedagem
/// reiniciar o app no meio — coisa comum em plano compartilhado.
const TAMANHO_DO_BLOCO = 100;
const ENVIOS_SIMULTANEOS = 8;
const INTERVALO_MS = 15_000;

class ErroDisparo extends Error {}

// ---------------------------------------------------------------------------
// Enfileiramento
// ---------------------------------------------------------------------------

/// Congela a lista de destinatarios como linhas em notifications.
///
/// O INSERT ... SELECT resolve tudo no banco: buscar 150 mil apoiadores para a
/// memoria do Node so para inserir de volta derrubaria o processo no plano
/// compartilhado.
async function enfileirar(tx, campanha) {
  const cidade = campanha.filters?.city || null;
  const filtroCidade = cidade ? Prisma.sql`AND s.city = ${cidade}` : Prisma.empty;

  return tx.$executeRaw(Prisma.sql`
    INSERT INTO notifications
      (id, tenant_id, campaign_id, supporter_id, push_token_id, title, message, status, created_at)
    SELECT
      UUID(), s.tenant_id, ${campanha.id}, s.id,
      (SELECT pt.id FROM push_tokens pt
        WHERE pt.supporter_id = s.id AND pt.active = 1
        ORDER BY pt.last_seen_at DESC LIMIT 1),
      ${campanha.title}, ${campanha.message}, 'QUEUED', NOW(3)
    FROM supporters s
    WHERE s.tenant_id = ${campanha.tenantId}
      AND s.deleted_at IS NULL
      AND s.opted_out_at IS NULL
      AND s.push_active = 1
      AND EXISTS (SELECT 1 FROM push_tokens pt2 WHERE pt2.supporter_id = s.id AND pt2.active = 1)
      ${filtroCidade}`);
}

/// Coloca a campanha na fila. O credito e reservado agora, e nao a cada envio:
/// debitar mensagem a mensagem seriam milhares de transacoes, e deixaria a
/// campanha comecar sem garantia de saldo para terminar.
async function liberar(campanhaId, tenantId, userId) {
  const prisma = getPrisma();

  const campanha = await prisma.campaign.findFirst({ where: { id: campanhaId, tenantId } });
  if (!campanha) throw new ErroDisparo('Campanha não encontrada.');
  if (campanha.channel !== 'PUSH') {
    throw new ErroDisparo('Por enquanto só o push é enviado. Os outros canais aguardam a conexão do provedor.');
  }
  if (campanha.status !== 'DRAFT') {
    throw new ErroDisparo('Esta campanha já foi liberada.');
  }
  if (!push.configurado()) {
    throw new ErroDisparo('O push não está configurado no servidor.');
  }

  return prisma.$transaction(async (tx) => {
    const total = await enfileirar(tx, campanha);
    if (!total) {
      throw new ErroDisparo('Ninguém no público atual tem notificações ativas.');
    }

    const tenant = await tx.tenant.update({
      where: { id: tenantId },
      data: { creditBalance: { decrement: total } },
      select: { creditBalance: true },
    });
    if (tenant.creditBalance < 0) {
      throw new ErroDisparo(
        `Esta campanha precisa de ${total.toLocaleString('pt-BR')} disparos e não há saldo suficiente.`
      );
    }

    await tx.creditTransaction.create({
      data: {
        tenantId,
        type: 'CONSUMO',
        amount: -total,
        balanceAfter: tenant.creditBalance,
        description: `Campanha: ${campanha.name}`,
        campaignId: campanha.id,
        createdById: userId || null,
      },
    });

    await tx.campaign.update({
      where: { id: campanha.id },
      data: { status: 'SENDING', startedAt: new Date(), totalRecipients: total },
    });

    return { total, saldo: tenant.creditBalance };
  });
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

async function enviarUma(notificacao) {
  const prisma = getPrisma();

  // Todos os aparelhos da pessoa recebem, mas ela conta como um destinatario:
  // o credito e por pessoa alcancada, nao por tela.
  const tokens = await prisma.pushToken.findMany({
    where: { supporterId: notificacao.supporterId, active: true },
  });

  if (!tokens.length) {
    return { ok: false, erro: 'Sem inscrição ativa' };
  }

  const carga = {
    titulo: notificacao.title || notificacao.tenant?.name || 'Nova mensagem',
    corpo: notificacao.message,
    url: notificacao.url,
    campanha: notificacao.campaignId,
  };

  const resultados = await Promise.all(tokens.map((t) => push.enviarPara(t, carga)));
  const algumEntregou = resultados.some((r) => r.ok);

  return {
    ok: algumEntregou,
    erro: algumEntregou ? null : resultados[0]?.erro || 'Falha no envio',
  };
}

/// Processa um bloco de uma campanha. Devolve quantas sobraram para a proxima
/// rodada, para quem chamou saber se ainda ha trabalho.
async function processarBloco(campanha) {
  const prisma = getPrisma();

  const pendentes = await prisma.notification.findMany({
    where: { campaignId: campanha.id, status: 'QUEUED' },
    take: TAMANHO_DO_BLOCO,
  });

  if (!pendentes.length) return { processadas: 0, restantes: 0 };

  const url = `/${campanha.tenant.slug}`;
  let enviadas = 0;
  let falhas = 0;

  // Em fatias: disparar as 100 de uma vez abriria conexoes demais e o
  // servico de push comecaria a recusar.
  for (let i = 0; i < pendentes.length; i += ENVIOS_SIMULTANEOS) {
    const fatia = pendentes.slice(i, i + ENVIOS_SIMULTANEOS);
    const saidas = await Promise.all(
      fatia.map(async (n) => {
        const r = await enviarUma({ ...n, url, tenant: campanha.tenant });
        return { n, r };
      })
    );

    await prisma.$transaction(
      saidas.map(({ n, r }) =>
        prisma.notification.update({
          where: { id: n.id },
          data: r.ok
            ? { status: 'SENT', sentAt: new Date() }
            : { status: 'FAILED', error: String(r.erro).slice(0, 500) },
        })
      )
    );

    enviadas += saidas.filter((s) => s.r.ok).length;
    falhas += saidas.filter((s) => !s.r.ok).length;
  }

  await prisma.campaign.update({
    where: { id: campanha.id },
    data: {
      totalSent: { increment: enviadas },
      totalFailed: { increment: falhas },
    },
  });

  const restantes = await prisma.notification.count({
    where: { campaignId: campanha.id, status: 'QUEUED' },
  });

  return { processadas: pendentes.length, restantes };
}

/// Fecha a campanha e devolve o credito das falhas: cobrar por mensagem que
/// nao chegou seria cobrar pelo que nao foi entregue.
async function encerrar(campanha) {
  const prisma = getPrisma();
  const atual = await prisma.campaign.findUnique({ where: { id: campanha.id } });

  if (atual.totalFailed > 0) {
    await creditos
      .lancar({
        tenantId: atual.tenantId,
        tipo: 'ESTORNO',
        quantidade: atual.totalFailed,
        descricao: `Estorno de ${atual.totalFailed} envio(s) que falharam em "${atual.name}"`,
        campaignId: atual.id,
      })
      .catch((err) => console.error('[disparo] falha ao estornar:', err.message));
  }

  await prisma.campaign.update({
    where: { id: atual.id },
    data: {
      status: atual.totalSent > 0 ? 'SENT' : 'FAILED',
      finishedAt: new Date(),
    },
  });

  console.log(
    `[disparo] "${atual.name}" concluida: ${atual.totalSent} enviadas, ${atual.totalFailed} falhas`
  );
}

/// Uma rodada: pega as campanhas em envio e processa um bloco de cada.
async function rodada() {
  const prisma = getPrisma();
  const emAndamento = await prisma.campaign.findMany({
    where: { status: 'SENDING' },
    include: { tenant: { select: { slug: true, name: true } } },
    orderBy: { startedAt: 'asc' },
    take: 5,
  });

  let total = 0;
  for (const campanha of emAndamento) {
    const { processadas, restantes } = await processarBloco(campanha);
    total += processadas;
    if (!restantes) await encerrar(campanha);
  }
  return { campanhas: emAndamento.length, processadas: total };
}

// ---------------------------------------------------------------------------
// Laco de fundo
// ---------------------------------------------------------------------------

let rodando = false;
let timer = null;

/// Guarda contra sobreposicao: uma rodada lenta nao pode ser atropelada pela
/// seguinte e enviar a mesma notificacao duas vezes.
async function tick() {
  if (rodando) return;
  rodando = true;
  try {
    await rodada();
  } catch (err) {
    console.error('[disparo] erro na rodada:', err.message);
  } finally {
    rodando = false;
  }
}

function iniciarLaco() {
  if (timer) return;
  timer = setInterval(tick, INTERVALO_MS);
  timer.unref?.();
  console.log(`[disparo] laco ativo, verificando a cada ${INTERVALO_MS / 1000}s`);
}

module.exports = { liberar, rodada, tick, iniciarLaco, ErroDisparo, TAMANHO_DO_BLOCO };
