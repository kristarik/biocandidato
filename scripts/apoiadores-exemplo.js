// Gera apoiadores ficticios para avaliar o dashboard com dados de verdade.
//
//   npm run candidato:apoiadores -- dra-maria 180
//   npm run candidato:apoiadores -- dra-maria --limpar
//
// Todos recebem origin com sufixo "-demo", que e como o --limpar os encontra
// depois sem tocar em apoiador real.
require('dotenv').config();

const { getPrisma } = require('../prisma-client');

const MARCA = '-demo';
const ORIGENS = ['instagram', 'whatsapp', 'organico', 'qrcode', 'facebook', 'tiktok'];
const PESO_ORIGEM = [30, 24, 18, 14, 9, 5];
const CIDADES = [
  ['Recife', 'PE', '50000-000'],
  ['Olinda', 'PE', '53000-000'],
  ['Jaboatão dos Guararapes', 'PE', '54000-000'],
  ['Paulista', 'PE', '53400-000'],
  ['Camaragibe', 'PE', '54750-000'],
];
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabriela', 'Heitor',
  'Isabel', 'João', 'Karina', 'Lucas', 'Marina', 'Nelson', 'Olivia', 'Paulo', 'Renata', 'Sergio'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Alves', 'Ferreira'];

function sorteioPonderado(itens, pesos, aleatorio) {
  const soma = pesos.reduce((a, b) => a + b, 0);
  let ponto = aleatorio() * soma;
  for (let i = 0; i < itens.length; i += 1) {
    ponto -= pesos[i];
    if (ponto <= 0) return itens[i];
  }
  return itens[itens.length - 1];
}

/// Gerador com semente: rodar de novo produz a mesma distribuicao, entao o
/// que eu vejo na tela e o que outra pessoa ve.
function geradorSemente(semente) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

async function main() {
  const slug = process.argv[2];
  const limpar = process.argv.includes('--limpar');
  const quantidade = Number(process.argv[3]) || 180;

  if (!slug) {
    console.error('Informe o slug. Ex: npm run candidato:apoiadores -- dra-maria 180');
    process.exit(1);
  }

  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Candidato "${slug}" nao encontrado.`);
    process.exit(1);
  }

  // SQL puro no LIKE: o `endsWith` do Prisma envia o parametro com colacao
  // binaria e o MariaDB recusa comparar com a coluna utf8mb4_unicode_ci.
  const apagarDemo = () => prisma.$executeRaw`
    DELETE FROM supporters WHERE tenant_id = ${tenant.id} AND origin LIKE ${`%${MARCA}`}`;

  if (limpar) {
    const count = await apagarDemo();
    console.log(`${count} apoiador(es) de demonstracao removido(s).`);
    return;
  }

  const rnd = geradorSemente(20260802);
  const agora = Date.now();
  const registros = [];

  for (let i = 0; i < quantidade; i += 1) {
    // Volume cresce ao se aproximar de hoje, com um pico no meio do periodo:
    // uma linha plana nao mostraria se o grafico sabe desenhar variacao.
    const diasAtras = Math.floor(Math.pow(rnd(), 1.7) * 30);
    const criadoEm = new Date(agora - diasAtras * 86_400_000 - Math.floor(rnd() * 86_400_000));

    const sorteio = rnd();
    const status = sorteio < 0.62 ? 'COMPLETO' : sorteio < 0.84 ? 'CONFIRMADO' : 'PENDENTE';
    const completo = status === 'COMPLETO';
    const [cidade, uf, cep] = CIDADES[Math.floor(rnd() * CIDADES.length)];

    registros.push({
      tenantId: tenant.id,
      status,
      name: completo
        ? `${NOMES[Math.floor(rnd() * NOMES.length)]} ${SOBRENOMES[Math.floor(rnd() * SOBRENOMES.length)]}`
        : null,
      // Faixa 559xxxxxxxx reservada para os ficticios, sem colidir com real.
      phone: `5581${String(900000000 + i).slice(0, 9)}`,
      cep: completo ? cep : null,
      city: completo ? cidade : null,
      state: completo ? uf : null,
      origin: sorteioPonderado(ORIGENS, PESO_ORIGEM, rnd) + MARCA,
      smsValidated: status !== 'PENDENTE',
      smsValidatedAt: status !== 'PENDENTE' ? criadoEm : null,
      pushActive: completo && rnd() < 0.55,
      createdAt: criadoEm,
      updatedAt: criadoEm,
    });
  }

  await apagarDemo();
  await prisma.supporter.createMany({ data: registros, skipDuplicates: true });

  console.log(`${registros.length} apoiadores de demonstracao criados em "${slug}".`);
  console.log('Para remover: npm run candidato:apoiadores -- ' + slug + ' --limpar');
}

main()
  .catch((err) => {
    console.error(`Falhou: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
