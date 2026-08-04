const { getPrisma } = require('./prisma-client');

class ErroEnvio extends Error {
  constructor(mensagem, { permanente = false, codigo } = {}) {
    super(mensagem);
    // Falha permanente nao adianta repetir: numero invalido continua invalido.
    // Falha temporaria (rede, limite do provedor) pode ser reenviada.
    this.permanente = permanente;
    this.codigo = codigo;
  }
}

// ---------------------------------------------------------------------------
// Provedores
// ---------------------------------------------------------------------------

/// Sem provedor configurado, a mensagem vai para o log do servidor. Serve para
/// desenvolvimento e evita que a aplicacao quebre quando falta credencial.
const consolePro = {
  nome: 'console',
  configurado: () => true,
  async enviar({ para, texto }) {
    console.log(`[SMS ${para}] ${texto}`);
    return { id: `console-${Date.now()}`, status: 'SENT' };
  },
};

/// Twilio pela API REST. O SDK oficial traria dependencia nativa e mais peso
/// no deploy sem ganho: sao duas chamadas HTTP com autenticacao basica.
const twilio = {
  nome: 'twilio',
  configurado: () =>
    Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),

  async enviar({ para, texto }) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const corpo = new URLSearchParams({
      To: `+${para}`,
      From: process.env.TWILIO_FROM,
      Body: texto,
    });

    let resposta;
    try {
      resposta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: corpo,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      // Rede ou tempo esgotado: o envio pode ter saido ou nao, e repetir e
      // preferivel a dar a mensagem por perdida.
      throw new ErroEnvio(`Falha de conexão com a Twilio: ${err.message}`);
    }

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      // A faixa 21xxx da Twilio e erro do pedido — numero invalido, remetente
      // errado, destino nao verificado na conta de teste. Repetir nao resolve.
      const permanente = resposta.status >= 400 && resposta.status < 500;
      throw new ErroEnvio(traduzir(dados) || `Twilio respondeu ${resposta.status}`, {
        permanente,
        codigo: dados.code,
      });
    }

    return { id: dados.sid, status: dados.status === 'failed' ? 'FAILED' : 'SENT' };
  },
};

/// Os erros mais comuns em portugues, porque quem le e o operador da campanha.
function traduzir(dados) {
  const mapa = {
    21211: 'Número de destino inválido.',
    21408: 'Sua conta Twilio não tem permissão para enviar SMS para este país.',
    21606: 'O número remetente não está habilitado para enviar SMS.',
    21610: 'Este número pediu para não receber mais mensagens.',
    21612: 'A Twilio não consegue entregar deste remetente para este destino.',
    21614: 'Número de destino não é um celular válido.',
    21608: 'Conta de teste: este número precisa ser verificado no painel da Twilio antes de receber mensagens.',
    20003: 'Credenciais da Twilio recusadas. Confira SID e token.',
  };
  return mapa[dados?.code] || dados?.message;
}

const PROVEDORES = { console: consolePro, twilio };

/// Escolhe o provedor pela configuracao. Cair no console quando falta
/// credencial e proposital: o cadastro continua funcionando em
/// desenvolvimento, e o log deixa claro que nada saiu de verdade.
function provedorAtual() {
  const escolhido = PROVEDORES[String(process.env.SMS_PROVEDOR || '').toLowerCase()];
  if (escolhido?.configurado()) return escolhido;
  if (escolhido && !escolhido.configurado()) {
    console.warn(`[sms] provedor "${escolhido.nome}" escolhido mas sem credenciais; usando console`);
  }
  return consolePro;
}

/// Envia e registra em sms_logs. O registro acontece com sucesso ou falha:
/// mensagem que nao saiu tambem precisa aparecer no historico.
async function enviar({ tenantId, supporterId, campaignId, para, texto, proposito = 'CAMPAIGN', canal = 'SMS' }) {
  const prisma = getPrisma();
  const provedor = provedorAtual();

  const base = {
    tenantId,
    supporterId: supporterId || null,
    campaignId: campaignId || null,
    phone: para,
    message: texto,
    purpose: proposito,
    channel: canal,
    provider: provedor.nome,
  };

  try {
    const resultado = await provedor.enviar({ para, texto });
    await prisma.smsLog.create({
      data: { ...base, status: resultado.status, providerMsgId: resultado.id, sentAt: new Date() },
    });
    return { ok: true, ...resultado };
  } catch (err) {
    await prisma.smsLog.create({
      data: { ...base, status: 'FAILED', error: String(err.message).slice(0, 500) },
    });
    return { ok: false, erro: err.message, permanente: err.permanente === true };
  }
}

function diagnostico() {
  const escolhido = String(process.env.SMS_PROVEDOR || 'console').toLowerCase();
  return {
    escolhido,
    conhecido: Boolean(PROVEDORES[escolhido]),
    configurado: Boolean(PROVEDORES[escolhido]?.configurado()),
    emUso: provedorAtual().nome,
  };
}

module.exports = { enviar, diagnostico, provedorAtual, ErroEnvio };
