const { esc, cor, tagsDeIcone } = require('./html');
const graficos = require('./painel-graficos');

const ESTILO = `
  :root {
    --primaria: #1e40af; --texto: #16181d; --suave: #6b7280; --borda: #e3e5ea;
    --fundo: #f5f6f8; --branco: #fff; --perigo: #b42318; --ok: #067647;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--fundo); color: var(--texto);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px; line-height: 1.5;
    padding-bottom: calc(84px + env(safe-area-inset-bottom));
  }
  a { color: var(--primaria); }
  .topo {
    background: var(--branco); border-bottom: 1px solid var(--borda);
    position: sticky; top: 0; z-index: 10;
  }
  .topo-linha {
    max-width: 1040px; margin: 0 auto; padding: .85rem 1.25rem;
    display: flex; align-items: center; gap: 1rem;
  }
  .logo-marca { height: 30px; width: auto; flex: 0 0 auto; }
  /* Em tela estreita a logo cede lugar: o nome do candidato e o que importa
     no topo, e os dois juntos espremeriam o botao Sair. */
  @media (max-width: 480px) { .logo-marca { display: none; } }
  .divisor {
    width: 1px; align-self: stretch; background: var(--borda); margin: 0 .15rem;
  }
  @media (max-width: 480px) { .divisor { display: none; } }
  .marca { font-weight: 700; letter-spacing: -.01em; min-width: 0; }
  .marca > div {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .marca span { display: block; font-size: .72rem; font-weight: 500; color: var(--suave); }
  .acoes-topo { margin-left: auto; display: flex; align-items: center; gap: .5rem; }
  .acoes-topo .botao {
    padding: .5rem .8rem; font-size: .85rem; text-decoration: none;
    display: inline-flex; align-items: center; gap: .4rem;
  }
  /* Em tela estreita o rotulo sai, o botao fica. Escondê-lo por inteiro
     deixaria o painel sem nenhum caminho para trocar a senha no celular —
     e e no celular que a candidata usa o painel. */
  @media (max-width: 560px) {
    .acoes-topo .botao span { display: none; }
    .acoes-topo .botao { padding: .5rem .62rem; }
  }
  button.sair {
    background: #fdecec; color: var(--perigo); font-weight: 650;
  }
  button.sair:hover { background: var(--perigo); color: #fff; }
  main { max-width: 1040px; margin: 0 auto; padding: 1.5rem 1.25rem 1.5rem; }

  /* ---------- menu estilo aplicativo ---------- */
  .barra-app {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; z-index: 30;
    width: 100%; max-width: 620px; display: flex; align-items: flex-end;
    background: var(--branco); border-top: 1px solid var(--borda);
    border-radius: 16px 16px 0 0; box-shadow: 0 -6px 24px rgba(11,11,11,.07);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .barra-app a {
    flex: 1; padding: .55rem .2rem .5rem; display: grid; gap: .18rem; justify-items: center;
    color: var(--suave); text-decoration: none; font-size: .64rem; font-weight: 600;
  }
  .barra-app a.ativa { color: var(--primaria); }
  .barra-app a.foguete {
    flex: 0 0 auto; margin: -22px .4rem 0; width: 62px;
    color: #fff; font-size: .62rem;
  }
  .barra-app a.foguete .bolha {
    width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center;
    background: var(--primaria); box-shadow: 0 6px 16px color-mix(in srgb, var(--primaria) 45%, transparent);
    margin: 0 auto .15rem;
  }
  .barra-app a.foguete span:last-child { color: var(--primaria); }
  .barra-app svg { display: block; }
  h1 { font-size: 1.35rem; margin: 0 0 1.25rem; letter-spacing: -.02em; }
  h2 { font-size: 1rem; margin: 0 0 .9rem; letter-spacing: -.01em; }

  .cartao {
    background: var(--branco); border: 1px solid var(--borda); border-radius: 12px;
    padding: 1.25rem; margin-bottom: 1.25rem;
  }
  .numeros { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .85rem; margin-bottom: 1.25rem; }
  .numero {
    background: var(--branco); border: 1px solid var(--borda); border-radius: 12px; padding: 1rem 1.1rem;
  }
  .numero .valor { font-size: 1.7rem; font-weight: 700; letter-spacing: -.03em; }
  .numero .rotulo { font-size: .74rem; text-transform: uppercase; letter-spacing: .05em; color: var(--suave); }

  table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  th, td { padding: .65rem .6rem; text-align: left; border-bottom: 1px solid var(--borda); }
  th { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--suave); font-weight: 600; }
  tbody tr:last-child td { border-bottom: 0; }
  .tabela-rolavel { overflow-x: auto; }

  .etiqueta {
    display: inline-block; padding: .12rem .5rem; border-radius: 999px;
    font-size: .72rem; font-weight: 600; background: #eef1f6; color: var(--suave);
  }
  .etiqueta.completo { background: #e7f6ec; color: var(--ok); }
  .etiqueta.pendente { background: #fdf2e7; color: #a15c07; }

  label.campo { display: block; margin-bottom: .85rem; }
  .campo > small { display: block; margin-top: .35rem; font-size: .78rem; color: var(--suave); }
  input[type=file] {
    width: 100%; padding: .5rem; border: 1px dashed var(--borda); border-radius: 8px;
    background: var(--branco); font: inherit; font-size: .85rem;
  }
  .previa { display: flex; align-items: center; gap: .8rem; margin-bottom: .55rem; }
  .previa img {
    width: 76px; height: 56px; object-fit: contain; border-radius: 8px;
    background: #f1f3f7; border: 1px solid var(--borda);
  }
  .previa .remover { display: flex; align-items: center; gap: .35rem; font-size: .84rem; color: var(--perigo); }
  .previa .remover input { width: auto; }
  div.campo { display: block; margin-bottom: .85rem; }
  div.campo > span, label.campo > span {
    display: block; margin-bottom: .3rem; font-size: .78rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em; color: var(--suave);
  }
  input[type=text], input[type=email], input[type=password], input[type=url],
  input[type=number], select, textarea {
    width: 100%; padding: .6rem .75rem; border: 1px solid var(--borda);
    border-radius: 8px; font: inherit; color: var(--texto); background: var(--branco);
  }
  input:focus, select:focus, textarea:focus { outline: 2px solid var(--primaria); outline-offset: -1px; }
  input[type=color] { width: 100%; height: 42px; padding: 3px; border: 1px solid var(--borda); border-radius: 8px; background: var(--branco); }
  textarea { min-height: 96px; resize: vertical; }
  .linha { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0 .85rem; }

  button, .botao {
    display: inline-block; padding: .6rem 1.1rem; border: 0; border-radius: 8px;
    background: var(--primaria); color: #fff; font: inherit; font-weight: 600;
    cursor: pointer; text-decoration: none;
  }
  button.discreto { background: #eef1f6; color: var(--texto); }
  button.perigo { background: none; color: var(--perigo); padding: .35rem .5rem; font-size: .82rem; }
  .acoes { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }

  .recado { padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: .9rem; }
  .recado.ok { background: #e7f6ec; color: var(--ok); }
  .recado.erro { background: #fdecec; color: var(--perigo); }
  .recado.alerta { background: #fdf6e7; color: #855107; }

  /* ---------- turbinar ---------- */
  .canais { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .7rem; }
  .canal { position: relative; display: block; cursor: pointer; }
  .canal input { position: absolute; opacity: 0; pointer-events: none; }
  .canal-corpo {
    display: block; padding: .95rem 1rem; border: 1.5px solid var(--borda);
    border-radius: 12px; height: 100%;
  }
  .canal input:checked + .canal-corpo {
    border-color: var(--primaria);
    box-shadow: inset 0 0 0 1px var(--primaria);
    background: color-mix(in srgb, var(--primaria) 5%, #fff);
  }
  .canal input:focus-visible + .canal-corpo { outline: 2px solid var(--primaria); outline-offset: 2px; }
  .canal-topo { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
  .canal-alcance { font-size: 1.45rem; font-weight: 650; letter-spacing: -.03em; }
  .canal small { display: block; color: var(--suave); font-size: .78rem; margin-top: .25rem; }
  .canal .canal-custo { font-weight: 600; }
  .vazio { color: var(--suave); font-size: .9rem; padding: .5rem 0; }

  .titulo-com-acao {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap; margin-bottom: .9rem;
  }
  .titulo-com-acao h2 { margin: 0; }
  .titulo-com-acao .botao {
    display: inline-flex; align-items: center; gap: .45rem;
    text-decoration: none; font-size: .85rem; padding: .5rem .85rem;
  }
  .filtros { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .6rem; align-items: end; }
  .filtros label.campo { margin-bottom: 0; }

  .item {
    display: flex; gap: .85rem; align-items: flex-start; padding: .85rem 0;
    border-bottom: 1px solid var(--borda);
  }
  .item:last-child { border-bottom: 0; }
  .item .corpo { flex: 1; min-width: 0; }
  .item .corpo strong { display: block; }
  .item .corpo small { color: var(--suave); word-break: break-all; }

  /* ---------- dashboard ---------- */
  .heroi {
    background: var(--branco); border: 1px solid var(--borda); border-radius: 12px;
    padding: 1.4rem 1.5rem; margin-bottom: .85rem;
  }
  .heroi .rotulo {
    font-size: .74rem; text-transform: uppercase; letter-spacing: .06em; color: var(--suave);
  }
  .heroi .figura { font-size: 3.25rem; font-weight: 650; line-height: 1.05; letter-spacing: -.035em; }
  .heroi .apoio { color: var(--suave); font-size: .87rem; }

  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .7rem; margin-bottom: 1.25rem; }
  .kpi { background: var(--branco); border: 1px solid var(--borda); border-radius: 12px; padding: .9rem 1rem; }
  .kpi .rotulo { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--suave); }
  .kpi .valor { font-size: 1.6rem; font-weight: 650; letter-spacing: -.03em; line-height: 1.2; }
  .kpi .delta { font-size: .76rem; font-weight: 600; }
  .kpi .delta.sobe { color: #006300; }
  .kpi .delta.desce { color: #b42318; }
  .kpi .delta.igual { color: var(--suave); }

  .duplo { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; }
  .grafico-caixa { position: relative; }
  svg.gr { width: 100%; height: auto; display: block; overflow: visible; }
  svg.gr .alvo, svg.gr .alvo-barra { cursor: default; }
  .legenda-eixo { font-size: .76rem; color: var(--suave); margin: .1rem 0 .9rem; }

  .dica {
    position: absolute; pointer-events: none; opacity: 0; transition: opacity .12s;
    background: #16181d; color: #fff; padding: .4rem .6rem; border-radius: 7px;
    font-size: .78rem; white-space: nowrap; transform: translate(-50%, -130%); z-index: 5;
  }
  .dica b { font-weight: 650; }

  .tabela-gemea { margin-top: .9rem; }
  .tabela-gemea summary {
    cursor: pointer; font-size: .8rem; color: var(--suave); list-style: none;
    display: inline-flex; align-items: center; gap: .3rem;
  }
  .tabela-gemea summary::before { content: '▸'; font-size: .7rem; }
  .tabela-gemea[open] summary::before { content: '▾'; }
  .tabela-gemea table { margin-top: .6rem; }
  .tabela-gemea td { font-variant-numeric: tabular-nums; }
`;

