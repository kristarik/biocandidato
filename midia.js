const sharp = require('sharp');
const { getPrisma } = require('./prisma-client');

class ErroMidia extends Error {}

/// Limite por tipo de imagem. Guardar o original seria desperdicio: a foto do
/// candidato aparece num circulo de 148px, e mandar 4 MB para o celular do
/// eleitor custa o carregamento da pagina inteira.
const PERFIS = {
  foto: { largura: 800, altura: 800, rotulo: 'foto do candidato' },
  banner: { largura: 1600, altura: 700, rotulo: 'banner do topo' },
  cidade: { largura: 1400, altura: 1000, rotulo: 'fundo das propostas' },
  divulgacao: { largura: 1600, altura: 900, rotulo: 'banner de divulgação' },
  icone: { largura: 240, altura: 240, rotulo: 'ícone do link' },
};

const ENTRADA_MAXIMA = 8 * 1024 * 1024;

/// Confere o tipo pelo conteudo, nao pela extensao nem pelo que o navegador
/// declarou: os dois sao escolhidos por quem envia.
const ASSINATURAS = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/gif', [0x47, 0x49, 0x46, 0x38]],
  ['image/webp', [0x52, 0x49, 0x46, 0x46]],
];

function tipoReal(buffer) {
  for (const [mime, assinatura] of ASSINATURAS) {
    if (assinatura.every((byte, i) => buffer[i] === byte)) return mime;
  }
  return null;
}

/// Normaliza a imagem: reduz, converte para WebP e descarta os metadados.
/// Descartar importa por privacidade — foto tirada no celular costuma trazer
/// a coordenada de onde foi feita dentro do arquivo.
async function processar(buffer, tipo) {
  const perfil = PERFIS[tipo];
  if (!perfil) throw new ErroMidia('Tipo de imagem desconhecido.');
  if (!buffer?.length) throw new ErroMidia('Nenhum arquivo recebido.');
  if (buffer.length > ENTRADA_MAXIMA) {
    throw new ErroMidia(`A imagem passa de ${ENTRADA_MAXIMA / 1048576} MB. Reduza antes de enviar.`);
  }
  if (!tipoReal(buffer)) {
    throw new ErroMidia('O arquivo não é uma imagem JPG, PNG, GIF ou WebP.');
  }

  try {
    const saida = await sharp(buffer, { failOn: 'error' })
      .rotate() // aplica a orientacao do EXIF antes de descarta-lo
      .resize(perfil.largura, perfil.altura, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return {
      data: saida.data,
      mime: 'image/webp',
      size: saida.data.length,
      width: saida.info.width,
      height: saida.info.height,
    };
  } catch (err) {
    if (err instanceof ErroMidia) throw err;
    throw new ErroMidia('Não foi possível ler esta imagem. Tente outro arquivo.');
  }
}

/// Grava e devolve o caminho publico, que e o que vai no campo de URL do
/// tenant — assim o WebApp continua lendo uma URL, sem saber de onde veio.
async function salvar({ tenantId, tipo, buffer, createdById }) {
  const imagem = await processar(buffer, tipo);
  const registro = await getPrisma().mediaFile.create({
    data: {
      tenantId,
      kind: tipo,
      mime: imagem.mime,
      size: imagem.size,
      width: imagem.width,
      height: imagem.height,
      data: imagem.data,
      createdById: createdById || null,
    },
    select: { id: true },
  });
  return { id: registro.id, url: `/midia/${registro.id}`, ...imagem, data: undefined };
}

/// Entrega a imagem. O id nunca muda de conteudo, entao o cache pode ser
/// eterno — trocar a imagem gera um id novo e uma URL nova.
async function servir(req, res) {
  const id = String(req.params.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(404).end();

  const arquivo = await getPrisma().mediaFile.findUnique({ where: { id } });
  if (!arquivo) return res.status(404).end();

  const etag = `"${arquivo.id}"`;
  res.set({
    'Content-Type': arquivo.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
  });
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res.send(Buffer.from(arquivo.data));
}

module.exports = { salvar, servir, processar, ErroMidia, PERFIS, ENTRADA_MAXIMA };
