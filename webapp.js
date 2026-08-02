const { getPrisma } = require('./prisma-client');

/// Todo texto vindo do banco passa por aqui antes de virar HTML.
function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/// Aceita apenas cor hexadecimal, porque o valor entra dentro de uma tag
/// <style> — onde escape de HTML nao protegeria contra injecao de CSS.
function cor(valor, padrao) {
  return /^#[0-9a-fA-F]{6}$/.test(valor || '') ? valor : padrao;
}

const MENU = [
  ['inicio', 'Início'],
  ['quem-sou', 'Quem Sou'],
  ['propostas', 'Propostas'],
  ['agenda', 'Agenda'],
  ['noticias', 'Notícias'],
  ['fotos', 'Fotos'],
  ['videos', 'Vídeos'],
  ['contato', 'Contato'],
];

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

/// Secao que so aparece quando ha conteudo. Um WebApp recem-criado nao deve
/// exibir cabecalhos vazios.
function secao(id, titulo, conteudo) {
  if (!conteudo) return '';
  return `<section id="${id}"><h2>${esc(titulo)}</h2>${conteudo}</section>`;
}

function render(t) {
  const primaria = cor(t.primaryColor, '#1e40af');
  const secundaria = cor(t.secondaryColor, '#f59e0b');
  const local = [t.city, t.state].filter(Boolean).join(' - ');

  const propostas = t.proposals.length
    ? `<ul class="cartoes">${t.proposals
        .map(
          (p) => `<li><h3>${esc(p.title)}</h3>${
            p.description ? `<p>${esc(p.description)}</p>` : ''
          }</li>`
        )
        .join('')}</ul>`
    : '';

  const agenda = t.events.length
    ? `<ul class="lista">${t.events
        .map(
          (e) => `<li><time>${esc(formatarData(e.startsAt))}</time>
            <strong>${esc(e.title)}</strong>
            ${e.location ? `<span>${esc(e.location)}</span>` : ''}</li>`
        )
        .join('')}</ul>`
    : '';

  const noticias = t.news.length
    ? `<ul class="lista">${t.news
        .map(
          (n) => `<li><strong>${esc(n.title)}</strong>
            ${n.excerpt ? `<span>${esc(n.excerpt)}</span>` : ''}</li>`
        )
        .join('')}</ul>`
    : '';

  const fotos = t.photos.length
    ? `<div class="galeria">${t.photos
        .map(
          (f) => `<img src="${esc(f.thumbUrl || f.url)}" alt="${esc(f.title || t.name)}" loading="lazy">`
        )
        .join('')}</div>`
    : '';

  const videos = t.videos.length
    ? `<ul class="lista">${t.videos
        .map((v) => `<li><a href="${esc(v.url)}" rel="noopener">${esc(v.title)}</a></li>`)
        .join('')}</ul>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.name)}${t.number ? ` ${esc(t.number)}` : ''}</title>
<meta name="description" content="${esc(t.slogan || t.name)}">
<meta name="theme-color" content="${primaria}">
<style>
  :root { --primaria: ${primaria}; --secundaria: ${secundaria}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #1c1c1e; background: #fff; line-height: 1.55;
  }
  header {
    background: linear-gradient(160deg, var(--primaria), color-mix(in srgb, var(--primaria) 70%, #000));
    color: #fff; padding: 2.5rem 1.25rem 2rem; text-align: center;
  }
  header img.retrato {
    width: 128px; height: 128px; border-radius: 50%; object-fit: cover;
    border: 4px solid rgba(255,255,255,.85); margin-bottom: 1rem;
  }
  header h1 { margin: 0; font-size: 1.75rem; letter-spacing: -.02em; }
  .numero {
    display: inline-block; margin-top: .6rem; padding: .3rem 1rem;
    background: var(--secundaria); color: #1c1c1e; border-radius: 999px;
    font-weight: 700; font-size: 1.35rem; letter-spacing: .06em;
  }
  .meta { margin-top: .6rem; opacity: .9; font-size: .9rem; }
  .slogan { margin-top: 1rem; font-size: 1.05rem; font-style: italic; opacity: .95; }
  nav {
    position: sticky; top: 0; z-index: 10; background: #fff;
    border-bottom: 1px solid #e5e5ea; overflow-x: auto;
  }
  nav ul {
    display: flex; gap: .25rem; list-style: none; margin: 0;
    padding: .5rem .75rem; white-space: nowrap;
  }
  nav a {
    display: block; padding: .45rem .8rem; border-radius: 8px;
    color: #3a3a3c; text-decoration: none; font-size: .9rem; font-weight: 500;
  }
  nav a:hover { background: #f2f2f7; color: var(--primaria); }
  main { max-width: 720px; margin: 0 auto; padding: 0 1.25rem 6rem; }
  section { padding: 2rem 0; border-bottom: 1px solid #f2f2f7; }
  section:last-of-type { border-bottom: 0; }
  h2 {
    font-size: 1.15rem; text-transform: uppercase; letter-spacing: .08em;
    color: var(--primaria); margin: 0 0 1rem;
  }
  .cartoes, .lista { list-style: none; padding: 0; margin: 0; display: grid; gap: .75rem; }
  .cartoes li { padding: 1rem; background: #f9f9fb; border-radius: 12px; border-left: 4px solid var(--secundaria); }
  .cartoes h3 { margin: 0 0 .35rem; font-size: 1rem; }
  .cartoes p { margin: 0; color: #48484a; font-size: .92rem; }
  .lista li { display: grid; gap: .2rem; padding: .85rem 1rem; background: #f9f9fb; border-radius: 12px; }
  .lista time { font-size: .8rem; color: var(--primaria); font-weight: 600; text-transform: uppercase; }
  .lista span { font-size: .88rem; color: #48484a; }
  .galeria { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: .5rem; }
  .galeria img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; }
  .cta {
    position: fixed; left: 0; right: 0; bottom: 0; padding: .85rem 1.25rem
      calc(.85rem + env(safe-area-inset-bottom));
    background: rgba(255,255,255,.94); backdrop-filter: blur(12px);
    border-top: 1px solid #e5e5ea;
  }
  .cta a {
    display: block; max-width: 720px; margin: 0 auto; padding: .95rem;
    background: var(--secundaria); color: #1c1c1e; text-align: center;
    text-decoration: none; border-radius: 12px; font-weight: 700;
    letter-spacing: .04em; font-size: 1.02rem;
  }
  footer { text-align: center; font-size: .78rem; color: #8e8e93; padding: 1.5rem 1.25rem 7rem; }
  @media (prefers-color-scheme: dark) {
    body { background: #000; color: #f2f2f7; }
    nav { background: #1c1c1e; border-bottom-color: #2c2c2e; }
    nav a { color: #aeaeb2; }
    nav a:hover { background: #2c2c2e; }
    section { border-bottom-color: #1c1c1e; }
    .cartoes li, .lista li { background: #1c1c1e; }
    .cartoes p, .lista span { color: #aeaeb2; }
    .cta { background: rgba(28,28,30,.94); border-top-color: #2c2c2e; }
  }
</style>
</head>
<body>
<header id="inicio">
  ${t.photoUrl ? `<img class="retrato" src="${esc(t.photoUrl)}" alt="${esc(t.name)}">` : ''}
  <h1>${esc(t.name)}</h1>
  ${t.number ? `<div class="numero">${esc(t.number)}</div>` : ''}
  ${t.party || local ? `<div class="meta">${esc([t.party, local].filter(Boolean).join(' · '))}</div>` : ''}
  ${t.slogan ? `<p class="slogan">${esc(t.slogan)}</p>` : ''}
</header>

<nav><ul>${MENU.map(([id, rotulo]) => `<li><a href="#${id}">${rotulo}</a></li>`).join('')}</ul></nav>

<main>
  ${secao('quem-sou', 'Quem Sou', t.bio ? `<p>${esc(t.bio)}</p>` : '')}
  ${secao('propostas', 'Propostas', propostas)}
  ${secao('agenda', 'Agenda', agenda)}
  ${secao('noticias', 'Notícias', noticias)}
  ${secao('fotos', 'Fotos', fotos)}
  ${secao('videos', 'Vídeos', videos)}
  <section id="contato">
    <h2>Contato</h2>
    <p>Fale com a campanha e receba as novidades em primeira mão.</p>
  </section>
</main>

<div class="cta"><a href="/${esc(t.slug)}/apoiar">QUERO APOIAR</a></div>
<footer>Voto.IO</footer>
</body>
</html>`;
}

function paginaNaoEncontrada() {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidato nao encontrado</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
    font-family: system-ui, sans-serif; background:#f2f2f7; color:#1c1c1e; text-align:center; padding:2rem; }
  h1 { font-size:1.3rem; margin:0 0 .5rem; }
  p { color:#636366; margin:0; }
  @media (prefers-color-scheme: dark) { body { background:#000; color:#f2f2f7; } p { color:#aeaeb2; } }
</style></head>
<body><div><h1>Candidato não encontrado</h1><p>Confira o endereço e tente novamente.</p></div></body></html>`;
}

/// Carrega o tenant pelo slug com todo o conteudo publicado do WebApp.
async function buscarPorSlug(slug) {
  const prisma = getPrisma();
  return prisma.tenant.findFirst({
    where: { slug, active: true },
    include: {
      proposals: { where: { published: true }, orderBy: { position: 'asc' }, take: 30 },
      events: {
        where: { published: true, startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 10,
      },
      news: {
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      },
      photos: { where: { published: true }, orderBy: { position: 'asc' }, take: 24 },
      videos: { where: { published: true }, orderBy: { position: 'asc' }, take: 12 },
    },
  });
}

module.exports = { buscarPorSlug, render, paginaNaoEncontrada };