const ICONES_MENU = {
  inicio: '<path d="M12 3 3 10v10h6v-6h6v6h6V10L12 3Z"/>',
  apoiadores:
    '<path d="M16 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 2c-2.7 0-6 1.3-6 4v2h9v-2c0-1 .4-1.9 1-2.6-1.2-.9-2.9-1.4-4-1.4Zm8 0c-1.3 0-4 .6-5.2 1.8.7.7 1.2 1.6 1.2 2.6V19h10v-2c0-2.7-3.3-4-6-4Z"/>',
  conteudo: '<path d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.6H8V12Zm0 4h8v1.6H8V16Z"/>',
  site: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.3a15 15 0 0 0-1.3-5.6A8 8 0 0 1 19.9 11ZM12 4.1c.8 1.1 1.8 3.4 2 6.9h-4c.2-3.5 1.2-5.8 2-6.9ZM4.1 11a8 8 0 0 1 4.6-5.6A15 15 0 0 0 7.4 11H4.1Zm0 2h3.3a15 15 0 0 0 1.3 5.6A8 8 0 0 1 4.1 13ZM12 19.9c-.8-1.1-1.8-3.4-2-6.9h4c-.2 3.5-1.2 5.8-2 6.9Zm3.3-1.3a15 15 0 0 0 1.3-5.6h3.3a8 8 0 0 1-4.6 5.6Z"/>',
  foguete:
    '<path d="M13.6 2.2c3.4.5 6.2 3.3 6.7 6.7.4 2.8-.7 5.6-2.9 7.6l-1.9 1.7-4-4-4-4L9.2 8c2-2.2 4.8-3.3 7.6-2.9l-3.2-2.9ZM14.9 9.7a1.7 1.7 0 1 0-2.4-2.4 1.7 1.7 0 0 0 2.4 2.4ZM7.4 14.3l2.3 2.3c-.6 1.9-2 3.3-4.2 4.2-.5.2-1-.3-.8-.8.9-2.2 2.3-3.6 4.2-4.2l-1.5-1.5Z"/>',
};

