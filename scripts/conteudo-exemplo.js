// Popula um candidato com conteudo ficticio para avaliar o layout do WebApp.
// Uso: npm run candidato:exemplo -- dra-maria
require('dotenv').config();

const { getPrisma } = require('../prisma-client');

const PROPOSTAS = [
  {
    title: 'Saúde de qualidade',
    description: 'UBS abertas até 22h em todos os bairros.',
    content:
      'Nossa proposta é ampliar o horário de atendimento das Unidades Básicas ' +
      'de Saúde até as 22h, com equipes completas de plantão.\n\n' +
      'Hoje quem trabalha o dia inteiro não consegue se consultar sem faltar ao ' +
      'serviço. Vamos mudar isso contratando profissionais por concurso público ' +
      'e reorganizando as escalas.',
  },
  {
    title: 'Educação em tempo integral',
    description: 'Escolas com contraturno e reforço escolar.',
    content:
      'Implantar o contraturno em todas as escolas municipais, com reforço em ' +
      'português e matemática, atividades esportivas e culturais.\n\n' +
      'Criança na escola o dia inteiro é criança longe do risco e mãe livre ' +
      'para trabalhar.',
  },
  {
    title: 'Mobilidade urbana',
    description: 'Mais linhas e tarifa social ampliada.',
    content:
      'Revisar os itinerários das linhas de ônibus com base em dados reais de ' +
      'deslocamento e ampliar a tarifa social para estudantes e desempregados.',
  },
  {
    title: 'Segurança com prevenção',
    description: 'Iluminação e câmeras nas áreas críticas.',
    content:
      'Programa de iluminação em LED nas ruas com maior índice de ocorrências e ' +
      'instalação de câmeras integradas ao centro de monitoramento.',
  },
];

const REDES = [
  { platform: 'whatsapp', url: 'https://wa.me/5581999999999', position: 1 },
  { platform: 'instagram', url: 'https://instagram.com/exemplo', position: 2 },
  { platform: 'tiktok', url: 'https://tiktok.com/@exemplo', position: 3 },
  { platform: 'youtube', url: 'https://youtube.com/@exemplo', position: 4 },
  { platform: 'facebook', url: 'https://facebook.com/exemplo', position: 5 },
];

const LINKS = [
  { label: 'Agenda da campanha', url: 'https://exemplo.com/agenda', position: 1 },
  { label: 'Programa de governo completo', url: 'https://exemplo.com/programa', position: 2 },
  { label: 'Seja voluntário', url: 'https://exemplo.com/voluntario', position: 3 },
  { label: 'Prestação de contas', url: 'https://exemplo.com/contas', position: 4 },
];

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Informe o slug. Ex: npm run candidato:exemplo -- dra-maria');
    process.exit(1);
  }

  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Candidato "${slug}" nao encontrado.`);
    process.exit(1);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      bio:
        'Médica de familia ha 18 anos, nascida e criada no Recife. Acredito que ' +
        'saude e educacao nao sao favor, sao direito. Minha candidatura nasce da ' +
        'escuta de quem vive a cidade todo dia.',
      primaryColor: tenant.primaryColor,
    },
  });

  // Idempotente: rodar de novo nao duplica o conteudo de exemplo.
  await prisma.$transaction([
    prisma.proposal.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.socialLink.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.importantLink.deleteMany({ where: { tenantId: tenant.id } }),
  ]);

  await prisma.proposal.createMany({
    data: PROPOSTAS.map((p, i) => ({ ...p, tenantId: tenant.id, position: i + 1 })),
  });
  await prisma.socialLink.createMany({
    data: REDES.map((r) => ({ ...r, tenantId: tenant.id })),
  });
  await prisma.importantLink.createMany({
    data: LINKS.map((l) => ({ ...l, tenantId: tenant.id })),
  });

  console.log(
    `Conteudo de exemplo aplicado em "${slug}": ` +
      `${PROPOSTAS.length} propostas, ${REDES.length} redes, ${LINKS.length} links.`
  );
}

main()
  .catch((err) => {
    console.error(`Falhou: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
