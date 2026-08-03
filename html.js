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

/// URL de destino so pode ser http(s). Sem isso, um link cadastrado como
/// "javascript:..." viraria execucao de script na pagina do candidato.
function urlSegura(valor) {
  try {
    const u = new URL(String(valor));
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

module.exports = { esc, cor, urlSegura };