function iconeMenu(nome, tamanho = 21) {
  return `<svg viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}" fill="currentColor" aria-hidden="true">${ICONES_MENU[nome]}</svg>`;
}

function pagina({ titulo, tenant, aba, corpo, recado, nome }) {
  const principal = cor(tenant?.primaryColor, '#1e40af');
  const item = (chave, rotulo, destino, extra = '') =>
    `<a href="${destino}" class="${aba === chave ? 'ativa' : ''}" ${extra}>
      ${iconeMenu(chave)}<span>${rotulo}</span></a>`;

  // Sem candidato na sessao (caso do Master trocando a propria senha) nao ha
  // menu de aplicativo nem identidade de campanha para vestir a pagina.
  const identidade = tenant
    ? `<div class="marca"><div>${esc(tenant.name)}</div><span>candidato.bio/${esc(tenant.slug)}</span></div>`
    : `<div class="marca"><div>${esc(nome || 'Administração')}</div><span>Painel Master</span></div>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)} · Candidato Online</title>
${tagsDeIcone()}
<style>${ESTILO}
  :root { --primaria: ${principal}; }
</style>
</head>
<body>
<header class="topo">
  <div class="topo-linha">
    <a href="/painel/inicio" aria-label="Candidato Online">
      <img class="logo-marca" src="/assets/logo-72.png"
        srcset="/assets/logo-72.png 1x, /assets/logo-144.png 2x"
        alt="Candidato Online" width="213" height="72">
    </a>
    <div class="divisor"></div>
    ${identidade}
    <div class="acoes-topo">
      <a class="botao discreto" href="/painel/senha" title="Trocar senha" aria-label="Trocar senha">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-5 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm2.2-9H9.8V6a2.2 2.2 0 0 1 4.4 0v2Z"/>
        </svg><span>Trocar senha</span></a>
      <form method="post" action="/painel/sair">
        <button class="sair" type="submit">Sair</button>
      </form>
    </div>
  </div>
</header>
<main>
  ${recado ? `<p class="recado ${recado.tipo}">${esc(recado.texto)}</p>` : ''}
  ${corpo}
</main>

${
  tenant
    ? `<nav class="barra-app">
  ${item('inicio', 'Início', '/painel/inicio')}
  ${item('apoiadores', 'Apoiadores', '/painel/apoiadores')}
  <a href="/painel/turbinar" class="foguete ${aba === 'turbinar' ? 'ativa' : ''}">
    <span class="bolha">${iconeMenu('foguete', 27)}</span><span>Turbinar</span>
  </a>
  ${item('conteudo', 'Conteúdo', '/painel/conteudo')}
  ${item('site', 'Meu site', `/${esc(tenant.slug)}`, 'target="_blank" rel="noopener"')}
</nav>`
    : '<div style="text-align:center;padding:0 1.25rem 2rem"><a href="/master">← Voltar ao painel Master</a></div>'
}
</body>
</html>`;
}

