const { getPrisma } = require('./prisma-client');
const { esc, cor, urlSegura, tagsDeIcone } = require('./html');

// Icones em SVG inline: sem requisicao externa, herdam a cor do container.
const ICONES = {
  whatsapp:
    '<path d="M12 2a10 10 0 0 0-8.7 15l-1.2 4.3 4.4-1.2A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.6-4.8c-.4-.7-.9-1.6-.9-2.5 0-.9.5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.8c0 .2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.2.1.4.1.6-.1l.7-.9c.2-.2.3-.2.5-.1l1.7.8c.2.1.4.2.4.3v1Z"/>',
  instagram:
    '<path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.3 2.2-.4 1.3-.1 1.7-.1 4.9-.1Zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8Zm0 10.6a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm6.6-10.9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>',
  tiktok:
    '<path d="M16.5 2h-3v13.4a2.6 2.6 0 1 1-2-2.5V9.8a5.9 5.9 0 1 0 5 5.8V9.3c1 .7 2.3 1.1 3.5 1.1V7.3a4 4 0 0 1-3.5-3.6V2Z"/>',
  youtube:
    '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z"/>',
  facebook:
    '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/>',
  telegram:
    '<path d="M21.9 5.4 18.7 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 12.7l-4.8-1.5c-1-.3-1.1-1 .2-1.5l18.8-7.2c.9-.3 1.6.2 1.4 1Z"/>',
  x: '<path d="M17.5 3h3l-6.6 7.5L21.7 21h-6l-4.7-6.2L5.6 21h-3l7-8L2.6 3h6.2l4.3 5.7L17.5 3Zm-1 16h1.6L7.6 4.7H5.9L16.5 19Z"/>',
  site: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.3a15 15 0 0 0-1.3-5.6A8 8 0 0 1 19.9 11ZM12 4.1c.8 1.1 1.8 3.4 2 6.9h-4c.2-3.5 1.2-5.8 2-6.9ZM4.1 11a8 8 0 0 1 4.6-5.6A15 15 0 0 0 7.4 11H4.1Zm0 2h3.3a15 15 0 0 0 1.3 5.6A8 8 0 0 1 4.1 13ZM12 19.9c-.8-1.1-1.8-3.4-2-6.9h4c-.2 3.5-1.2 5.8-2 6.9Zm3.3-1.3a15 15 0 0 0 1.3-5.6h3.3a8 8 0 0 1-4.6 5.6Z"/>',
};

function icone(nome, tamanho = 24) {
  const caminho = ICONES[String(nome).toLowerCase()] || ICONES.site;
  return `<svg viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}" fill="currentColor" aria-hidden="true">${caminho}</svg>`;
}

// Abas do menu fixo no rodape, estilo aplicativo.
const ABAS = [
  ['inicio', 'Início', '<path d="M12 3 3 10v10h6v-6h6v6h6V10L12 3Z"/>'],
  ['propostas', 'Propostas', '<path d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.6H8V12Zm0 4h8v1.6H8V16Z"/>'],
  ['apoiar', 'Apoiar', '<path d="M12 21s-8-5.2-8-10.3A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 8 3.7C20 15.8 12 21 12 21Z"/>'],
  ['redes', 'Redes', '<path d="M18 8a3 3 0 1 0-2.8-4H15L8.9 7.6A3 3 0 1 0 9 16.4l6.2 3.6h.2A3 3 0 1 0 18 16a3 3 0 0 0-1.9.7L10 13.2a3 3 0 0 0 0-2.4l6.1-3.5A3 3 0 0 0 18 8Z"/>'],
  ['links', 'Links', '<path d="M7.1 18.4a4 4 0 0 1 0-5.7l2.1-2.1 1.4 1.4-2.1 2.1a2 2 0 0 0 2.8 2.8l2.1-2.1 1.4 1.4-2.1 2.1a4 4 0 0 1-5.6 0Zm2.1-4.3-1.4-1.4 6.4-6.4 1.4 1.4-6.4 6.4Zm7.7-2.4-1.4-1.4 2.1-2.1a2 2 0 1 0-2.8-2.8l-2.1 2.1-1.4-1.4 2.1-2.1a4 4 0 0 1 5.6 5.7l-2.1 2Z"/>'],
];

