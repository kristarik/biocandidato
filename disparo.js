const { Prisma } = require('@prisma/client');
const { getPrisma } = require('./prisma-client');
const creditos = require('./creditos');
const push = require('./push');
const { linkDeSaida } = require('./descadastro');

/// Quantas notificacoes saem por rodada. Blocos pequenos mantem o processo
/// responsivo e deixam o disparo retomar de onde parou se a hospedagem
/// reiniciar o app no meio — coisa comum em plano compartilhado.
const TAMANHO_DO_BLOCO = 100;
const ENVIOS_SIMULTANEOS = 8;
const INTERVALO_MS = 15_000;

class ErroDisparo extends Error {}

/// Monta a carga que o service worker recebe.
///
/// O endereco precisa ser absoluto: o navegador baixa a imagem fora da pagina,
/// sem origem para completar um caminho que comece com barra.
function montarCarga({ titulo, corpo, url, campanha, imagem, tenant, supporterId }) {
  const raiz = (process.env.APP_URL || `https://${process.env.APP_DOMAIN || 'candidato.bio'}`).replace(/\/+$/, '');
  const absoluta = (caminho) =>
    !caminho ? undefined : /^https?:\/\//i.test(caminho) ? caminho : `${raiz}${caminho}`;

  return {
    titulo,
    corpo,
    url,
    campanha,
    // A foto do candidato como icone: e o unico dos dois que aparece em todo
    // aparelho, entao vale mais que a imagem grande.
    icone: absoluta(tenant?.photoUrl),
    imagem: absoluta(imagem),
    // O caminho de saida viaja com a mensagem porque a notificacao e o unico
    // lugar onde ele pode aparecer sem risco: chega no aparelho de quem se
    // cadastrou, e nao numa resposta que qualquer um consegue pedir digitando
    // o telefone dos outros. Sem supporterId — o teste do painel — nao ha
    // ninguem para descadastrar.
    sair: supporterId && tenant?.slug ? linkDeSaida(tenant.slug, supporterId) : undefined,
  };
}

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

/// Envia a campanha so para quem esta operando o painel, sem tocar na base
/// nem no saldo. Existe porque erro de texto so aparece na tela do celular:
/// no formulario tudo parece certo, e depois de disparar nao tem volta.
async function enviarTeste(campanhaId, tenantId, userId) {
  const prisma = getPrisma();

  const campanha = await prisma.campaign.findFirst({
    where: { id: campanhaId, tenantId },
    include: { tenant: { select: { slug: true, name: true, photoUrl: true } } },
  });
  if (!campanha) throw new ErroDisparo('Campanha não encontrada.');
  if (campanha.channel !== 'PUSH') {
    throw new ErroDisparo('Só o push pode ser testado por enquanto.');
  }

  const inscricoes = await prisma.pushToken.findMany({
    where: { tenantId, active: true, userId },
  });

  if (!inscricoes.length) {
    throw new ErroDisparo(
      'Ative os avisos neste aparelho antes de testar. O botão fica no topo desta página.'
    );
  }

  const carga = montarCarga({
    titulo: campanha.title || campanha.tenant.name,
    corpo: campanha.message,
    url: `/${campanha.tenant.slug}`,
    campanha: `teste-${campanha.id}`,
    imagem: campanha.imageUrl,
    tenant: campanha.tenant,
  });

  const saidas = await Promise.all(inscricoes.map((i) => push.enviarPara(i, carga)));
  const entregues = saidas.filter((s) => s.ok).length;

  if (!entregues) {
    // A mensagem do servico de push vem crua, com quebras de linha.
    const motivo = String(saidas[0]?.erro || 'falha no envio').replace(/\s+/g, ' ').trim();
    throw new ErroDisparo(
      saidas[0]?.permanente
        ? `A inscrição deste aparelho expirou. Toque em "Ativar avisos aqui" de novo. (${motivo})`
        : `Não foi possível entregar o teste: ${motivo}`
    );
  }
  return { entregues, aparelhos: inscricoes.length };
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

  const carga = montarCarga({
    titulo: notificacao.title || notificacao.tenant?.name || 'Nova mensagem',
    corpo: notificacao.message,
    url: notificacao.url,
    campanha: notificacao.campaignId,
    imagem: notificacao.imagem,
    tenant: notificacao.tenant,
    supporterId: notificacao.supporterId,
  });

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
        const r = await enviarUma({ ...n, url, tenant: campanha.tenant, imagem: campanha.imageUrl });
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
    include: { tenant: { select: { slug: true, name: true, photoUrl: true } } },
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

module.exports = {
  liberar, enviarTeste, rodada, tick, iniciarLaco, ErroDisparo, TAMANHO_DO_BLOCO,
};
