const { esc, tagsDeIcone } = require('./html');
const { ESTILO, formatarData } = require('./painel-views');

const ESTILO_MASTER = `${ESTILO}
  .topo { border-bottom: 1px solid var(--borda); }
  .marca-master { font-weight: 750; letter-spacing: -.02em; }
  .marca-master span {
    display: block; font-size: .7rem; font-weight: 600; letter-spacing: .09em;
    text-transform: uppercase; color: var(--primaria);
  }
  main { padding-bottom: 4rem; }
  body { padding-bottom: 0; }

  .barra-master {
    max-width: 1040px; margin: 0 auto; padding: 0 1.25rem;
    display: flex; gap: .25rem; overflow-x: auto; scrollbar-width: none;
  }
  .barra-master::-webkit-scrollbar { display: none; }
  .barra-master a {
    padding: .7rem .9rem; border-bottom: 2px solid transparent; white-space: nowrap;
    color: var(--suave); text-decoration: none; font-size: .9rem; font-weight: 550;
  }
  .barra-master a.ativa { color: var(--primaria); border-bottom-color: var(--primaria); }

  .saldo { font-variant-numeric: tabular-nums; font-weight: 650; }
  .saldo.zerado { color: var(--perigo); }
  .saldo.baixo { color: #a15c07; }

  tr.inativo td { opacity: .55; }
  td .sub { display: block; font-size: .78rem; color: var(--suave); }
  .acoes-linha { display: flex; gap: .4rem; flex-wrap: wrap; }
  .acoes-linha .botao, .acoes-linha button {
    padding: .38rem .7rem; font-size: .82rem; text-decoration: none;
  }
  .credencial {
    background: #f4f6fa; border: 1px solid var(--borda); border-radius: 10px;
    padding: .9rem 1rem; font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: .88rem; word-break: break-all; margin-top: .8rem;
  }
  .movimento { display: flex; align-items: baseline; gap: .8rem; padding: .7rem 0; border-bottom: 1px solid var(--borda); }
  .movimento:last-child { border-bottom: 0; }
  .movimento .qtd { font-variant-numeric: tabular-nums; font-weight: 650; min-width: 5rem; }
  .movimento .qtd.entra { color: var(--ok); }
  .movimento .qtd.sai { color: var(--perigo); }
  .movimento .corpo { flex: 1; min-width: 0; }
  .movimento .corpo small { display: block; color: var(--suave); font-size: .8rem; }
`;

function pagina({ titulo, aba, corpo, recado, nome }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Master</title>
${tagsDeIcone()}
<style>${ESTILO_MASTER}</style>
</head>
<body>
<header class="topo">
  <div class="topo-linha">
    <img class="logo-marca" src="/assets/logo-72.png"
      srcset="/assets/logo-72.png 1x, /assets/logo-144.png 2x"
      alt="Candidato Online" width="213" height="72">
    <div class="divisor"></div>
    <div class="marca-master">${esc(nome || 'Administração')}<span>Painel Master</span></div>
    <div class="acoes-topo">
      <a class="botao discreto" href="/painel/senha"><span>Trocar senha</span></a>
      <form method="post" action="/painel/sair"><button class="sair" type="submit">Sair</button></form>
    </div>
  </div>
  <nav class="barra-master">
    <a href="/master" class="${aba === 'candidatos' ? 'ativa' : ''}">Candidatos</a>
    <a href="/master/novo" class="${aba === 'novo' ? 'ativa' : ''}">Novo candidato</a>
  </nav>
</header>
<main>
  ${recado ? `<p class="recado ${recado.tipo}">${esc(recado.texto)}</p>` : ''}
  ${corpo}
</main>
</body>
</html>`;
}

function classeSaldo(saldo) {
  if (saldo <= 0) return 'zerado';
  return saldo < 500 ? 'baixo' : '';
}

function telaCandidatos({ candidatos, totais }) {
  const numero = (rotulo, valor) =>
    `<div class="numero"><div class="valor">${valor.toLocaleString('pt-BR')}</div><div class="rotulo">${rotulo}</div></div>`;

  const linhas = candidatos.length
    ? candidatos
        .map(
          (c) => `<tr class="${c.active ? '' : 'inativo'}">
            <td>
              <strong>${esc(c.name)}</strong>
              <span class="sub">candidato.bio/${esc(c.slug)}${c.active ? '' : ' · desativado'}</span>
            </td>
            <td>${c.apoiadores.toLocaleString('pt-BR')}<span class="sub">${c.novos30} nos 30 dias</span></td>
            <td>${c.campanhas}</td>
            <td class="saldo ${classeSaldo(c.creditBalance)}">${c.creditBalance.toLocaleString('pt-BR')}</td>
            <td>${esc(formatarData(c.createdAt))}</td>
            <td><a class="botao discreto" href="/master/candidato/${esc(c.id)}">Abrir</a></td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="vazio">Nenhum candidato cadastrado. Crie o primeiro na aba ao lado.</td></tr>';

  return `<h1>Candidatos</h1>

<div class="numeros">
  ${numero('Candidatos ativos', totais.ativos)}
  ${numero('Apoiadores na plataforma', totais.apoiadores)}
  ${numero('Campanhas criadas', totais.campanhas)}
  ${numero('Créditos em circulação', totais.saldo)}
  ${numero('Créditos liberados', totais.creditado)}
  ${numero('Créditos consumidos', totais.consumido)}
</div>

<div class="cartao">
  <div class="tabela-rolavel">
    <table>
      <thead><tr>
        <th>Candidato</th><th>Apoiadores</th><th>Campanhas</th>
        <th>Saldo de disparos</th><th>Criado em</th><th></th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>
</div>`;
}

