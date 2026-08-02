const crypto = require('node:crypto');
const { getPrisma } = require('./prisma-client');

const VALIDADE_MINUTOS = 10;
const MAX_TENTATIVAS = 5;
const INTERVALO_REENVIO_SEGUNDOS = 60;

/// Versao do texto de consentimento exibido no formulario. Ao alterar o texto,
/// suba a versao: consentimentos antigos precisam continuar comprovaveis.
const CONSENTIMENTO_VERSAO = '1';
const CONSENTIMENTO_TEXTO =
  'Autorizo o recebimento de mensagens da campanha por SMS, WhatsApp e ' +
  'notificacoes, e o tratamento dos meus dados para fins de relacionamento ' +
  'com a campanha.';

class ErroCadastro extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

/// Reduz o telefone a digitos e valida como celular brasileiro:
/// 2 de DDD + 9 + 8 do numero. Retorna no formato E.164 sem o "+".
function normalizarTelefone(entrada) {
  let d = String(entrada || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  if (d.length !== 11 || d[2] !== '9') {
    throw new ErroCadastro('Informe um numero de celular valido com DDD.');
  }
  if (Number(d.slice(0, 2)) < 11) {
    throw new ErroCadastro('DDD invalido.');
  }
  return `55${d}`;
}

function normalizarCep(entrada) {
  const d = String(entrada || '').replace(/\D/g, '');
  if (d.length !== 8) throw new ErroCadastro('Informe um CEP valido.');
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function gerarCodigo() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCodigo(codigo) {
  return crypto.createHash('sha256').update(String(codigo)).digest('hex');
}

/// Comparacao em tempo constante: evita que o tempo de resposta revele
/// quantos digitos do codigo estao corretos.
function codigoConfere(codigo, hashGravado) {
  if (!hashGravado) return false;
  const a = Buffer.from(hashCodigo(codigo), 'hex');
  const b = Buffer.from(hashGravado, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/// Envio do SMS. Nenhum gateway esta integrado ainda, entao o codigo vai para
/// o log do servidor. Trocar por Integration quando o provedor for definido.
async function enviarSms(prisma, { tenantId, supporterId, phone, codigo }) {
  const mensagem = `Seu codigo de confirmacao e ${codigo}. Valido por ${VALIDADE_MINUTOS} minutos.`;

  await prisma.smsLog.create({
    data: {
      tenantId,
      supporterId,
      phone,
      message: mensagem,
      purpose: 'VERIFICATION',
      provider: 'console',
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  console.log(`[SMS ${phone}] ${mensagem}`);
}

/// Etapa 1: recebe o WhatsApp e dispara o codigo.
async function iniciar({ tenant, telefone, ip, userAgent, utm }) {
  const prisma = getPrisma();
  const phone = normalizarTelefone(telefone);

  const existente = await prisma.supporter.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
  });

  if (existente?.status === 'COMPLETO') {
    return { etapa: 'concluido', jaCadastrado: true };
  }

  // Reenvio muito seguido e sinal de abuso e custa SMS pago.
  if (
    existente?.verificationSentAt &&
    Date.now() - existente.verificationSentAt.getTime() < INTERVALO_REENVIO_SEGUNDOS * 1000
  ) {
    throw new ErroCadastro('Aguarde um instante antes de pedir um novo codigo.', 429);
  }

  const codigo = gerarCodigo();
  const dadosCodigo = {
    verificationHash: hashCodigo(codigo),
    verificationExpiresAt: new Date(Date.now() + VALIDADE_MINUTOS * 60_000),
    verificationAttempts: 0,
    verificationSentAt: new Date(),
  };

  const supporter = existente
    ? await prisma.supporter.update({ where: { id: existente.id }, data: dadosCodigo })
    : await prisma.supporter.create({
        data: {
          tenantId: tenant.id,
          phone,
          origin: utm?.source || 'organico',
          registrationIp: ip,
          userAgent,
          utmSource: utm?.source,
          utmMedium: utm?.medium,
          utmCampaign: utm?.campaign,
          utmContent: utm?.content,
          utmTerm: utm?.term,
          ...dadosCodigo,
        },
      });

  await enviarSms(prisma, {
    tenantId: tenant.id,
    supporterId: supporter.id,
    phone,
    codigo,
  });

  return {
    etapa: 'codigo',
    telefone: phone,
    // Sem gateway de SMS integrado nao ha como o usuario receber o codigo.
    // Este atalho existe so em desenvolvimento e nunca deve ir para producao.
    codigoDev: process.env.SMS_MODO === 'console' ? codigo : undefined,
  };
}

/// Etapa 2: confere o codigo recebido.
async function confirmar({ tenant, telefone, codigo, ip, userAgent }) {
  const prisma = getPrisma();
  const phone = normalizarTelefone(telefone);

  const supporter = await prisma.supporter.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
  });

  if (!supporter || !supporter.verificationHash) {
    throw new ErroCadastro('Peca um novo codigo.', 404);
  }
  if (supporter.verificationExpiresAt < new Date()) {
    throw new ErroCadastro('Codigo expirado. Peca um novo.', 410);
  }
  if (supporter.verificationAttempts >= MAX_TENTATIVAS) {
    throw new ErroCadastro('Muitas tentativas. Peca um novo codigo.', 429);
  }

  if (!codigoConfere(codigo, supporter.verificationHash)) {
    await prisma.supporter.update({
      where: { id: supporter.id },
      data: { verificationAttempts: { increment: 1 } },
    });
    throw new ErroCadastro('Codigo incorreto.');
  }

  await prisma.$transaction([
    prisma.supporter.update({
      where: { id: supporter.id },
      data: {
        status: supporter.status === 'COMPLETO' ? 'COMPLETO' : 'CONFIRMADO',
        smsValidated: true,
        smsValidatedAt: new Date(),
        verificationHash: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
      },
    }),
    // O consentimento nasce aqui: e a confirmacao do codigo que prova que
    // quem autorizou controla o numero informado.
    prisma.consent.create({
      data: {
        tenantId: tenant.id,
        supporterId: supporter.id,
        type: 'SMS',
        granted: true,
        textVersion: CONSENTIMENTO_VERSAO,
        textHash: crypto.createHash('sha256').update(CONSENTIMENTO_TEXTO).digest('hex'),
        ip,
        userAgent,
      },
    }),
  ]);

  return { etapa: 'dados', telefone: phone };
}

/// Etapa 3: nome e CEP, apos o numero ja confirmado.
async function completar({ tenant, telefone, nome, cep }) {
  const prisma = getPrisma();
  const phone = normalizarTelefone(telefone);

  const nomeLimpo = String(nome || '').trim().slice(0, 150);
  if (nomeLimpo.length < 2) throw new ErroCadastro('Informe seu nome.');

  const supporter = await prisma.supporter.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
  });

  if (!supporter) throw new ErroCadastro('Cadastro nao encontrado.', 404);
  if (supporter.status === 'PENDENTE') {
    throw new ErroCadastro('Confirme o codigo antes de continuar.', 409);
  }

  await prisma.supporter.update({
    where: { id: supporter.id },
    data: {
      name: nomeLimpo,
      cep: cep ? normalizarCep(cep) : null,
      status: 'COMPLETO',
    },
  });

  return { etapa: 'concluido' };
}

module.exports = {
  iniciar,
  confirmar,
  completar,
  ErroCadastro,
  CONSENTIMENTO_TEXTO,
  normalizarTelefone,
};
