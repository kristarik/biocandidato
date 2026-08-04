// Cria um usuario Master, que administra a plataforma inteira.
// Uso: npm run master:novo -- --nome "Tarik" --usuario tarik
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { getPrisma } = require('../prisma-client');
const { gerarSenha, gerarSlug } = require('../provisionar');

function lerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const chave = argv[i].slice(2);
    const valor = argv[i + 1];
    if (valor === undefined || valor.startsWith('--')) args[chave] = true;
    else {
      args[chave] = valor;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = lerArgs(process.argv.slice(2));
  if (!args.nome) {
    console.error('Uso: npm run master:novo -- --nome "Seu Nome" --usuario seuusuario');
    process.exit(1);
  }

  const prisma = getPrisma();
  const username = String(args.usuario || gerarSlug(args.nome)).trim().toLowerCase();

  if (await prisma.user.findUnique({ where: { username } })) {
    console.error(`O usuario "${username}" ja esta em uso.`);
    process.exit(1);
  }

  const senha = gerarSenha();
  const user = await prisma.user.create({
    data: {
      username,
      email: args.email ? String(args.email).trim().toLowerCase() : null,
      name: String(args.nome).trim(),
      role: 'MASTER',
      passwordHash: await bcrypt.hash(senha, 12),
      mustChangePassword: true,
    },
  });

  console.log('\nMaster criado.\n');
  console.log('  Painel   /painel/entrar  (entra e cai no /master)');
  console.log(`  Usuario  ${user.username}`);
  console.log(`  Senha    ${senha}  (temporaria)\n`);
  console.log('No primeiro acesso o painel exige a troca da senha.\n');
}

main()
  .catch((err) => {
    console.error(`Falhou: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