function telaCandidato({ tenant, numeros, creditos, extrato, acesso, senhaNova }) {
  const movimentos = extrato.length
    ? extrato
        .map((m) => {
          const entra = m.amount > 0;
          return `<div class="movimento">
            <span class="qtd ${entra ? 'entra' : 'sai'}">${entra ? '+' : ''}${m.amount.toLocaleString('pt-BR')}</span>
            <span class="corpo">
              <strong>${esc(m.type)}</strong>
              <small>${esc(m.description || 'sem observação')} · saldo depois: ${m.balanceAfter.toLocaleString('pt-BR')}</small>
            </span>
            <span class="vazio" style="font-size:.8rem">${esc(formatarData(m.createdAt))}</span>
          </div>`;
        })
        .join('')
    : '<p class="vazio">Nenhum lançamento ainda.</p>';

  return `<h1>${esc(tenant.name)}</h1>
<p class="vazio" style="margin:-.75rem 0 1.25rem">
  <a href="/${esc(tenant.slug)}" target="_blank" rel="noopener">candidato.bio/${esc(tenant.slug)} ↗</a>
  ${tenant.active ? '' : ' · <strong>desativado</strong>'}
</p>

<div class="numeros">
  <div class="numero"><div class="valor">${numeros.apoiadores.toLocaleString('pt-BR')}</div><div class="rotulo">Apoiadores</div></div>
  <div class="numero"><div class="valor">${numeros.push.toLocaleString('pt-BR')}</div><div class="rotulo">Alcance de push</div></div>
  <div class="numero"><div class="valor">${numeros.telefone.toLocaleString('pt-BR')}</div><div class="rotulo">Número confirmado</div></div>
  <div class="numero"><div class="valor">${numeros.campanhas.toLocaleString('pt-BR')}</div><div class="rotulo">Campanhas</div></div>
  <div class="numero"><div class="valor">${numeros.disparosPrevistos.toLocaleString('pt-BR')}</div><div class="rotulo">Destinatários somados</div></div>
  <div class="numero"><div class="valor">${numeros.saiu.toLocaleString('pt-BR')}</div><div class="rotulo">Descadastrados</div></div>
</div>

<div class="cartao">
  <h2>Disparos</h2>
  <div class="numeros" style="margin-bottom:1.1rem">
    <div class="numero"><div class="valor saldo ${classeSaldo(creditos.saldo)}">${creditos.saldo.toLocaleString('pt-BR')}</div><div class="rotulo">Saldo atual</div></div>
    <div class="numero"><div class="valor">${creditos.creditado.toLocaleString('pt-BR')}</div><div class="rotulo">Já liberado</div></div>
    <div class="numero"><div class="valor">${creditos.consumido.toLocaleString('pt-BR')}</div><div class="rotulo">Já consumido</div></div>
  </div>

  <form method="post" action="/master/candidato/${esc(tenant.id)}/creditos">
    <div class="linha">
      <label class="campo"><span>Quantidade</span>
        <input type="number" name="quantidade" required step="1" placeholder="Ex: 5000">
      </label>
      <label class="campo"><span>Tipo</span>
        <select name="tipo">
          <option value="COMPRA">Compra</option>
          <option value="BONUS">Bônus</option>
          <option value="AJUSTE">Ajuste</option>
          <option value="ESTORNO">Estorno</option>
        </select>
      </label>
    </div>
    <label class="campo"><span>Observação (aparece no extrato)</span>
      <input type="text" name="descricao" maxlength="250" placeholder="Ex: pacote pago via PIX em 03/08">
    </label>
    <button type="submit">Lançar no extrato</button>
    <p class="vazio" style="margin-top:.7rem">
      Para retirar créditos, informe quantidade negativa — o extrato guarda a
      correção em vez de apagar o lançamento errado.
    </p>
  </form>
</div>

<div class="cartao">
  <h2>Extrato</h2>
  ${movimentos}
</div>

<div class="cartao">
  <h2>Acesso do candidato</h2>
  <p class="vazio">Login: <strong>${esc(acesso?.email || 'sem usuário vinculado')}</strong></p>
  ${
    senhaNova
      ? `<div class="credencial">Nova senha temporária: <strong>${esc(senhaNova)}</strong><br>
          Anote agora — ela não pode ser lida depois. No próximo acesso o painel exige a troca.</div>`
      : ''
  }
  <div class="acoes-linha" style="margin-top:1rem">
    <form method="post" action="/master/candidato/${esc(tenant.id)}/senha">
      <button class="discreto" type="submit">Gerar nova senha</button>
    </form>
    <form method="post" action="/master/candidato/${esc(tenant.id)}/status">
      <input type="hidden" name="ativo" value="${tenant.active ? '0' : '1'}">
      <button class="${tenant.active ? 'perigo' : 'discreto'}" type="submit">
        ${tenant.active ? 'Desativar candidato' : 'Reativar candidato'}
      </button>
    </form>
  </div>
  <p class="vazio" style="margin-top:.8rem">
    Desativar tira o site do ar e bloqueia o acesso ao painel. Nada é apagado.
  </p>
</div>`;
}