function blocoBanner(banner) {
  if (!banner) return '';
  const img = `<img src="${esc(banner.imageUrl)}" alt="${esc(banner.alt || 'Divulgação')}" loading="lazy">`;
  const destino = banner.linkUrl ? urlSegura(banner.linkUrl) : null;
  const conteudo = destino
    ? `<a href="${esc(destino)}" target="_blank" rel="noopener noreferrer">${img}</a>`
    : img;
  return `<div class="banner-divulgacao">${conteudo}</div>`;
}

/// O bloco de captura aparece duas vezes na pagina, entao precisa de um id
/// proprio em cada instancia para o JS tratar os dois de forma independente.
function blocoApoio(indice, ancora) {
  return `
<section class="apoio" ${ancora ? 'id="apoiar"' : ''} data-apoio="${indice}">
  <h2>SEU APOIO FAZ TODA A DIFERENÇA</h2>
  <p class="subtitulo">DEMONSTRE SEU APOIO AO CANDIDATO CADASTRANDO SEU WHATSAPP</p>

  <form class="etapa etapa-telefone" novalidate>
    <label class="campo">
      <span class="campo-icone">${icone('whatsapp', 20)}</span>
      <input type="tel" name="telefone" inputmode="numeric" autocomplete="tel"
        placeholder="INFORME SEU WHATSAPP (  ) X.XXXX-XXXX" required>
    </label>
    <button type="submit">CADASTRAR AGORA</button>
  </form>

  <form class="etapa etapa-dados" hidden novalidate>
    <p class="ajuda">Recebemos seu número. Quer que a campanha te chame pelo nome?</p>
    <label class="campo">
      <input type="text" name="nome" autocomplete="name" placeholder="SEU NOME COMPLETO" required>
    </label>
    <label class="campo">
      <input type="text" name="cep" inputmode="numeric" autocomplete="postal-code"
        maxlength="9" placeholder="SEU CEP (OPCIONAL)">
    </label>
    <button type="submit">CONTINUAR</button>
    <button type="button" class="secundario pular">Agora não</button>
  </form>

  <div class="etapa etapa-push" hidden>
    <p class="ajuda">Falta um passo. Ative os avisos para saber das novidades primeiro.</p>
    <button type="button" class="ativar-push">ATIVAR AVISOS NO CELULAR</button>
    <button type="button" class="secundario pular-push">Agora não</button>
  </div>

  <div class="etapa etapa-fim" hidden>
    <p class="sucesso">Cadastro concluído. Obrigado pelo seu apoio!</p>
  </div>

  <p class="consentimento">
    Ao se cadastrar você autoriza o recebimento de mensagens desta campanha e
    pode sair da lista quando quiser.
  </p>

  <p class="aviso" role="alert" hidden></p>
</section>`;
}