function telaEntrar({ erro, usuario }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entrar · Candidato Online</title>
${tagsDeIcone()}
<style>${ESTILO}
  body { display: grid; place-items: center; min-height: 100vh; padding: 1.5rem; }
  .caixa { width: 100%; max-width: 380px; }
  .caixa img.logo { display: block; width: 100%; max-width: 236px; height: auto; margin: 0 auto 1.4rem; }
  .caixa .sub { text-align: center; color: var(--suave); font-size: .88rem; margin: 0 0 1.5rem; }
  .caixa button { width: 100%; padding: .75rem; }
</style>
</head>
<body>
<div class="caixa">
  <img class="logo" src="/assets/logo-144.png"
    srcset="/assets/logo-144.png 1x, /assets/logo-candidato-online.png 2x"
    alt="Candidato Online" width="426" height="144">
  <p class="sub">Acesse o painel da sua campanha</p>
  <div class="cartao">
    ${erro ? `<p class="recado erro">${esc(erro)}</p>` : ''}
    <form method="post" action="/painel/entrar">
      <label class="campo"><span>Usuário</span>
        <input type="text" name="usuario" value="${esc(usuario || '')}" required autofocus
          autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false">
      </label>
      <label class="campo"><span>Senha</span>
        <input type="password" name="senha" required autocomplete="current-password">
      </label>
      <button type="submit">Entrar</button>
    </form>
  </div>
</div>
</body>
</html>`;
}

function formatarTelefone(phone) {
  const d = String(phone || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length !== 11) return phone;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)}.${d.slice(3, 7)}-${d.slice(7)}`;
}

function formatarData(data) {
  if (!data) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(data);
}

const ROTULO_STATUS = {
  PENDENTE: 'Incompleto',
  CONFIRMADO: 'Só telefone',
  COMPLETO: 'Completo',
};

function etiquetaStatus(status) {
  const classe = status === 'COMPLETO' ? 'completo' : status === 'CONFIRMADO' ? '' : 'pendente';
  return `<span class="etiqueta ${classe}">${esc(ROTULO_STATUS[status] || status)}</span>`;
}

/// Cor da variacao = direcao x se subir e bom. Aqui subir e sempre bom, mas o
/// simbolo e o texto do periodo acompanham para o sinal nao depender so da cor.
function kpi(rotulo, valor, delta) {
  let marca = '';
  if (delta && delta.pct === null) {
    // Sem periodo anterior nao ha variacao: uma seta aqui inventaria
    // tendencia onde so existe ausencia de historico.
    marca = '<div class="delta igual" style="font-weight:500">sem período anterior</div>';
  } else if (delta) {
    const classe = delta.pct > 0 ? 'sobe' : delta.pct < 0 ? 'desce' : 'igual';
    const seta = delta.pct > 0 ? '↑' : delta.pct < 0 ? '↓' : '→';
    marca = `<div class="delta ${classe}">${seta} ${Math.abs(delta.pct)}% <span style="font-weight:500">${esc(delta.periodo)}</span></div>`;
  }
  return `<div class="kpi">
    <div class="rotulo">${esc(rotulo)}</div>
    <div class="valor">${valor}</div>
    ${marca}
  </div>`;
}

