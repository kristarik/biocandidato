// Aplica o conteudo de um candidato a partir da pasta candidatos/<slug>/.
//
// Uso: node scripts/montar-candidato.js diego-moreno
//
// Existe porque em quase todo caso e a equipe que entrega o site pronto: o
// candidato manda arte, foto e temas, e nao mexe no painel.
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { getPrisma } = require('../prisma-client');
const midia = require('../midia');

const EXTENSOES = /\.(jpe?g|png|webp|gif)$/i;

/// Acha a imagem pelo pedaco do nome, nao pelo nome exato: o arquivo chega do
/// cliente com o nome que ele salvou — "riodejaneiro-cidade.jpg" tambem e a
/// cidade.
function acharImagem(pasta, palavras) {
  if (!fs.existsSync(pasta)) return null;
  const alvos = [].concat(palavras);

  const candidatos = fs
    .readdirSync(pasta)
    .filter((n) => EXTENSOES.test(n))
    .map((n) => ({ nome: n, posto: alvos.findIndex((p) => n.toLowerCase().includes(p)) }))
    .filter((c) => c.posto >= 0)
    // A ordem das palavras manda: "capa" ganha de "banner" mesmo com nome
    // maior. Entre nomes da mesma palavra, o mais curto e o oficial, para
    // "banner-original" nao passar na frente de "banner".
    .sort((a, b) => a.posto - b.posto || a.nome.length - b.nome.length);

  return candidatos[0] ? path.join(pasta, candidatos[0].nome) : null;
}

/// Envia um arquivo da pasta do candidato e devolve a URL publica.
async function subirImagem(prisma, tenantId, arquivo, tipo) {
  if (!arquivo || !fs.existsSync(arquivo)) return null;
  const { url } = await midia.salvar({
    tenantId,
    tipo,
    buffer: fs.readFileSync(arquivo),
  });
  console.log(`  ${path.basename(arquivo)} -> ${url}`);
  return url;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Informe o slug. Ex: node scripts/montar-candidato.js diego-moreno');
    process.exit(1);
  }

  const pasta = path.join('candidatos', slug);
  const conteudo = path.join(pasta, 'conteudo.json');
  if (!fs.existsSync(conteudo)) {
    console.error(`Falta ${conteudo}. Crie o arquivo com bio, propostas, redes e links.`);
    process.exit(1);
  }

  const dados = JSON.parse(fs.readFileSync(conteudo, 'utf8'));
  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Candidato "${slug}" nao existe. Crie antes com npm run candidato:novo.`);
    process.exit(1);
  }

  console.log(`\nMontando ${tenant.name}...\n`);

  console.log('Imagens:');
  const foto = await subirImagem(prisma, tenant.id, acharImagem(pasta, 'foto'), 'foto');
  const banner = await subirImagem(prisma, tenant.id, acharImagem(pasta, ['capa', 'banner']), 'banner');
  const cidade = await subirImagem(prisma, tenant.id, acharImagem(pasta, 'cidade'), 'cidade');
  if (!foto && !banner && !cidade) console.log('  nenhuma imagem encontrada na pasta');

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(dados.numero ? { number: String(dados.numero) } : {}),
      ...(dados.slogan ? { slogan: dados.slogan } : {}),
      ...(dados.bio ? { bio: dados.bio } : {}),
      ...(dados.curriculo ? { curriculum: dados.curriculo } : {}),
      ...(foto ? { photoUrl: foto } : {}),
      ...(banner ? { bannerUrl: banner } : {}),
      ...(cidade ? { proposalsBgUrl: cidade } : {}),
      ...(dados.cor ? { primaryColor: dados.cor } : {}),
      ...(dados.cor2 ? { secondaryColor: dados.cor2 } : {}),
      ...(dados.corEscura ? { darkColor: dados.corEscura } : {}),
    },
  });

  // Substitui em vez de acrescentar: rodar de novo depois de ajustar o JSON
  // deixa o site igual ao arquivo, sem duplicar proposta.
  if (dados.propostas?.length) {
    await prisma.proposal.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.proposal.createMany({
      data: dados.propostas.map((p, i) => ({
        tenantId: tenant.id,
        title: p.titulo,
        description: p.resumo || null,
        content: p.texto || null,
        position: i + 1,
      })),
    });
    console.log(`\nPropostas: ${dados.propostas.length}`);
  }

  // Galeria do "Compartilhe": a pasta inteira vira artes, em ordem de nome.
  const pastaGaleria = path.join(pasta, 'galeria');
  if (fs.existsSync(pastaGaleria)) {
    const artes = fs.readdirSync(pastaGaleria).filter((n) => EXTENSOES.test(n)).sort();
    if (artes.length) {
      await prisma.photo.deleteMany({ where: { tenantId: tenant.id } });
      let posicao = 0;
      for (const nome of artes) {
        const { url } = await midia.salvar({
          tenantId: tenant.id,
          tipo: 'peca',
          buffer: fs.readFileSync(path.join(pastaGaleria, nome)),
        });
        posicao += 1;
        await prisma.photo.create({
          data: { tenantId: tenant.id, url, album: 'compartilhe', position: posicao },
        });
      }
      console.log(`Compartilhe: ${artes.length} artes`);
    }
  }

  if (dados.experiencias?.length) {
    await prisma.experience.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.experience.createMany({
      data: dados.experiencias.map((e, i) => ({
        tenantId: tenant.id,
        title: typeof e === 'string' ? e : e.titulo,
        detail: typeof e === 'string' ? null : e.detalhe || null,
        position: i + 1,
      })),
    });
    console.log(`Currículo: ${dados.experiencias.length} itens`);
  }

  if (dados.redes?.length) {
    await prisma.socialLink.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.socialLink.createMany({
      data: dados.redes.map((r, i) => ({
        tenantId: tenant.id,
        platform: r.rede,
        url: r.url,
        position: i + 1,
      })),
    });
    console.log(`Redes: ${dados.redes.map((r) => r.rede).join(', ')}`);
  }

  if (dados.links?.length) {
    await prisma.importantLink.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.importantLink.createMany({
      data: dados.links.map((l, i) => ({
        tenantId: tenant.id,
        label: l.rotulo,
        url: l.url,
        position: i + 1,
      })),
    });
    console.log(`Links: ${dados.links.length}`);
  }

  console.log(`\nPronto: https://${process.env.APP_DOMAIN || 'candidato.bio'}/${slug}\n`);
}

main()
  .catch((err) => {
    console.error(`\nFalhou: ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
