// Provisiona um candidato completo: tenant + usuario de acesso + senha.
// O candidato nao cria nada; recebe tudo pronto.
//
// Uso:
//   npm run candidato:novo -- --nome "Dra. Maria" --numero 12345 \
//     --partido "PSDB" --cidade "Recife" --estado PE
//
// Opcionais: --slug --email --slogan --cor --cor2 --bio
require('dotenv').config();

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { getPrisma } = require('../prisma-client');

function lerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const chave = argv[i].slice(2);
    const valor = argv[i + 1];
    if (valor === undefined || valor.startsWith('--')) {
      args[chave] = true;
    } else {
      args[chave] = valor;
      i += 1;
    }
  }
  return args;
}

/// "Dra. Maria Souza" -> "dra-maria-souza"
function gerarSlug(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/// Senha inicial legivel: sem caracteres ambiguos, para ser ditada por telefone.
function gerarSenha() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

// Slugs que colidiriam com rotas da aplicacao.
const RESERVADOS = new Set([
  'api', 'admin', 'painel', 'master', 'login', 'health', 'db-check',
  'assets', 'static', 'public', 'app', 'www',
]);

async function main() {
  const args = lerArgs(process.argv.slice(2));

  if (!args.nome) {
    console.error('Faltou --nome.\n');
    console.error('Exemplo:');
    console.error('  npm run candidato:novo -- --nome "Dra. Maria" --numero 12345 \\');
    console.error('    --partido "PSDB" --cidade "Recife" --estado PE');
    process.exit(1);
  }

  const slug = gerarSlug(args.slug || args.nome);
  if (!slug) {
    console.error('Nao foi possivel gerar um slug a partir do nome. Use --slug.');
    process.exit(1);
  }
  if (RESERVADOS.has(slug)) {
    console.error(`O slug "${slug}" e reservado pela aplicacao. Use --slug para escolher outro.`);
    process.exit(1);
  }

  const email = (args.email || `${slug}@candidato.bio`).toLowerCase();
  const senha = gerarSenha();
  const prisma = getPrisma();

  const jaExiste = await prisma.tenant.findUnique({ where: { slug } });
  if (jaExiste) {
    console.error(`Ja existe candidato com o slug "${slug}".`);
    console.error('Use --slug para escolher outro endereco.');
    process.exit(1);
  }

  const emailEmUso = await prisma.user.findUnique({ where: { email } });
  if (emailEmUso) {
    console.error(`O email "${email}" ja esta em uso. Use --email para informar outro.`);
    process.exit(1);
  }

  // Fora da transacao: bcrypt com 12 rounds leva centenas de milissegundos e
  // nao deve manter uma transacao aberta esperando CPU.
  const passwordHash = await bcrypt.hash(senha, 12);

  // Tenant, usuario e vinculo nascem juntos ou nao nascem: um candidato sem
  // login e um WebApp que ninguem administra.
  const resultado = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug,
        name: args.nome,
        number: args.numero || null,
        party: args.partido || null,
        city: args.cidade || null,
        state: args.estado ? String(args.estado).toUpperCase().slice(0, 2) : null,
        slogan: args.slogan || null,
        bio: args.bio || null,
        ...(args.cor ? { primaryColor: args.cor } : {}),
        ...(args.cor2 ? { secondaryColor: args.cor2 } : {}),
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: args.nome,
        role: 'CANDIDATE',
        passwordHash,
        // Esta senha vai trafegar por WhatsApp ou telefone, entao vale para
        // um acesso: o painel exige a troca antes de liberar qualquer tela.
        mustChangePassword: true,
      },
    });

    await tx.tenantUser.create({
      data: { tenantId: tenant.id, userId: user.id, role: 'CANDIDATE' },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'CREATE',
        entity: 'Tenant',
        entityId: tenant.id,
        after: { slug, name: args.nome, email },
      },
    });

    return { tenant, user };
  });

  const dominio = process.env.APP_DOMAIN || 'candidato.bio';

  console.log('\nCandidato criado.\n');
  console.log(`  Nome      ${resultado.tenant.name}`);
  console.log(`  WebApp    http://${dominio}/${slug}`);
  console.log(`  Login     ${email}`);
  console.log(`  Senha     ${senha}  (temporaria)`);
  console.log('\nAnote a senha agora: ela e gravada com hash e nao pode ser lida depois.');
  console.log('No primeiro acesso o painel exige a troca antes de liberar qualquer tela.\n');
}

main()
  .catch((err) => {
    console.error(`\nFalhou: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