function telaInicio({ numeros, serie, funil, origens, cidades, ultimos }) {
  const linhas = ultimos.length
    ? ultimos
        .map(
          (s) => `<tr>
            <td>${esc(s.name || '—')}</td>
            <td>${esc(formatarTelefone(s.phone))}</td>
            <td>${esc(s.city || '—')}</td>
            <td>${etiquetaStatus(s.status)}</td>
            <td>${esc(formatarData(s.createdAt))}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="vazio">Nenhum apoiador cadastrado ainda.</td></tr>';

  const caixaGrafico = (titulo, legenda, svg, gemea) => `<div class="cartao">
    <h2>${esc(titulo)}</h2>
    ${legenda ? `<p class="legenda-eixo">${esc(legenda)}</p>` : ''}
    <div class="grafico-caixa">${svg}<div class="dica"></div></div>
    ${gemea || ''}
  </div>`;

  const barrasFunil = graficos.barras(funil, { ordinal: true });
  const barrasOrigem = graficos.barras(origens);
  const barrasCidades = graficos.barras(cidades);

  return `<h1>Início</h1>

<div class="heroi">
  <div class="rotulo">Pessoas que podem receber push agora</div>
  <div class="figura">${numeros.push.toLocaleString('pt-BR')}</div>
  <div class="apoio">
    de ${numeros.total.toLocaleString('pt-BR')} apoiadores ·
    ${numeros.total ? Math.round((numeros.push / numeros.total) * 100) : 0}% autorizaram notificações
    ${
      numeros.total && numeros.push === 0
        ? '<br><strong>Ninguém ativou os avisos ainda.</strong> O eleitor precisa tocar em “Ativar avisos” no seu site.'
        : ''
    }
  </div>
  <a class="botao" href="/painel/turbinar" style="margin-top:.9rem">Turbinar campanha</a>
</div>

<div class="kpis">
  ${kpi('Total de apoiadores', numeros.total)}
  ${kpi('Hoje', numeros.hoje)}
  ${kpi('Últimos 7 dias', numeros.semana, { pct: numeros.deltaSemana, periodo: 'vs. 7 anteriores' })}
  ${kpi('Últimos 30 dias', numeros.mes, { pct: numeros.deltaMes, periodo: 'vs. 30 anteriores' })}
</div>

${caixaGrafico(
  'Cadastros por dia',
  'Últimos 30 dias',
  graficos.areaCadastros(serie),
  serie.length
    ? graficos.tabela(
        ['Dia', 'Cadastros'],
        serie.filter((p) => p.valor > 0).map((p) => [graficos.diaCurto(p.data), String(p.valor)])
      )
    : ''
)}

${caixaGrafico(
    'Funil de cadastro',
    'Cada etapa mostra em que ponto o apoiador parou',
    barrasFunil || graficos.semDados(720, 120, 'Nenhum cadastro ainda.'),
    barrasFunil ? graficos.tabela(['Etapa', 'Pessoas'], funil.map((f) => [f.rotulo, String(f.valor)])) : ''
  )}
  ${caixaGrafico(
    'De onde vieram',
    'Origem registrada no momento do cadastro',
    barrasOrigem || graficos.semDados(720, 120, 'Sem origem registrada ainda.'),
    barrasOrigem ? graficos.tabela(['Origem', 'Pessoas'], origens.map((o) => [o.rotulo, String(o.valor)])) : ''
  )}

${caixaGrafico(
  'Cidades com mais apoiadores',
  'A cidade vem do CEP informado na última etapa do cadastro',
  barrasCidades || graficos.semDados(720, 120, 'Nenhuma cidade informada ainda.'),
  barrasCidades ? graficos.tabela(['Cidade', 'Pessoas'], cidades.map((c) => [c.rotulo, String(c.valor)])) : ''
)}

<div class="cartao">
  <h2>Últimos cadastros</h2>
  <div class="tabela-rolavel">
    <table>
      <thead><tr><th>Nome</th><th>WhatsApp</th><th>Cidade</th><th>Status</th><th>Cadastro</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>
</div>

<script>
(function () {
  document.querySelectorAll('.grafico-caixa').forEach(function (caixa) {
    var dica = caixa.querySelector('.dica');
    var svg = caixa.querySelector('svg');
    var mira = caixa.querySelector('.mira');
    if (!dica || !svg) return;

    function mostrar(rotulo, valor, clienteX, clienteY) {
      var r = caixa.getBoundingClientRect();
      dica.innerHTML = rotulo + ' · <b>' + valor + '</b>';
      dica.style.left = (clienteX - r.left) + 'px';
      dica.style.top = (clienteY - r.top) + 'px';
      dica.style.opacity = '1';
    }
    function esconder() {
      dica.style.opacity = '0';
      if (mira) mira.setAttribute('opacity', '0');
    }

    // Pontos da area: a mira acompanha o dia sob o cursor.
    caixa.querySelectorAll('.alvo').forEach(function (alvo) {
      alvo.addEventListener('pointerenter', function (e) {
        var x = alvo.getAttribute('data-x');
        if (mira) {
          mira.setAttribute('x1', x);
          mira.setAttribute('x2', x);
          mira.setAttribute('opacity', '1');
        }
        var caixaSvg = svg.getBoundingClientRect();
        var vb = svg.viewBox.baseVal;
        var px = caixaSvg.left + (Number(x) / vb.width) * caixaSvg.width;
        mostrar(alvo.getAttribute('data-rotulo'), alvo.getAttribute('data-valor'), px, e.clientY);
      });
    });

    // Barras: alvo cobre a linha inteira, nao so o retangulo colorido.
    caixa.querySelectorAll('.barra').forEach(function (grupo) {
      grupo.addEventListener('pointermove', function (e) {
        mostrar(grupo.getAttribute('data-rotulo'), grupo.getAttribute('data-valor'), e.clientX, e.clientY);
      });
    });

    caixa.addEventListener('pointerleave', esconder);
  });
})();
</script>`;
}

function telaApoiadores({ apoiadores, filtros, cidades, origens, total, pagina: p, paginas }) {
  const linhas = apoiadores.length
    ? apoiadores
        .map(
          (s) => `<tr>
            <td>${esc(s.name || '—')}</td>
            <td>${esc(formatarTelefone(s.phone))}</td>
            <td>${esc(s.cep || '—')}</td>
            <td>${esc(s.city || '—')}</td>
            <td>${esc(s.origin || '—')}</td>
            <td>${etiquetaStatus(s.status)}</td>
            <td>${esc(formatarData(s.createdAt))}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhum apoiador encontrado com esses filtros.</td></tr>';

  const opcoesCidade = cidades
    .map((c) => `<option value="${esc(c)}"${filtros.cidade === c ? ' selected' : ''}>${esc(c)}</option>`)
    .join('');

  const link = (destino, rotulo) =>
    `<a class="botao discreto" href="?${destino}" style="text-decoration:none">${rotulo}</a>`;
  const query = (n) => {
    const p2 = new URLSearchParams(filtros);
    p2.set('pagina', n);
    return p2.toString();
  };

  // Filtros ativos vao junto no link de exportar: o CSV precisa trazer o mesmo
  // recorte que esta na tela, nao a base inteira.
  const paramsFiltro = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v)
  ).toString();

  return `<h1>Apoiadores</h1>
<div class="cartao">
  <form method="get" class="filtros">
    <label class="campo"><span>Buscar</span>
      <input type="text" name="busca" value="${esc(filtros.busca || '')}" placeholder="Nome ou telefone">
    </label>
    <label class="campo"><span>Cidade</span>
      <select name="cidade"><option value="">Todas</option>${opcoesCidade}</select>
    </label>
    <label class="campo"><span>Status</span>
      <select name="status">
        <option value="">Todos</option>
        ${['CONFIRMADO', 'COMPLETO', 'PENDENTE']
          .map((s) => `<option value="${s}"${filtros.status === s ? ' selected' : ''}>${ROTULO_STATUS[s]}</option>`)
          .join('')}
      </select>
    </label>
    <label class="campo"><span>Origem</span>
      <select name="origem"><option value="">Todas</option>${origens
        .map((o) => `<option value="${esc(o)}"${filtros.origem === o ? ' selected' : ''}>${esc(o)}</option>`)
        .join('')}</select>
    </label>
    <div class="acoes">
      <button type="submit">Filtrar</button>
      <a class="botao discreto" href="/painel/apoiadores" style="text-decoration:none">Limpar</a>
    </div>
  </form>
</div>
<div class="cartao">
  <div class="titulo-com-acao">
    <h2>${total} ${total === 1 ? 'apoiador' : 'apoiadores'}</h2>
    ${
      total
        ? `<a class="botao discreto" href="/painel/apoiadores/exportar${
            paramsFiltro ? `?${paramsFiltro}` : ''
          }" download>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 16 6 10l1.4-1.4 3.6 3.6V3h2v9.2l3.6-3.6L18 10l-6 6Zm-7 5v-2h14v2H5Z"/>
            </svg>
            Exportar ${total === 1 ? 'este' : 'estes ' + total} em CSV
          </a>`
        : ''
    }
  </div>
  <div class="tabela-rolavel">
    <table>
      <thead><tr><th>Nome</th><th>WhatsApp</th><th>CEP</th><th>Cidade</th><th>Origem</th><th>Status</th><th>Cadastro</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>
  ${
    paginas > 1
      ? `<div class="acoes" style="margin-top:1rem">
          ${p > 1 ? link(query(p - 1), '← Anterior') : ''}
          <span class="vazio">Página ${p} de ${paginas}</span>
          ${p < paginas ? link(query(p + 1), 'Próxima →') : ''}
        </div>`
      : ''
  }
</div>`;
}

