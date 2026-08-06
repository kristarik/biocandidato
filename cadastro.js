const crypto = require('node:crypto');
const { getPrisma } = require('./prisma-client');
const chaves = require('./chaves');

/// Proposito das chaves desta etapa. Separado do descadastro de proposito: a
/// chave que a pessoa recebe ao se cadastrar nao pode servir para tirar
/// ninguem da lista.
const PROPOSITO = 'apoio';

/// Versao do texto de consentimento exibido no formulario. Ao alterar o texto,
/// suba a versao: consentimentos antigos precisam continuar comprovaveis.
const CONSENTIMENTO_VERSAO = '2';
const CONSENTIMENTO_TEXTO =
  'Autorizo o recebimento de mensagens da campanha por notificacao, WhatsApp, ' +
  'SMS e RCS, e o tratamento dos meus dados para fins de relacionamento com a ' +
  'campanha. Posso sair da lista a qualquer momento.';

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
  if (!d) return null;
  if (d.length !== 8) throw new ErroCadastro('Informe um CEP valido.');
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function hashDoTexto(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

/// Etapa 1: o numero e o cadastro. Sem confirmacao por codigo, o telefone
/// informado ja vale — e o descadastro passa a ser o unico caminho de saida,
/// entao o link de saida precisa acompanhar todo disparo.
///
/// A resposta e a mesma para numero conhecido e numero novo, de proposito.
/// Qualquer diferenca — um "ja cadastrado", uma etapa adiantada — responderia
/// a pergunta "essa pessoa apoia esse candidato?" para quem so digitou o
/// numero dela. Preferencia politica e dado sensivel, e numero de celular
/// brasileiro se varre por faixa.
async function iniciar({ tenant, telefone, ip, userAgent, utm }) {
  const prisma = getPrisma();
  const phone = normalizarTelefone(telefone);

  const existente = await prisma.supporter.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
  });

  if (existente) {
    // Quem ja saiu e volta a se cadastrar esta pedindo para voltar.
    if (existente.optedOutAt) {
      await prisma.supporter.update({
        where: { id: existente.id },
        data: { optedOutAt: null },
      });
    }
    return { etapa: 'dados', telefone: phone, chave: chaves.criar(PROPOSITO, existente.id) };
  }

  const supporter = await prisma.supporter.create({
    data: {
      tenantId: tenant.id,
      phone,
      status: 'CONFIRMADO',
      origin: utm?.source || 'organico',
      registrationIp: ip,
      userAgent,
      utmSource: utm?.source,
      utmMedium: utm?.medium,
      utmCampaign: utm?.campaign,
      utmContent: utm?.content,
      utmTerm: utm?.term,
    },
  });

  // O consentimento nasce junto com o cadastro, guardando o texto exato que
  // estava na tela. Sem confirmacao por codigo, esse registro e a unica prova
  // do que foi aceito e quando.
  await prisma.consent.create({
    data: {
      tenantId: tenant.id,
      supporterId: supporter.id,
      type: 'DATA_PROCESSING',
      granted: true,
      textVersion: CONSENTIMENTO_VERSAO,
      textHash: hashDoTexto(CONSENTIMENTO_TEXTO),
      ip,
      userAgent,
    },
  });

  return { etapa: 'dados', telefone: phone, chave: chaves.criar(PROPOSITO, supporter.id) };
}

/// Etapa 2: nome e CEP, opcionais. Sao pedidos depois do numero ja estar
/// salvo, para que desistir aqui nao perca o contato.
///
/// Identifica pela chave assinada, nao pelo telefone: aceitar o telefone aqui
/// deixaria qualquer pessoa reescrever o nome de qualquer numero da base.
async function completar({ tenant, chave, nome, cep }) {
  const prisma = getPrisma();
  const id = chaves.ler(PROPOSITO, chave);
  if (!id) throw new ErroCadastro('Sessao de cadastro invalida. Comece de novo.', 400);

  const supporter = await prisma.supporter.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!supporter) throw new ErroCadastro('Cadastro nao encontrado.', 404);

  const nomeLimpo = String(nome || '').trim().slice(0, 150);
  if (nomeLimpo.length < 2) throw new ErroCadastro('Informe seu nome.');

  await prisma.supporter.update({
    where: { id: supporter.id },
    data: { name: nomeLimpo, cep: normalizarCep(cep), status: 'COMPLETO' },
  });

  return { etapa: 'concluido' };
}

module.exports = {
  iniciar,
  completar,
  PROPOSITO,
  ErroCadastro,
  CONSENTIMENTO_TEXTO,
  CONSENTIMENTO_VERSAO,
  normalizarTelefone,
};
