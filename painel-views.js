const { esc, cor } = require('./html');

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
  .marca { font-weight: 700; letter-spacing: -.01em; }
  .marca span { display: block; font-size: .72rem; font-weight: 500; color: var(--suave); }
  .topo-linha form { margin-left: auto; }
  .abas {
    max-width: 1040px; margin: 0 auto; padding: 0 1.25rem;
    display: flex; gap: .25rem; overflow-x: auto; scrollbar-width: none;
  }
  .abas::-webkit-scrollbar { display: none; }
  .abas a {
    padding: .7rem .9rem; border-bottom: 2px solid transparent; white-space: nowrap;
    color: var(--suave); text-decoration: none; font-size: .9rem; font-weight: 500;
  }
  .abas a.ativa { color: var(--primaria); border-bottom-color: var(--primaria); }
  main { max-width: 1040px; margin: 0 auto; padding: 1.5rem 1.25rem 4rem; }
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
  label.campo > span {
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
  .vazio { color: var(--suave); font-size: .9rem; padding: .5rem 0; }

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
`;

function pagina({ titulo, tenant, aba, corpo, recado }) {
  const principal = cor(tenant?.primaryColor, '#1e40af');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Candidato Online</title>
<style>${ESTILO}
  :root { --primaria: ${principal}; }
</style>
</head>
<body>
<header class="topo">
  <div class="topo-linha">
    <div class="marca">${esc(tenant.name)}<span>candidato.bio/${esc(tenant.slug)}</span></div>
    <form method="post" action="/painel/sair">
      <button class="discreto" type="submit">Sair</button>
    </form>
  </div>
  <nav class="abas">
    <a href="/painel/inicio" class="${aba === 'inicio' ? 'ativa' : ''}">Início</a>
    <a href="/painel/apoiadores" class="${aba === 'apoiadores' ? 'ativa' : ''}">Apoiadores</a>
    <a href="/painel/conteudo" class="${aba === 'conteudo' ? 'ativa' : ''}">Conteúdo</a>
    <a href="/${esc(tenant.slug)}" target="_blank" rel="noopener">Ver meu site ↗</a>
  </nav>
</header>
<main>
  ${recado ? `<p class="recado ${recado.tipo}">${esc(recado.texto)}</p>` : ''}
  ${corpo}
</main>
</body>
</html>`;
}

function telaEntrar({ erro, email }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entrar · Candidato Online</title>
<style>${ESTILO}
  body { display: grid; place-items: center; min-height: 100vh; padding: 1.5rem; }
  .caixa { width: 100%; max-width: 380px; }
  .caixa h1 { text-align: center; margin-bottom: .3rem; }
  .caixa .sub { text-align: center; color: var(--suave); font-size: .88rem; margin: 0 0 1.5rem; }
  .caixa button { width: 100%; padding: .75rem; }
</style>
</head>
<body>
<div class="caixa">
  <h1>Candidato Online</h1>
  <p class="sub">Acesse o painel da sua campanha</p>
  <div class="cartao">
    ${erro ? `<p class="recado erro">${esc(erro)}</p>` : ''}
    <form method="post" action="/painel/entrar">
      <label class="campo"><span>E-mail</span>
        <input type="email" name="email" value="${esc(email || '')}" required autofocus autocomplete="username">
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

function etiquetaStatus(status) {
  const classe = status === 'COMPLETO' ? 'completo' : status === 'CONFIRMADO' ? '' : 'pendente';
  return `<span class="etiqueta ${classe}">${esc(status)}</span>`;
}

function telaInicio({ numeros, ultimos }) {
  const cartaoNumero = (rotulo, valor) =>
    `<div class="numero"><div class="valor">${valor}</div><div class="rotulo">${rotulo}</div></div>`;

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

  return `<h1>Início</h1>
<div class="numeros">
  ${cartaoNumero('Total de apoiadores', numeros.total)}
  ${cartaoNumero('Cadastros hoje', numeros.hoje)}
  ${cartaoNumero('Últimos 7 dias', numeros.semana)}
  ${cartaoNumero('Últimos 30 dias', numeros.mes)}
  ${cartaoNumero('SMS confirmados', numeros.confirmados)}
  ${cartaoNumero('Push ativos', numeros.push)}
</div>
<div class="cartao">
  <h2>Últimos cadastros</h2>
  <div class="tabela-rolavel">
    <table>
      <thead><tr><th>Nome</th><th>WhatsApp</th><th>Cidade</th><th>Status</th><th>Cadastro</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>
</div>`;
}

function telaApoiadores({ apoiadores, filtros, cidades, total, pagina: p, paginas }) {
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
        ${['PENDENTE', 'CONFIRMADO', 'COMPLETO']
          .map((s) => `<option value="${s}"${filtros.status === s ? ' selected' : ''}>${s}</option>`)
          .join('')}
      </select>
    </label>
    <label class="campo"><span>Origem</span>
      <input type="text" name="origem" value="${esc(filtros.origem || '')}" placeholder="instagram, qrcode...">
    </label>
    <div class="acoes">
      <button type="submit">Filtrar</button>
      <a class="botao discreto" href="/painel/apoiadores" style="text-decoration:none">Limpar</a>
    </div>
  </form>
</div>
<div class="cartao">
  <h2>${total} ${total === 1 ? 'apoiador' : 'apoiadores'}</h2>
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

function telaConteudo({ tenant, propostas, redes, links, banners }) {
  const campo = (nome, rotulo, valor, tipo = 'text', extra = '') =>
    `<label class="campo"><span>${rotulo}</span>
      <input type="${tipo}" name="${nome}" value="${esc(valor ?? '')}" ${extra}></label>`;

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
  <form method="post" action="/painel/conteudo/perfil">
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
    <div class="linha">
      ${campo('photoUrl', 'URL da foto', tenant.photoUrl, 'url')}
      ${campo('bannerUrl', 'URL do banner do topo', tenant.bannerUrl, 'url')}
    </div>
    <div class="linha">
      ${campo('primaryColor', 'Cor principal', cor(tenant.primaryColor, '#1e40af'), 'color')}
      ${campo('secondaryColor', 'Cor secundária', cor(tenant.secondaryColor, '#f59e0b'), 'color')}
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
  <form method="post" action="/painel/conteudo/link" style="margin-top:1rem">
    <div class="linha">
      ${campo('label', 'Rótulo', '', 'text', 'required maxlength="120"')}
      ${campo('url', 'Endereço', '', 'url', 'required placeholder="https://..."')}
    </div>
    ${campo('iconUrl', 'URL do ícone (opcional)', '', 'url')}
    <button type="submit">Adicionar link</button>
  </form>
</div>

<div class="cartao">
  <h2>Banners de divulgação</h2>
  ${listaBanners}
  <form method="post" action="/painel/conteudo/banner" style="margin-top:1rem">
    <div class="linha">
      <label class="campo"><span>Posição</span>
        <select name="slot">
          <option value="MEIO">Meio da página</option>
          <option value="RODAPE">Perto do rodapé</option>
        </select>
      </label>
      ${campo('imageUrl', 'URL da imagem', '', 'url', 'required placeholder="https://..."')}
    </div>
    ${campo('linkUrl', 'Link ao clicar (opcional)', '', 'url')}
    <button type="submit">Adicionar banner</button>
  </form>
</div>`;
}

module.exports = { pagina, telaEntrar, telaInicio, telaApoiadores, telaConteudo };