const CANAIS = [
  {
    chave: 'PUSH',
    nome: 'Push',
    descricao: 'Notificação no celular de quem instalou o WebApp e autorizou.',
    custo: 'Cobrado por envio',
  },
  {
    chave: 'WHATSAPP',
    nome: 'WhatsApp',
    descricao: 'Pela API oficial, com modelo aprovado pela Meta antes do envio.',
    custo: 'Cobrado por conversa',
  },
  {
    chave: 'SMS',
    nome: 'SMS',
    descricao: 'Mensagem de texto para quem confirmou o número no cadastro.',
    custo: 'Cobrado por mensagem',
  },
  {
    chave: 'RCS',
    nome: 'RCS',
    descricao: 'Mensagem rica com imagem e botões, na mesma caixa do SMS.',
    custo: 'Cobrado por mensagem',
  },
];

function telaTurbinar({ alcance, cidades, campanhas, aviso }) {
  const cartaoCanal = (c) => `<label class="canal">
    <input type="radio" name="channel" value="${c.chave}" ${c.chave === 'PUSH' ? 'checked' : ''}>
    <span class="canal-corpo">
      <span class="canal-topo">
        <strong>${esc(c.nome)}</strong>
        <span class="canal-alcance">${alcance[c.chave].toLocaleString('pt-BR')}</span>
      </span>
      <small>${esc(c.descricao)}</small>
      <small class="canal-custo">${esc(c.custo)}</small>
    </span>
  </label>`;

  const ROTULO_CAMPANHA = {
    DRAFT: 'Aguardando envio',
    SCHEDULED: 'Agendada',
    SENDING: 'Enviando',
    SENT: 'Enviada',
    FAILED: 'Falhou',
    CANCELED: 'Cancelada',
  };

  const historico = campanhas.length
    ? `<div class="tabela-rolavel"><table>
        <thead><tr>
          <th>Campanha</th><th>Canal</th><th>Público</th>
          <th>Enviadas</th><th>Status</th><th>Criada</th><th></th>
        </tr></thead>
        <tbody>${campanhas
          .map((c) => {
            const podeEnviar = c.status === 'DRAFT' && c.channel === 'PUSH';
            const progresso =
              c.status === 'SENDING' && c.totalRecipients
                ? ` <span class="vazio">(${Math.round(((c.totalSent + c.totalFailed) / c.totalRecipients) * 100)}%)</span>`
                : '';
            return `<tr>
              <td>${esc(c.name)}</td>
              <td>${esc(c.channel)}</td>
              <td>${c.totalRecipients.toLocaleString('pt-BR')}</td>
              <td>${c.totalSent.toLocaleString('pt-BR')}${
                c.totalFailed ? ` <span class="vazio">· ${c.totalFailed} falha(s)</span>` : ''
              }</td>
              <td><span class="etiqueta ${c.status === 'SENT' ? 'completo' : c.status === 'SENDING' ? 'pendente' : ''}">${
                esc(ROTULO_CAMPANHA[c.status] || c.status)
              }</span>${progresso}</td>
              <td>${esc(formatarData(c.createdAt))}</td>
              <td>${
                podeEnviar
                  ? `<form method="post" action="/painel/turbinar/${esc(c.id)}/enviar"
                       onsubmit="return confirm('Enviar para ${c.totalRecipients} pessoas? Isso desconta do seu saldo e não pode ser desfeito.')">
                       <button type="submit">Enviar agora</button></form>`
                  : c.status === 'DRAFT'
                    ? '<span class="vazio">Aguarda provedor</span>'
                    : ''
              }</td>
            </tr>`;
          })
          .join('')}</tbody>
      </table></div>`
    : '<p class="vazio">Nenhuma campanha criada ainda.</p>';

  const saldo = alcance.saldo;
  return `<h1>Turbinar</h1>

<div class="cartao" style="display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap">
  <div>
    <div class="rotulo" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--suave)">Saldo de disparos</div>
    <div style="font-size:2rem;font-weight:650;letter-spacing:-.03em" class="${saldo <= 0 ? 'saldo-zerado' : ''}">${saldo.toLocaleString('pt-BR')}</div>
  </div>
  <p class="vazio" style="flex:1;min-width:14rem;margin:0">
    ${
      saldo <= 0
        ? 'Você está sem saldo. Fale com a gente para liberar disparos antes de criar a campanha.'
        : 'Cada pessoa alcançada consome um disparo. Precisando de mais, é só falar com a gente.'
    }
  </p>
</div>

<p class="recado alerta">
  <strong>O push já dispara de verdade.</strong>
  WhatsApp, SMS e RCS ficam salvos como campanha, mas só saem depois que o
  provedor de mensagens for conectado.
</p>

<div class="cartao">
  <h2>Para quem você consegue falar hoje</h2>
  <p class="legenda-eixo">O público sai dos cadastros do seu WebApp. Push depende de a pessoa ter autorizado notificações; SMS e RCS dependem de ela ter confirmado o número.</p>

  <form method="post" action="/painel/turbinar">
    <div class="canais">${CANAIS.map(cartaoCanal).join('')}</div>

    <div class="linha" style="margin-top:1.25rem">
      <label class="campo"><span>Nome da campanha (só você vê)</span>
        <input type="text" name="name" required maxlength="150" placeholder="Ex: Convite para o comício de sábado">
      </label>
      <label class="campo"><span>Cidade (opcional)</span>
        <select name="city"><option value="">Todas as cidades</option>${cidades
          .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
          .join('')}</select>
      </label>
    </div>

    <label class="campo"><span>Título (aparece em negrito no push)</span>
      <input type="text" name="title" maxlength="150" placeholder="Ex: Vem com a gente!">
    </label>

    <label class="campo"><span>Mensagem</span>
      <textarea name="message" required maxlength="1000"
        placeholder="Escreva a mensagem que será enviada."></textarea>
    </label>

    <label class="campo"><span>Link ao tocar na mensagem (opcional)</span>
      <input type="url" name="linkUrl" placeholder="https://...">
    </label>

    <button type="submit">Criar campanha</button>
  </form>
</div>

<div class="cartao">
  <h2>Campanhas criadas</h2>
  ${historico}
</div>`;
}