function render(t, { chavePush, proporcaoCapa } = {}) {
  const primaria = cor(t.primaryColor, '#1e40af');

  /// Cartaz: imagem em pe ou quase quadrada. A capa passa a seguir a
  /// proporcao da propria arte em vez da faixa fixa, para a peca aparecer
  /// inteira em vez de ser cortada numa tira.
  const eCartaz = Boolean(t.bannerUrl && proporcaoCapa && proporcaoCapa < 1.3);
  const secundaria = cor(t.secondaryColor, '#f59e0b');
  const local = [t.city, t.state].filter(Boolean).join(' - ');
  const bannerPor = (slot) => t.banners.find((b) => b.slot === slot);

  const propostas = t.proposals.length
    ? `<section id="propostas">
        <h2>PROPOSTAS DO CANDIDATO</h2>
        <p class="subtitulo">DESLIZE E CONFIRA AS PROPOSTAS DO CANDIDATO</p>
        <p class="setas" aria-hidden="true">← →</p>
        <div class="carrossel">
          ${t.proposals
            .map(
              (p, i) => `<article class="proposta">
                <h3>${esc(p.title)}</h3>
                ${p.description ? `<p>${esc(p.description)}</p>` : ''}
                ${
                  p.content
                    ? `<button type="button" class="abrir-proposta" data-proposta="${i}">ACESSAR AGORA</button>`
                    : ''
                }
              </article>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  const redes = t.socialLinks.length
    ? `<section id="redes">
        <h2>ME ACOMPANHE NAS REDES</h2>
        <p class="subtitulo">CLIQUE NO LINK E ME SIGA NOS CANAIS OFICIAIS</p>
        <p class="setas" aria-hidden="true">← →</p>
        <div class="redes-lista">
          ${t.socialLinks
            .map((r) => {
              const destino = urlSegura(r.url);
              if (!destino) return '';
              return `<a href="${esc(destino)}" target="_blank" rel="noopener noreferrer"
                aria-label="${esc(r.platform)}">${icone(r.platform, 32)}</a>`;
            })
            .join('')}
        </div>
      </section>`
    : '';

  const links = t.links.length
    ? `<section id="links">
        <h2>LINKS IMPORTANTES</h2>
        <p class="subtitulo">CLIQUE NO LINK</p>
        <div class="links-lista">
          ${t.links
            .map((l) => {
              const destino = urlSegura(l.url);
              if (!destino) return '';
              const marca = l.iconUrl
                ? `<img src="${esc(l.iconUrl)}" alt="" loading="lazy">`
                : `<span class="inicial">${esc(l.label.trim().charAt(0).toUpperCase())}</span>`;
              return `<a href="${esc(destino)}" target="_blank" rel="noopener noreferrer">
                <span class="marca">${marca}</span><span class="rotulo">${esc(l.label)}</span></a>`;
            })
            .join('')}
        </div>
      </section>`
    : '';

  // Conteudo dos lightboxes, enviado junto para abrir sem nova requisicao.
  const conteudoPropostas = t.proposals.map((p) => ({
    titulo: p.title,
    texto: p.content || '',
  }));

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.name)}${t.number ? ` ${esc(t.number)}` : ''}</title>
<meta name="description" content="${esc(t.slogan || t.bio || t.name)}">
<meta name="theme-color" content="${primaria}">
${tagsDeIcone()}
<link rel="manifest" href="/${esc(t.slug)}/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(t.name)}">
<style>
  :root {
    --primaria: ${primaria};
    --secundaria: ${secundaria};
    /* Botoes e cartoes vestem a cor do candidato, nao um preto neutro: a
       identidade dele precisa aparecer no site inteiro, nao so no topo.
       Campanha com paleta fechada informa o proprio tom escuro; sem ele,
       escurecemos a cor principal para garantir contraste do texto branco. */
    --escuro: ${cor(t.darkColor, '') || `color-mix(in srgb, ${primaria} 82%, #000)`};
    --superficie: #f4f4f6;
    --texto: #1c1c1e;
    --suave: #6b6b70;
    --borda: #e2e2e6;
    --fundo: #fff;
    --nav: 66px;
    --coluna: 480px;
  }
  /* O WebApp e sempre claro, mesmo com o sistema em modo escuro: a identidade
     visual do candidato precisa ser a mesma para todo eleitor. */
  * { box-sizing: border-box; }

  /* No desktop o WebApp nao estica: vira uma coluna centralizada com largura
     de celular, sobre um fundo tingido com a cor do candidato. O layout foi
     desenhado para a mao, e esticado em tela larga ele se desfaz. */
  html {
    background: var(--fundo);
    min-height: 100%;
  }
  body {
    margin: 0 auto; max-width: var(--coluna); min-height: 100vh;
    background: var(--fundo); color: var(--texto);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5; padding-bottom: calc(var(--nav) + env(safe-area-inset-bottom));
  }
  @media (min-width: 560px) {
    html {
      background:
        linear-gradient(170deg,
          color-mix(in srgb, var(--primaria) 14%, #eef0f4),
          color-mix(in srgb, var(--secundaria) 10%, #eef0f4));
      background-attachment: fixed;
    }
    body { box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 18px 60px rgba(0,0,0,.13); }
  }
  img { max-width: 100%; display: block; }

  /* ---------- topo ---------- */
  .topo { position: relative; text-align: center; }
  /* Com banner cadastrado, a imagem manda. Sem banner, a faixa usa a cor do
     candidato em vez de preto: identidade visual em vez de tarja vazia. */
  .topo .capa {
    ${
      eCartaz
        ? `aspect-ratio: ${proporcaoCapa.toFixed(4)};
    background: url("${esc(t.bannerUrl)}") center / cover no-repeat, var(--primaria);`
        : `height: 190px;
    background: ${
      t.bannerUrl
        ? `url("${esc(t.bannerUrl)}") center / cover no-repeat, var(--primaria)`
        : `linear-gradient(160deg, var(--primaria), color-mix(in srgb, var(--primaria) 62%, #000))`
    };`
    }
  }
  .topo .retrato {
    width: 148px; height: 148px; border-radius: 50%; object-fit: cover;
    margin: -74px auto 0; border: 5px solid var(--fundo); background: var(--superficie);
    position: relative;
  }
  .topo .sem-foto {
    display: grid; place-items: center; font-size: 3rem; font-weight: 700;
    color: var(--suave);
  }
  .identidade { padding: 1rem 1.25rem 0; }
  .identidade h1 {
    margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.1;
  }
  .identidade .numero {
    margin: .1rem 0 0; font-size: 1.85rem; font-weight: 800;
    color: var(--suave); letter-spacing: -.03em;
  }
  .identidade .meta {
    margin: .5rem 0 0; font-size: .8rem; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase; color: var(--primaria);
  }
  .resumo {
    max-width: 34rem; margin: .9rem auto 0; padding: 0 1.5rem;
    font-size: .93rem; color: var(--suave);
  }

  /* ---------- meu curriculo ---------- */
  .curriculo {
    max-width: 34rem; margin: 1rem auto 0; text-align: left;
    border: 1px solid var(--borda); border-radius: 12px; overflow: hidden;
  }
  .curriculo summary {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: .85rem 1.1rem; cursor: pointer; list-style: none;
    font-size: .88rem; font-weight: 650; color: var(--primaria);
  }
  .curriculo summary::-webkit-details-marker { display: none; }
  .curriculo summary svg { flex: 0 0 auto; transition: transform 220ms cubic-bezier(.23,1,.32,1); }
  .curriculo[open] summary svg { transform: rotate(180deg); }
  .curriculo-corpo { padding: 0 1.1rem 1.1rem; }
  .curriculo-corpo p {
    margin: 0; font-size: .89rem; color: var(--suave); white-space: pre-line;
  }
  @media (hover: hover) and (pointer: fine) {
    .curriculo summary:hover { background: var(--superficie); }
  }

  /* ---------- secoes ---------- */
  section { padding: 2.25rem 0 0; }
  section h2 {
    margin: 0 1.25rem; font-size: 1.15rem; font-weight: 800; text-align: center;
    letter-spacing: -.01em; text-transform: uppercase;
  }
  .subtitulo {
    margin: .3rem 1.25rem 0; text-align: center; font-size: .75rem;
    letter-spacing: .04em; text-transform: uppercase; color: var(--suave);
  }
  .setas { margin: .35rem 0 0; text-align: center; color: var(--suave); letter-spacing: .5rem; }

  /* ---------- carrossel de propostas ---------- */
  /* A cidade entra escurecida atras dos cartoes: sem o veu escuro, foto de rua
     compete com o texto e nenhum dos dois se le. */
  ${
    t.proposalsBgUrl
      ? `#propostas {
    background:
      linear-gradient(to bottom, rgba(8,12,20,.84), rgba(8,12,20,.92)),
      url("${esc(t.proposalsBgUrl)}") center / cover no-repeat;
    padding-bottom: 1.5rem; margin-bottom: .5rem;
  }
  #propostas h2 { color: #fff; }
  #propostas .subtitulo, #propostas .setas { color: rgba(255,255,255,.7); }
  #propostas .proposta {
    background: rgba(255,255,255,.1);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.14);
  }
  #propostas .proposta button { background: #fff; color: var(--texto); }`
      : ''
  }
  .carrossel {
    display: flex; gap: .9rem; margin-top: 1rem; padding: .25rem 1.25rem 1rem;
    overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; cursor: grab;
  }
  .carrossel::-webkit-scrollbar { display: none; }
  /* Durante o arrasto o encaixe e desligado: com scroll-snap ativo o navegador
     puxa o conteudo de volta e o movimento fica travando. */
  .arrastando { cursor: grabbing; scroll-snap-type: none; user-select: none; }
  .arrastando a, .arrastando img { -webkit-user-drag: none; }
  .proposta {
    flex: 0 0 78%; max-width: 300px; scroll-snap-align: center;
    background: var(--escuro); color: #fff; border-radius: 14px;
    padding: 1.4rem 1.15rem 1.15rem; display: flex; flex-direction: column;
    justify-content: space-between; min-height: 190px; text-align: center;
  }
  .proposta h3 { margin: 0; font-size: 1rem; font-weight: 700; }
  .proposta p { margin: .5rem 0 0; font-size: .85rem; color: rgba(255,255,255,.72); }
  .proposta button {
    margin-top: 1.1rem; padding: .7rem; border: 0; border-radius: 8px;
    background: #fff; color: var(--escuro); font-weight: 700; font-size: .75rem;
    letter-spacing: .08em; cursor: pointer;
  }

  /* ---------- banners ---------- */
  .banner-divulgacao { margin: 2rem 1.25rem 0; border-radius: 12px; overflow: hidden; }
  .banner-divulgacao img { width: 100%; }

  /* ---------- captura ---------- */
  .apoio { padding: 2.25rem 1.25rem 0; }
  .apoio form, .apoio .etapa-fim { max-width: 34rem; margin: 1rem auto 0; }
  .campo {
    display: flex; align-items: center; gap: .6rem; margin-bottom: .6rem;
    padding: .1rem .9rem; background: var(--fundo);
    border: 1.5px solid var(--borda); border-radius: 999px;
  }
  .campo:focus-within { border-color: var(--primaria); }
  .campo-icone { color: var(--suave); display: flex; }
  .campo input {
    flex: 1; border: 0; background: none; color: var(--texto);
    padding: .85rem 0; font-size: .88rem; font-family: inherit; min-width: 0;
  }
  .campo input:focus { outline: none; }
  .campo input::placeholder { color: var(--suave); letter-spacing: .02em; }
  .apoio button[type="submit"] {
    width: 100%; padding: .95rem; border: 0; border-radius: 8px;
    background: var(--escuro); color: #fff; font-size: .95rem; font-weight: 700;
    letter-spacing: .05em; cursor: pointer; font-family: inherit;
  }
  .apoio button[type="submit"]:disabled { opacity: .55; cursor: progress; }
  .apoio .secundario {
    width: 100%; margin-top: .5rem; padding: .6rem; border: 0; background: none;
    color: var(--suave); font-size: .82rem; cursor: pointer; font-family: inherit;
    text-decoration: underline;
  }
  .ajuda { margin: 0 0 .75rem; text-align: center; font-size: .85rem; color: var(--suave); }
  .sucesso {
    margin: 0; padding: 1.1rem; text-align: center; border-radius: 10px;
    background: var(--superficie); font-weight: 600;
  }
  .apoio .ativar-push {
    width: 100%; padding: .95rem; border: 0; border-radius: 8px; cursor: pointer;
    background: var(--secundaria); color: #1c1c1e; font-size: .95rem; font-weight: 700;
    letter-spacing: .05em; font-family: inherit;
    transition: transform 160ms cubic-bezier(.23,1,.32,1);
  }
  .apoio .ativar-push:active { transform: scale(.97); }
  .apoio .ativar-push:disabled { opacity: .55; cursor: progress; }
  .consentimento {
    max-width: 34rem; margin: .9rem auto 0; text-align: center;
    font-size: .74rem; color: var(--suave); line-height: 1.4;
  }
  .aviso {
    max-width: 34rem; margin: .7rem auto 0; padding: .7rem .9rem; border-radius: 8px;
    background: #fdecec; color: #a3272a; font-size: .84rem; text-align: center;
  }

  /* ---------- redes ---------- */
  /* "safe center" centraliza quando cabe e alinha ao inicio quando transborda.
     Com "center" puro o navegador corta os primeiros icones e eles ficam
     inalcancaveis pela rolagem. */
  .redes-lista {
    display: flex; gap: 1rem; justify-content: safe center; flex-wrap: nowrap;
    margin-top: 1.1rem; padding: 0 1.25rem 0; overflow-x: auto; scrollbar-width: none;
    cursor: grab;
  }
  .redes-lista::-webkit-scrollbar { display: none; }
  .redes-lista a {
    flex: 0 0 auto; width: 62px; height: 62px; border-radius: 50%;
    background: var(--escuro); color: #fff; display: grid; place-items: center;
  }

  /* ---------- links ---------- */
  .links-lista { display: grid; gap: .6rem; margin-top: 1.1rem; padding: 0 1.25rem; }
  .links-lista a {
    display: flex; align-items: center; gap: .8rem; padding: .55rem .9rem .55rem .55rem;
    background: var(--superficie); border-radius: 999px;
    color: var(--texto); text-decoration: none;
  }
  .links-lista .marca {
    flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%; overflow: hidden;
    background: var(--fundo); display: grid; place-items: center;
  }
  .links-lista .marca img { width: 100%; height: 100%; object-fit: cover; }
  .links-lista .inicial { font-weight: 700; color: var(--primaria); }
  .links-lista .rotulo { font-size: .88rem; font-weight: 600; }

  /* ---------- lightbox ---------- */
  dialog {
    width: min(94vw, 34rem); max-height: 82vh; padding: 0; border: 0;
    border-radius: 16px; background: var(--fundo); color: var(--texto);
  }
  dialog::backdrop { background: rgba(0,0,0,.55); }
  dialog .conteudo { padding: 1.6rem 1.4rem; overflow-y: auto; max-height: 68vh; }
  dialog h3 { margin: 0 0 .8rem; font-size: 1.15rem; }
  dialog p { margin: 0; white-space: pre-wrap; font-size: .92rem; color: var(--suave); }
  dialog .fechar {
    width: 100%; padding: .9rem; border: 0; border-top: 1px solid var(--borda);
    background: none; color: var(--primaria); font-weight: 700; cursor: pointer;
    font-family: inherit; font-size: .9rem;
  }

  /* ---------- menu estilo aplicativo ---------- */
  /* Fixa na viewport, mas presa a largura da coluna: sem isso ela atravessaria
     a tela inteira no desktop e romperia o formato. */
  .barra {
    position: fixed; bottom: 0; z-index: 20;
    left: 50%; transform: translateX(-50%);
    width: 100%; max-width: var(--coluna);
    display: flex; background: var(--fundo); border-top: 1px solid var(--borda);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .barra a {
    flex: 1; padding: .5rem 0 .45rem; display: grid; gap: .15rem; justify-items: center;
    color: var(--suave); text-decoration: none; font-size: .62rem; font-weight: 600;
    letter-spacing: .02em;
  }
  .barra a.destaque { color: var(--primaria); }
  .barra svg { display: block; }

  footer { padding: 2.5rem 1.25rem 1.5rem; text-align: center; font-size: .72rem; color: var(--suave); }
</style>
</head>
<body>

<div class="topo" id="inicio">
  <div class="capa"></div>
  ${
    t.photoUrl
      ? `<img class="retrato" src="${esc(t.photoUrl)}" alt="${esc(t.name)}">`
      : `<div class="retrato sem-foto">${esc(t.name.trim().charAt(0).toUpperCase())}</div>`
  }
  <div class="identidade">
    <h1>${esc(t.name)}</h1>
    ${t.number ? `<p class="numero">Nº ${esc(t.number)}</p>` : ''}
    ${t.party || local ? `<p class="meta">${esc([t.party, local].filter(Boolean).join(' · '))}</p>` : ''}
  </div>
  ${t.bio || t.slogan ? `<p class="resumo">${esc(t.bio || t.slogan)}</p>` : ''}
  ${
    t.curriculum
      ? `<details class="curriculo">
          <summary>
            <span>Meu currículo</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9.5 12 15l6-5.5"/></svg>
          </summary>
          <div class="curriculo-corpo"><p>${esc(t.curriculum)}</p></div>
        </details>`
      : ''
  }
</div>

${propostas}
${blocoBanner(bannerPor('MEIO'))}
${blocoApoio(1, true)}
${redes}
${links}
${blocoBanner(bannerPor('RODAPE'))}
${t.socialLinks.length || t.links.length ? blocoApoio(2, false) : ''}

<footer>Candidato Online</footer>

<dialog id="lightbox">
  <div class="conteudo"><h3></h3><p></p></div>
  <button type="button" class="fechar">FECHAR</button>
</dialog>

<nav class="barra">
  ${ABAS.map(
    ([id, rotulo, caminho]) =>
      `<a href="#${id}"${id === 'apoiar' ? ' class="destaque"' : ''}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">${caminho}</svg>
        <span>${rotulo}</span>
      </a>`
  ).join('')}
</nav>

<script>
(function () {
  var SLUG = ${JSON.stringify(t.slug)};
  var PROPOSTAS = ${JSON.stringify(conteudoPropostas)};
  var CHAVE_PUSH = ${JSON.stringify(chavePush || '')};

  // ----- arrastar com o mouse -----
  // No toque a rolagem nativa ja funciona e e melhor que qualquer emulacao,
  // entao o arrasto so entra para ponteiro de mouse.
  function habilitarArrasto(faixa) {
    var arrastando = false, xInicial = 0, scrollInicial = 0, moveu = false;

    faixa.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      arrastando = true;
      moveu = false;
      xInicial = e.clientX;
      scrollInicial = faixa.scrollLeft;
      faixa.classList.add('arrastando');
    });

    faixa.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      var dx = e.clientX - xInicial;
      if (Math.abs(dx) > 4) {
        moveu = true;
        // So captura o ponteiro depois de virar arrasto de fato: capturar no
        // pointerdown impediria o clique simples no botao do card.
        if (faixa.hasPointerCapture && !faixa.hasPointerCapture(e.pointerId)) {
          faixa.setPointerCapture(e.pointerId);
        }
      }
      faixa.scrollLeft = scrollInicial - dx;
    });

    function soltar() {
      if (!arrastando) return;
      arrastando = false;
      faixa.classList.remove('arrastando');
    }
    faixa.addEventListener('pointerup', soltar);
    faixa.addEventListener('pointercancel', soltar);
    faixa.addEventListener('pointerleave', soltar);

    // Um arrasto que termina sobre um botao nao pode virar clique.
    faixa.addEventListener('click', function (e) {
      if (!moveu) return;
      e.preventDefault();
      e.stopPropagation();
      moveu = false;
    }, true);

    faixa.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  document.querySelectorAll('.carrossel, .redes-lista').forEach(habilitarArrasto);

  // ----- lightbox das propostas -----
  var dialogo = document.getElementById('lightbox');
  document.querySelectorAll('.abrir-proposta').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var dados = PROPOSTAS[Number(botao.dataset.proposta)];
      if (!dados) return;
      dialogo.querySelector('h3').textContent = dados.titulo;
      dialogo.querySelector('p').textContent = dados.texto;
      dialogo.showModal();
    });
  });
  dialogo.querySelector('.fechar').addEventListener('click', function () { dialogo.close(); });

  // ----- mascara de telefone -----
  function mascararTelefone(valor) {
    var d = valor.replace(/\\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + '.' + d.slice(3, 7) + '-' + d.slice(7);
  }
  function mascararCep(valor) {
    var d = valor.replace(/\\D/g, '').slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  // ----- cadastro em tres etapas -----
  // ----- inscricao de push -----
  function bytesDaChave(base64) {
    var limpo = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var bruto = atob(limpo);
    var saida = new Uint8Array(bruto.length);
    for (var i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
    return saida;
  }

  var pushSuportado = 'serviceWorker' in navigator && 'PushManager' in window && CHAVE_PUSH;

  async function inscreverPush(supporterId) {
    if (!pushSuportado) return { ok: false, motivo: 'sem-suporte' };

    var permissao = await Notification.requestPermission();
    if (permissao !== 'granted') return { ok: false, motivo: 'negada' };

    var registro = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    var inscricao = await registro.pushManager.getSubscription();
    if (!inscricao) {
      inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesDaChave(CHAVE_PUSH)
      });
    }

    var r = await fetch('/' + SLUG + '/apoiar/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supporterId: supporterId, inscricao: inscricao.toJSON() })
    });
    return { ok: r.ok };
  }

  // ----- cadastro -----
  document.querySelectorAll('[data-apoio]').forEach(function (bloco) {
    var telefoneConfirmado = '';
    var idApoiador = '';
    var aviso = bloco.querySelector('.aviso');
    var etapas = {
      telefone: bloco.querySelector('.etapa-telefone'),
      dados: bloco.querySelector('.etapa-dados'),
      push: bloco.querySelector('.etapa-push'),
      fim: bloco.querySelector('.etapa-fim')
    };

    var campoTelefone = etapas.telefone.querySelector('[name=telefone]');
    campoTelefone.addEventListener('input', function () {
      campoTelefone.value = mascararTelefone(campoTelefone.value);
    });
    var campoCep = etapas.dados.querySelector('[name=cep]');
    campoCep.addEventListener('input', function () {
      campoCep.value = mascararCep(campoCep.value);
    });

    function mostrar(nome) {
      Object.keys(etapas).forEach(function (k) { etapas[k].hidden = k !== nome; });
      aviso.hidden = true;
    }
    function erro(mensagem) {
      aviso.textContent = mensagem;
      aviso.hidden = false;
    }

    async function enviar(caminho, corpo, botao) {
      botao.disabled = true;
      aviso.hidden = true;
      try {
        var resposta = await fetch('/' + SLUG + '/apoiar/' + caminho, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo)
        });
        var dados = await resposta.json();
        if (!resposta.ok) { erro(dados.erro || 'Não foi possível continuar.'); return null; }
        return dados;
      } catch (e) {
        erro('Falha de conexão. Tente novamente.');
        return null;
      } finally {
        botao.disabled = false;
      }
    }

    // Depois do numero salvo, oferece o push; sem suporte no navegador pula
    // direto para o fim em vez de mostrar um botao que nao faz nada.
    function seguirParaPush() {
      if (pushSuportado && Notification.permission !== 'denied') mostrar('push');
      else mostrar('fim');
    }

    etapas.telefone.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      var botao = etapas.telefone.querySelector('button');
      var dados = await enviar('iniciar', {
        telefone: campoTelefone.value,
        utm: Object.fromEntries(new URLSearchParams(location.search))
      }, botao);
      if (!dados) return;
      telefoneConfirmado = campoTelefone.value;
      idApoiador = dados.supporterId || '';
      if (dados.etapa === 'concluido') { seguirParaPush(); return; }
      mostrar('dados');
    });

    etapas.dados.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      var botao = etapas.dados.querySelector('button[type=submit]');
      var dados = await enviar('completar', {
        telefone: telefoneConfirmado,
        nome: etapas.dados.querySelector('[name=nome]').value,
        cep: campoCep.value
      }, botao);
      if (dados) seguirParaPush();
    });

    // O numero ja esta salvo, entao pular aqui nao perde o contato.
    etapas.dados.querySelector('.pular').addEventListener('click', seguirParaPush);

    etapas.push.querySelector('.ativar-push').addEventListener('click', async function () {
      var botao = etapas.push.querySelector('.ativar-push');
      botao.disabled = true;
      try {
        var r = await inscreverPush(idApoiador);
        if (!r.ok && r.motivo === 'negada') {
          erro('Você bloqueou os avisos. Dá para liberar depois nas configurações do navegador.');
        }
      } catch (e) {
        erro('Não foi possível ativar os avisos neste aparelho.');
      } finally {
        botao.disabled = false;
        mostrar('fim');
      }
    });

    etapas.push.querySelector('.pular-push').addEventListener('click', function () { mostrar('fim'); });
  });
})();
</script>
</body>
</html>`;
}

function paginaNaoEncontrada() {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidato não encontrado</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
    font-family: system-ui, sans-serif; background:#f4f4f6; color:#1c1c1e;
    text-align:center; padding:2rem; }
  h1 { font-size:1.3rem; margin:0 0 .5rem; }
  p { color:#6b6b70; margin:0; }
</style></head>
<body><div><h1>Candidato não encontrado</h1><p>Confira o endereço e tente novamente.</p></div></body></html>`;
}

