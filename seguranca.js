/// Cabecalhos de seguranca da resposta.
///
/// Sao instrucoes que o navegador obedece: dizem o que ele pode carregar, onde
/// pode embutir a pagina e por qual protocolo falar. Nada disso protege o
/// servidor — protege quem esta do outro lado.

/// Seis meses. E tempo suficiente para valer a pena e curto o bastante para
/// que um problema de certificado nao deixe o site inalcancavel por um ano:
/// com HSTS ativo o navegador recusa http e nao oferece o "prosseguir assim
/// mesmo".
const HSTS = 'max-age=15552000';

/// Sem includeSubDomains de proposito: a promessa valeria para qualquer
/// subdominio futuro, inclusive um de teste que suba sem certificado.

const POLITICA = [
  "default-src 'self'",
  // 'unsafe-inline' porque as paginas sao montadas em template literal, com o
  // script e o estilo dentro do HTML. O certo e assinar cada bloco com nonce;
  // ate la o que segura XSS aqui e o esc() de toda saida.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // blob: por causa da arte convertida para JPEG na hora de compartilhar;
  // data: pelos icones embutidos.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Ninguem embute a pagina do candidato num iframe. E o que impede montarem
  // uma copia com um botao invisivel por cima.
  "frame-ancestors 'none'",
  // Sem upgrade-insecure-requests: a Hostinger ja manda esse mesmo cabecalho na
  // borda, entao aqui ele nao acrescenta nada em producao — e quebraria o
  // desenvolvimento local, onde o servidor roda em http e o navegador passaria
  // a exigir https de si mesmo.
].join('; ');

/// A mesma politica dentro do HTML.
///
/// Existe porque a borda da Hostinger troca o cabecalho Content-Security-Policy
/// pelo dela — verificado em producao: sai daqui completo e chega ao navegador
/// so como "upgrade-insecure-requests". Pela tag o navegador le direto do
/// documento, e nenhum intermediario reescreve.
///
/// frame-ancestors fica de fora porque o navegador ignora essa diretiva quando
/// vem por tag, e reclamaria no console. Quem segura o iframe e o
/// X-Frame-Options, que a borda deixa passar.
const POLITICA_NA_TAG = POLITICA.split('; ')
  .filter((d) => !d.startsWith('frame-ancestors'))
  .join('; ');

function metaCsp() {
  return `<meta http-equiv="Content-Security-Policy" content="${POLITICA_NA_TAG}">`;
}

function cabecalhos(req, res, next) {
  res.set({
    'Content-Security-Policy': POLITICA,
    'Strict-Transport-Security': HSTS,
    // Impede o navegador de "adivinhar" que um arquivo e outra coisa: uma
    // imagem enviada pelo painel nunca deve acabar executada como script.
    'X-Content-Type-Options': 'nosniff',
    // Repete frame-ancestors para navegador antigo que nao le CSP.
    'X-Frame-Options': 'DENY',
    // O link de saida carrega a chave da pessoa na URL. Sem isso, ela viajaria
    // no Referer para qualquer site aberto a partir dali.
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
}

module.exports = { cabecalhos, metaCsp, POLITICA, HSTS };
