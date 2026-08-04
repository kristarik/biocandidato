const webpush = require('web-push');
const { getPrisma } = require('./prisma-client');

function configurado() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let pronto = false;
function preparar() {
  if (pronto) return true;
  if (!configurado()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contato@candidato.bio',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  pronto = true;
  return true;
}

function chavePublica() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

/// Guarda a inscricao do navegador. A mesma pessoa pode reabrir a pagina e
/// reinscrever com o mesmo endpoint, entao a gravacao e idempotente.
async function inscrever({ tenantId, supporterId, inscricao, userAgent }) {
  const endpoint = String(inscricao?.endpoint || '');
  const p256dh = inscricao?.keys?.p256dh;
  const auth = inscricao?.keys?.auth;

  if (!endpoint.startsWith('https://') || !p256dh || !auth) {
    const erro = new Error('Inscrição de push inválida.');
    erro.status = 400;
    throw erro;
  }

  // Toda inscricao pertence a um apoiador: o convite para ativar avisos so
  // aparece depois do numero estar salvo, e uma inscricao sem dono nao teria
  // como entrar no alcance de nenhuma campanha.
  if (!supporterId) {
    const erro = new Error('Faça o cadastro antes de ativar os avisos.');
    erro.status = 400;
    throw erro;
  }

  const prisma = getPrisma();
  const comum = {
    p256dh,
    auth,
    platform: String(userAgent || '').slice(0, 30) || null,
    active: true,
    lastSeenAt: new Date(),
  };

  await prisma.$transaction([
    prisma.pushToken.upsert({
      where: { tenantId_token: { tenantId, token: endpoint } },
      create: { tenantId, token: endpoint, supporterId, ...comum },
      update: { supporterId, ...comum },
    }),
    // O apoiador so conta como alcancavel depois que o navegador devolveu uma
    // inscricao valida: a permissao pode ter sido concedida e a inscricao ter
    // falhado logo em seguida.
    prisma.supporter.update({
      where: { id: supporterId },
      data: { pushActive: true },
    }),
  ]);

  return { ok: true };
}

/// Envia para uma inscricao. Erro 404 ou 410 significa que o navegador
/// descartou a inscricao — a linha e desativada em vez de tentada de novo
/// para sempre.
async function enviarPara(pushToken, carga) {
  if (!preparar()) return { ok: false, erro: 'VAPID não configurado', permanente: true };

  try {
    await webpush.sendNotification(
      {
        endpoint: pushToken.token,
        keys: { p256dh: pushToken.p256dh, auth: pushToken.auth },
      },
      JSON.stringify(carga),
      { TTL: 60 * 60 * 12 }
    );
    return { ok: true };
  } catch (err) {
    const morto = err.statusCode === 404 || err.statusCode === 410;
    if (morto) {
      const prisma = getPrisma();
      await prisma.pushToken.update({
        where: { id: pushToken.id },
        data: { active: false },
      }).catch(() => {});
      if (pushToken.supporterId) {
        await prisma.supporter.update({
          where: { id: pushToken.supporterId },
          data: { pushActive: false },
        }).catch(() => {});
      }
    }
    return { ok: false, erro: err.body || err.message, permanente: morto, status: err.statusCode };
  }
}

module.exports = { configurado, chavePublica, inscrever, enviarPara, preparar };
