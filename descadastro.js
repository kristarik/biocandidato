const { getPrisma } = require('./prisma-client');
const { metaCsp } = require('./seguranca');
const { esc, cor } = require('./html');
const chaves = require('./chaves');

/// Assina o link de saida. Sem assinatura, bastaria trocar o id na URL para
/// descadastrar a base inteira de um concorrente — o link viaja em mensagem e
/// fica exposto.
const PROPOSITO = 'sair';

function tokenDe(supporterId) {
  return chaves.criar(PROPOSITO, supporterId);
}

function lerToken(token) {
  return chaves.ler(PROPOSITO, token);
}

/// Monta o link que vai no rodape de cada disparo.
function linkDeSaida(tenantSlug, supporterId, base = '') {
  return `${base}/${tenantSlug}/sair?t=${encodeURIComponent(tokenDe(supporterId))}`;
}

/// Registra a saida. Nao apaga a pessoa: apagar deixaria o mesmo numero ser
/// recadastrado e voltar a receber, e perderia a prova de que ela pediu para
/// sair. Os consentimentos ativos sao revogados com data.
async function descadastrar(tenantId, supporterId, ip) {
  const prisma = getPrisma();
  const supporter = await prisma.supporter.findFirst({
    where: { id: supporterId, tenantId },
  });
  if (!supporter) return null;
  if (supporter.optedOutAt) return supporter;

  const agora = new Date();
  await prisma.$transaction([
    prisma.supporter.update({
      where: { id: supporter.id },
      data: { optedOutAt: agora, pushActive: false },
    }),
    prisma.consent.updateMany({
      where: { supporterId: supporter.id, granted: true, revokedAt: null },
      data: { granted: false, revokedAt: agora },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        action: 'OPT_OUT',
        entity: 'Supporter',
        entityId: supporter.id,
        ip,
      },
    }),
  ]);

  return supporter;
}

function pagina(tenant, { estado, telefone }) {
  const primaria = cor(tenant.primaryColor, '#1e40af');

  const conteudos = {
    confirmar: `
      <h1>Sair da lista de ${esc(tenant.name)}</h1>
      <p>Você deixa de receber mensagens desta campanha por push, WhatsApp, SMS e RCS.</p>
      <form method="post">
        <input type="hidden" name="t" value="${esc(telefone || '')}">
        <button type="submit">Confirmar saída</button>
      </form>
      <p class="miudo">Se você clicou sem querer, é só fechar esta página.</p>`,
    pronto: `
      <h1>Pronto, você saiu</h1>
      <p>Não vamos mais enviar mensagens desta campanha para o seu número.</p>
      <p class="miudo">Se mudar de ideia, você pode se cadastrar de novo na página do candidato.</p>
      <a class="voltar" href="/${esc(tenant.slug)}">Ver a página de ${esc(tenant.name)}</a>`,
    invalido: `
      <h1>Link inválido ou expirado</h1>
      <p>Não conseguimos identificar o cadastro por este link.</p>
      <p class="miudo">Responda a mensagem que você recebeu pedindo a remoção, ou fale com a campanha pela página do candidato.</p>
      <a class="voltar" href="/${esc(tenant.slug)}">Ver a página de ${esc(tenant.name)}</a>`,
  };

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">${metaCsp()}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sair da lista · ${esc(tenant.name)}</title>
<meta name="robots" content="noindex">
<style>
  :root { --primaria: ${primaria}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
    background: #f4f4f6; color: #1c1c1e;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.55;
  }
  .caixa {
    width: 100%; max-width: 26rem; background: #fff; border-radius: 16px;
    padding: 2rem 1.75rem; text-align: center; box-shadow: 0 12px 40px -20px rgba(0,0,0,.28);
  }
  h1 { font-size: 1.3rem; margin: 0 0 .8rem; letter-spacing: -.02em; }
  p { margin: 0 0 1rem; color: #5b6068; font-size: .95rem; }
  .miudo { font-size: .84rem; color: #8a9099; margin: 1rem 0 0; }
  button {
    width: 100%; padding: .9rem; border: 0; border-radius: 10px; cursor: pointer;
    background: var(--primaria); color: #fff; font: inherit; font-weight: 650;
    transition: transform 160ms cubic-bezier(.23,1,.32,1), filter 180ms ease;
  }
  button:active { transform: scale(.97); }
  @media (hover: hover) and (pointer: fine) { button:hover { filter: brightness(1.08); } }
  .voltar { display: inline-block; margin-top: .6rem; color: var(--primaria); font-size: .9rem; }
</style>
</head>
<body><div class="caixa">${conteudos[estado]}</div></body>
</html>`;
}

module.exports = { tokenDe, lerToken, linkDeSaida, descadastrar, pagina };