function telaSenha({ obrigatoria, erro, nome, minimo }) {
  return `<h1>${obrigatoria ? 'Crie sua senha' : 'Trocar senha'}</h1>

${
  obrigatoria
    ? `<p class="recado alerta">
        <strong>Olá, ${esc(nome)}. Antes de continuar, escolha uma senha sua.</strong>
        A que você recebeu passou por WhatsApp ou e-mail e por isso não serve como
        senha permanente — outras pessoas podem ter visto.
      </p>`
    : ''
}
${erro ? `<p class="recado erro">${esc(erro)}</p>` : ''}

<div class="cartao" style="max-width:34rem">
  <form method="post" action="/painel/senha">
    <label class="campo"><span>Senha atual</span>
      <input type="password" name="atual" required autocomplete="current-password" autofocus>
    </label>
    <label class="campo"><span>Nova senha</span>
      <input type="password" name="nova" required minlength="${minimo}" autocomplete="new-password">
    </label>
    <label class="campo"><span>Repita a nova senha</span>
      <input type="password" name="confirmacao" required minlength="${minimo}" autocomplete="new-password">
    </label>
    <p class="vazio" style="margin-bottom:1rem">
      Mínimo de ${minimo} caracteres. Evite datas de nascimento, o número da urna
      e o nome da campanha — são os primeiros palpites de quem tenta invadir.
    </p>
    <button type="submit">Salvar nova senha</button>
  </form>
</div>`;
}