/// Carrega o tenant pelo slug com todo o conteudo publicado do WebApp.
/// Proporcao da capa, lida da imagem guardada. Decide se o topo e uma faixa
/// larga ou um cartaz em pe — e as duas coisas se montam de formas diferentes.
async function proporcaoDaCapa(bannerUrl) {
  const id = /^\/midia\/([0-9a-f-]{36})$/i.exec(String(bannerUrl || ''))?.[1];
  if (!id) return null;

  const arquivo = await getPrisma().mediaFile.findUnique({
    where: { id },
    select: { width: true, height: true },
  });
  if (!arquivo?.width || !arquivo?.height) return null;
  return arquivo.width / arquivo.height;
}

async function buscarPorSlug(slug) {
  const prisma = getPrisma();
  return prisma.tenant.findFirst({
    where: { slug, active: true },
    include: {
      proposals: { where: { published: true }, orderBy: { position: 'asc' }, take: 20 },
      banners: { where: { published: true }, orderBy: { position: 'asc' }, take: 6 },
      socialLinks: { where: { published: true }, orderBy: { position: 'asc' }, take: 10 },
      links: { where: { published: true }, orderBy: { position: 'asc' }, take: 12 },
    },
  });
}

/// Manifest por candidato: quem instala o WebApp na tela inicial ve o nome e
/// a cor daquele candidato, nao os da plataforma. O icone ainda e o da marca,
/// porque nao existe upload de imagem por candidato — quando existir, e aqui
/// que a foto dele entra.
function manifesto(t) {
  return {
    name: t.name,
    short_name: t.name.slice(0, 12),
    description: t.slogan || t.bio?.slice(0, 140) || t.name,
    start_url: `/${t.slug}`,
    scope: `/${t.slug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: cor(t.primaryColor, '#1e40af'),
    lang: 'pt-BR',
    icons: [
      { src: '/assets/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/assets/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}

module.exports = { buscarPorSlug, render, paginaNaoEncontrada, manifesto, proporcaoDaCapa };