function telaNovoCandidato({ erro, valores = {}, criado }) {
  if (criado) {
    return `<h1>Candidato criado</h1>
<div class="cartao">
  <p><strong>${esc(criado.nome)}</strong> está no ar.</p>
  <div class="credencial">
    Site: candidato.bio/${esc(criado.slug)}<br>
    Login: ${esc(criado.email)}<br>
    Senha temporária: <strong>${esc(criado.senha)}</strong>
  </div>
  <p class="vazio" style="margin-top:.8rem">
    Anote a senha agora: ela é gravada com hash e não pode ser lida depois.
    No primeiro acesso o painel exige a troca.
  </p>
  <div class="acoes-linha" style="margin-top:1rem">
    <a class="botao" href="/master/candidato/${esc(criado.id)}">Abrir ficha</a>
    <a class="botao discreto" href="/${esc(criado.slug)}" target="_blank" rel="noopener">Ver o site</a>
    <a class="botao discreto" href="/master/novo">Criar outro</a>
  </div>
</div>`;
  }

  const campo = (nome, rotulo, extra = '', tipo = 'text') =>
    `<label class="campo"><span>${rotulo}</span>
      <input type="${tipo}" name="${nome}" value="${esc(valores[nome] || '')}" ${extra}></label>`;

  return `<h1>Novo candidato</h1>
${erro ? `<p class="recado erro">${esc(erro)}</p>` : ''}
<div class="cartao" style="max-width:44rem">
  <form method="post" action="/master/novo">
    ${campo('nome', 'Nome do candidato', 'required maxlength="120" autofocus')}
    <div class="linha">
      ${campo('slug', 'Endereço (deixe vazio para gerar do nome)', 'maxlength="60" placeholder="dra-maria"')}
      ${campo('email', 'E-mail de acesso (vazio gera do endereço)', 'maxlength="180"', 'email')}
    </div>
    <div class="linha">
      ${campo('numero', 'Número', 'maxlength="10"')}
      ${campo('partido', 'Partido', 'maxlength="80"')}
    </div>
    <div class="linha">
      ${campo('cidade', 'Cidade', 'maxlength="120"')}
      ${campo('estado', 'Estado (UF)', 'maxlength="2"')}
    </div>
    ${campo('slogan', 'Slogan', 'maxlength="200"')}
    <div class="linha">
      ${campo('cor', 'Cor principal', '', 'color')}
      ${campo('cor2', 'Cor secundária', '', 'color')}
    </div>
    ${campo('creditos', 'Créditos iniciais de disparo', 'min="0" step="1" placeholder="0"', 'number')}
    <button type="submit">Criar candidato</button>
  </form>
</div>`;
}

module.exports = { pagina, telaCandidatos, telaCandidato, telaNovoCandidato };
