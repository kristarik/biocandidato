/// Teto de requisicoes por IP, em memoria.
///
/// Em memoria porque o app roda como um processo so na hospedagem
/// compartilhada. Com mais de um processo isso precisa ir para o Redis previsto
/// no documento — ate la, cada processo contaria sozinho e o teto real seria o
/// dobro.
const LIMPEZA_MS = 5 * 60_000;

/// Os tetos sao folgados de proposito. Operadora de celular poe milhares de
/// pessoas atras do mesmo IP, e num comicio a campanha inteira entra pela mesma
/// rede: um teto apertado barraria o eleitor de verdade antes do atacante. O
/// objetivo aqui nao e impedir o abuso pontual, e sim tirar a escala dele.
function criarLimite({ max, janelaMs, aoExceder }) {
  const registros = new Map();

  // Varre o que venceu. Sem isso o mapa cresceria para sempre: cada IP novo
  // deixa uma entrada, e quem troca de IP a cada pedido encheria a memoria do
  // processo sem nunca esbarrar no teto.
  const relogio = setInterval(() => {
    const agora = Date.now();
    for (const [chave, registro] of registros) {
      if (agora - registro.desde > janelaMs) registros.delete(chave);
    }
  }, LIMPEZA_MS);
  if (typeof relogio.unref === 'function') relogio.unref();

  return function limitar(req, res, next) {
    const chave = req.ip || 'desconhecido';
    const agora = Date.now();
    const registro = registros.get(chave);

    if (!registro || agora - registro.desde > janelaMs) {
      registros.set(chave, { contagem: 1, desde: agora });
      return next();
    }

    registro.contagem += 1;
    if (registro.contagem > max) return aoExceder(req, res);
    next();
  };
}

/// Recusa em JSON, no formato que o formulario do WebApp ja sabe mostrar.
function recusarJson(mensagem) {
  return (req, res) => res.status(429).json({ erro: mensagem });
}

module.exports = { criarLimite, recusarJson };
