const { esc } = require('./html');

/// Paleta validada para dashboards, independente da cor do candidato.
/// A cor de campanha veste o topo do painel; os graficos usam esta paleta
/// porque ela foi verificada contra daltonismo e contraste na superficie
/// branca — tingir grafico com a cor do partido quebraria essa garantia.
const C = {
  serie: '#2a78d6',
  ordinal: ['#86b6ef', '#2a78d6', '#104281'],
  grade: '#e1e0d9',
  eixo: '#c3c2b7',
  muda: '#898781',
  secundaria: '#52514e',
  tinta: '#0b0b0b',
  superficie: '#ffffff',
};

const compacto = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

/// Arredonda o topo do eixo para um numero limpo (10, 25, 50, 100...).
function tetoLimpo(max) {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    const alvo = passo * magnitude;
    if (alvo >= max) return alvo;
  }
  return 10 * magnitude;
}

function diaCurto(data) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(data);
}

// ---------------------------------------------------------------------------
// Area: cadastros por dia
// ---------------------------------------------------------------------------

/// Serie unica, entao sem legenda: o titulo do cartao ja diz o que esta
/// plotado, e uma caixa com um unico quadradinho so repetiria o titulo.
function areaCadastros(serie) {
  const L = 48, R = 16, T = 22, B = 34;
  const W = 720, H = 320;
  const largura = W - L - R;
  const altura = H - T - B;

  if (!serie.length) return semDados(W, H, 'Sem cadastros nos últimos 30 dias.');

  const maximo = Math.max(...serie.map((p) => p.valor));
  const teto = tetoLimpo(maximo);
  const x = (i) => L + (serie.length === 1 ? largura / 2 : (i * largura) / (serie.length - 1));
  const y = (v) => T + altura - (v / teto) * altura;

  const linha = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = `${linha} L${x(serie.length - 1).toFixed(1)},${T + altura} L${L},${T + altura} Z`;

  const marcas = [0, teto / 2, teto];
  const grade = marcas
    .map(
      (v) => `<line x1="${L}" y1="${y(v).toFixed(1)}" x2="${W - R}" y2="${y(v).toFixed(1)}"
        stroke="${v === 0 ? C.eixo : C.grade}" stroke-width="1"/>
      <text x="${L - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end"
        font-size="12.5" fill="${C.muda}" style="font-variant-numeric:tabular-nums">${v}</text>`
    )
    .join('');

  // Rotula so o pico e a ponta: numero em cada ponto vira ruido e ninguem le.
  const iPico = serie.reduce((melhor, p, i) => (p.valor > serie[melhor].valor ? i : melhor), 0);
  const iFim = serie.length - 1;
  const destaque = [...new Set([iPico, iFim])]
    .filter((i) => serie[i].valor > 0)
    .map((i) => {
      const px = x(i), py = y(serie[i].valor);
      const ancora = px > W - R - 40 ? 'end' : px < L + 40 ? 'start' : 'middle';
      return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${C.serie}"
          stroke="${C.superficie}" stroke-width="2"/>
        <text x="${px.toFixed(1)}" y="${(py - 14).toFixed(1)}" text-anchor="${ancora}"
          font-size="13" font-weight="650" fill="${C.tinta}">${serie[i].valor}</text>`;
    })
    .join('');

  const passoRotulo = Math.max(1, Math.ceil(serie.length / 6));
  const rotulosX = serie
    .map((p, i) =>
      i % passoRotulo === 0 || i === iFim
        ? `<text x="${x(i).toFixed(1)}" y="${H - 11}" text-anchor="middle" font-size="12"
            fill="${C.muda}">${diaCurto(p.data)}</text>`
        : ''
    )
    .join('');

  // Faixas invisiveis de toque: alvo bem maior que o ponto, senao acertar
  // com o mouse vira mira de precisao.
  const faixaLargura = largura / Math.max(1, serie.length - 1);
  const alvos = serie
    .map(
      (p, i) => `<rect class="alvo" x="${(x(i) - faixaLargura / 2).toFixed(1)}" y="${T}"
        width="${faixaLargura.toFixed(1)}" height="${altura}" fill="transparent"
        data-x="${x(i).toFixed(1)}" data-rotulo="${esc(diaCurto(p.data))}"
        data-valor="${p.valor}"/>`
    )
    .join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img"
    aria-label="Cadastros por dia nos últimos 30 dias">
    ${grade}
    <path d="${area}" fill="${C.serie}" fill-opacity="0.10"/>
    <path d="${linha}" fill="none" stroke="${C.serie}" stroke-width="2"
      stroke-linejoin="round" stroke-linecap="round"/>
    ${destaque}
    ${rotulosX}
    <line class="mira" x1="0" y1="${T}" x2="0" y2="${T + altura}"
      stroke="${C.eixo}" stroke-width="1" opacity="0"/>
    ${alvos}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Barras horizontais
// ---------------------------------------------------------------------------

/// Categorias nominais (origem, cidade) recebem uma cor so. Escurecer a barra
/// conforme o valor duplicaria o comprimento em cor sem informar nada novo.
function barras(itens, { ordinal = false } = {}) {
  if (!itens.length) return null;

  const ALTURA = 22, PASSO = 46, VALOR = 52;
  const W = 720;
  const H = itens.length * PASSO + 10;

  // A calha dos rotulos acompanha o texto mais longo, dentro de um limite.
  // Calha fixa faz nome comprido vazar para fora do grafico, e rotulo cortado
  // e pior que rotulo abreviado.
  const LARGURA_CARACTERE = 7.4;
  const maiorRotulo = Math.max(...itens.map((i) => String(i.rotulo).length));
  const ROTULO = Math.min(250, Math.max(100, maiorRotulo * LARGURA_CARACTERE + 18));
  const cabeCaracteres = Math.floor((ROTULO - 18) / LARGURA_CARACTERE);

  const largura = W - ROTULO - VALOR;
  const teto = tetoLimpo(Math.max(...itens.map((i) => i.valor)));

  const linhas = itens
    .map((item, i) => {
      const y = i * PASSO + 6;
      const comprimento = Math.max(2, (item.valor / teto) * largura);
      const cor = ordinal ? C.ordinal[Math.min(i, C.ordinal.length - 1)] : C.serie;
      const rotuloCompleto = String(item.rotulo);
      // Abreviado na tela; inteiro continua na dica e na tabela gemea.
      const visivel =
        rotuloCompleto.length > cabeCaracteres
          ? `${rotuloCompleto.slice(0, cabeCaracteres - 1).trimEnd()}…`
          : rotuloCompleto;
      return `<g class="barra" data-rotulo="${esc(rotuloCompleto)}" data-valor="${item.valor}">
        <title>${esc(rotuloCompleto)}</title>
        <text x="${ROTULO - 12}" y="${y + ALTURA / 2 + 5}" text-anchor="end" font-size="13.5"
          fill="${C.secundaria}">${esc(visivel)}</text>
        <rect x="${ROTULO}" y="${y}" width="${comprimento.toFixed(1)}" height="${ALTURA}"
          rx="4" fill="${cor}"/>
        <rect x="${ROTULO}" y="${y}" width="4" height="${ALTURA}" fill="${cor}"/>
        <text x="${(ROTULO + comprimento + 10).toFixed(1)}" y="${y + ALTURA / 2 + 5}" font-size="13.5"
          font-weight="600" fill="${C.tinta}" style="font-variant-numeric:tabular-nums">${item.valor}</text>
        <rect class="alvo-barra" x="0" y="${y - 11}" width="${W}" height="${PASSO}" fill="transparent"/>
      </g>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img">${linhas}</svg>`;
}

function semDados(W, H, mensagem) {
  return `<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="${esc(mensagem)}">
    <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="13" fill="${C.muda}">${esc(mensagem)}</text>
  </svg>`;
}

/// Toda visualizacao tem gemea em tabela: o grafico nunca e o unico caminho
/// para o numero.
function tabela(cabecalhos, linhas) {
  return `<details class="tabela-gemea">
    <summary>Ver como tabela</summary>
    <table>
      <thead><tr>${cabecalhos.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${linhas
        .map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>
    </table>
  </details>`;
}

module.exports = { areaCadastros, barras, tabela, semDados, compacto, diaCurto, C };