function telaConteudo({ tenant, propostas, redes, links, banners }) {
  const campo = (nome, rotulo, valor, tipo = 'text', extra = '') =>
    `<label class="campo"><span>${rotulo}</span>
      <input type="${tipo}" name="${nome}" value="${esc(valor ?? '')}" ${extra}></label>`;

  /// Mostra o que ja esta no ar antes de pedir o arquivo novo: sem a previa,
  /// a pessoa nao sabe se o campo esta vazio ou se a imagem simplesmente nao
  /// aparece no formulario.
  const campoImagem = (nome, rotulo, atual, campoRemover) => `<div class="campo">
    <span>${rotulo}</span>
    ${
      atual
        ? `<div class="previa">
            <img src="${esc(atual)}" alt="">
            <label class="remover">
              <input type="checkbox" name="${campoRemover}" value="1"> Remover
            </label>
          </div>`
        : '<p class="vazio" style="margin:0 0 .5rem">Nenhuma imagem enviada ainda.</p>'
    }
    <input type="file" name="${nome}" accept="image/jpeg,image/png,image/gif,image/webp">
    <small>JPG, PNG, GIF ou WebP, até 8 MB. A imagem é reduzida e convertida automaticamente.</small>
  </div>`;

  const listaPropostas = propostas.length
    ? propostas
        .map(
          (p) => `<div class="item">
            <div class="corpo">
              <strong>${esc(p.title)}</strong>
              <small>${esc(p.description || 'sem resumo')}</small>
            </div>
            <form method="post" action="/painel/conteudo/proposta/apagar">
              <input type="hidden" name="id" value="${esc(p.id)}">
              <button class="perigo" type="submit">Remover</button>
            </form>
          </div>`
        )
        .join('')
    : '<p class="vazio">Nenhuma proposta cadastrada.</p>';

  const listaRedes = redes.length
    ? redes
        .map(
          (r) => `<div class="item">
            <div class="corpo"><strong>${esc(r.platform)}</strong><small>${esc(r.url)}</small></div>
            <form method="post" action="/painel/conteudo/rede/apagar">
              <input type="hidden" name="id" value="${esc(r.id)}">
              <button class="perigo" type="submit">Remover</button>
            </form>
          </div>`
        )
        .join('')
    : '<p class="vazio">Nenhuma rede cadastrada.</p>';

  const listaLinks = links.length
    ? links
        .map(
          (l) => `<div class="item">
            <div class="corpo"><strong>${esc(l.label)}</strong><small>${esc(l.url)}</small></div>
            <form method="post" action="/painel/conteudo/link/apagar">
              <input type="hidden" name="id" value="${esc(l.id)}">
              <button class="perigo" type="submit">Remover</button>
            </form>
          </div>`
        )
        .join('')
    : '<p class="vazio">Nenhum link cadastrado.</p>';

  const listaBanners = banners.length
    ? banners
        .map(
          (b) => `<div class="item">
            <div class="corpo"><strong>${esc(b.slot)}</strong><small>${esc(b.imageUrl)}</small></div>
            <form method="post" action="/painel/conteudo/banner/apagar">
              <input type="hidden" name="id" value="${esc(b.id)}">
              <button class="perigo" type="submit">Remover</button>
            </form>
          </div>`
        )
        .join('')
    : '<p class="vazio">Nenhum banner cadastrado.</p>';

  return `<h1>Conteúdo do meu site</h1>

<div class="cartao">
  <h2>Identidade</h2>
  <form method="post" action="/painel/conteudo/perfil" enctype="multipart/form-data">
    ${campo('name', 'Nome', tenant.name, 'text', 'required maxlength="120"')}
    <div class="linha">
      ${campo('number', 'Número', tenant.number, 'text', 'maxlength="10"')}
      ${campo('party', 'Partido', tenant.party, 'text', 'maxlength="80"')}
    </div>
    <div class="linha">
      ${campo('city', 'Cidade', tenant.city, 'text', 'maxlength="120"')}
      ${campo('state', 'Estado (UF)', tenant.state, 'text', 'maxlength="2"')}
    </div>
    ${campo('slogan', 'Slogan', tenant.slogan, 'text', 'maxlength="200"')}
    <label class="campo"><span>Resumo (aparece abaixo do nome)</span>
      <textarea name="bio" maxlength="1200">${esc(tenant.bio || '')}</textarea></label>
    <label class="campo"><span>Meu currículo (abre ao tocar, no topo do site)</span>
      <textarea name="curriculum" maxlength="4000" style="min-height:140px">${esc(tenant.curriculum || '')}</textarea></label>
    <div class="linha">
      ${campoImagem('foto', 'Foto do candidato', tenant.photoUrl, 'removerFoto')}
      ${campoImagem('banner', 'Banner do topo', tenant.bannerUrl, 'removerBanner')}
    </div>
    ${campoImagem('cidade', 'Fundo das propostas (foto da cidade)', tenant.proposalsBgUrl, 'removerCidade')}
    <div class="linha">
      ${campo('primaryColor', 'Cor principal', cor(tenant.primaryColor, '#1e40af'), 'color')}
      ${campo('secondaryColor', 'Cor secundária', cor(tenant.secondaryColor, '#f59e0b'), 'color')}
      ${campo('darkColor', 'Cor dos botões', cor(tenant.darkColor, '#111114'), 'color')}
    </div>
    <button type="submit">Salvar identidade</button>
  </form>
</div>

<div class="cartao">
  <h2>Propostas</h2>
  ${listaPropostas}
  <form method="post" action="/painel/conteudo/proposta" style="margin-top:1rem">
    ${campo('title', 'Título', '', 'text', 'required maxlength="200"')}
    ${campo('description', 'Resumo do card', '', 'text', 'maxlength="300"')}
    <label class="campo"><span>Texto completo (abre ao clicar em Acessar agora)</span>
      <textarea name="content" maxlength="8000"></textarea></label>
    <button type="submit">Adicionar proposta</button>
  </form>
</div>

<div class="cartao">
  <h2>Redes sociais</h2>
  ${listaRedes}
  <form method="post" action="/painel/conteudo/rede" style="margin-top:1rem">
    <div class="linha">
      <label class="campo"><span>Rede</span>
        <select name="platform">
          ${['whatsapp', 'instagram', 'tiktok', 'youtube', 'facebook', 'telegram', 'x', 'site']
            .map((p) => `<option value="${p}">${p}</option>`)
            .join('')}
        </select>
      </label>
      ${campo('url', 'Endereço', '', 'url', 'required placeholder="https://..."')}
    </div>
    <button type="submit">Adicionar rede</button>
  </form>
</div>

<div class="cartao">
  <h2>Links importantes</h2>
  ${listaLinks}
  <form method="post" action="/painel/conteudo/link" enctype="multipart/form-data" style="margin-top:1rem">
    <div class="linha">
      ${campo('label', 'Rótulo', '', 'text', 'required maxlength="120"')}
      ${campo('url', 'Endereço', '', 'url', 'required placeholder="https://..."')}
    </div>
    <div class="campo">
      <span>Ícone (opcional)</span>
      <input type="file" name="icone" accept="image/jpeg,image/png,image/gif,image/webp">
      <small>Sem ícone, aparece a primeira letra do rótulo.</small>
    </div>
    <button type="submit">Adicionar link</button>
  </form>
</div>

<div class="cartao">
  <h2>Banners de divulgação</h2>
  ${listaBanners}
  <form method="post" action="/painel/conteudo/banner" enctype="multipart/form-data" style="margin-top:1rem">
    <div class="linha">
      <label class="campo"><span>Posição</span>
        <select name="slot">
          <option value="MEIO">Meio da página</option>
          <option value="RODAPE">Perto do rodapé</option>
        </select>
      </label>
      <div class="campo">
        <span>Imagem</span>
        <input type="file" name="imagem" accept="image/jpeg,image/png,image/gif,image/webp" required>
      </div>
    </div>
    ${campo('linkUrl', 'Link ao clicar (opcional)', '', 'url')}
    <button type="submit">Adicionar banner</button>
  </form>
</div>`;
}

module.exports = {
  pagina, telaEntrar, telaInicio, telaApoiadores, telaConteudo, telaTurbinar, telaSenha,
  ESTILO, formatarData, formatarTelefone,
};
