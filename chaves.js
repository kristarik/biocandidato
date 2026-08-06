const crypto = require('node:crypto');

/// Chaves assinadas que viajam ate o navegador.
///
/// Existem porque o id de um apoiador nao pode circular solto: com ele na mao,
/// qualquer pessoa completaria o cadastro de outra ou penduraria o proprio
/// aparelho na inscricao alheia. Assinada, a chave so serve para quem a
/// recebeu.
function segredo() {
  const valor = process.env.JWT_SECRET;
  if (!valor || valor.length < 32) throw new Error('JWT_SECRET ausente.');
  return valor;
}

/// O proposito entra no HMAC para que uma chave nao sirva em outro lugar: a do
/// cadastro nao pode virar chave de descadastro, mesmo apontando para a mesma
/// pessoa.
function assinar(proposito, id) {
  return crypto
    .createHmac('sha256', segredo())
    .update(`${proposito}:${id}`)
    .digest('base64url')
    .slice(0, 32);
}

function criar(proposito, id) {
  return `${id}.${assinar(proposito, id)}`;
}

/// Devolve o id quando a assinatura confere, null quando nao. A comparacao e
/// de tempo constante: comparar com === vazaria, pelo tempo de resposta,
/// quantos caracteres do inicio o atacante ja acertou.
function ler(proposito, chave) {
  const bruto = String(chave || '');
  const corte = bruto.lastIndexOf('.');
  if (corte < 1) return null;

  const id = bruto.slice(0, corte);
  const assinatura = bruto.slice(corte + 1);
  const esperada = assinar(proposito, id);
  if (assinatura.length !== esperada.length) return null;

  return crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada)) ? id : null;
}

module.exports = { criar, ler };
