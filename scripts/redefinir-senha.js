// Gera uma nova senha para o acesso de um candidato.
// Uso: npm run candidato:senha -- dra-maria
require('dotenv').config();

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { getPrisma } = require('../prisma-client');

function gerarSenha() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(14), (b) => alfabeto[b % alfabeto.length]).join('');
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Informe o slug. Ex: npm run candidato:senha -- dra-maria');
    process.exit(1);
  }

  const prisma = getPrisma();
  const vinculo = await prisma.tenantUser.findFirst({
    where: { tenant: { slug } },
    include: { user: true, tenant: true },
  });

  if (!vinculo) {
    console.error(`Nenhum acesso encontrado para "${slug}".`);
    process.exit(1);
  }

  const senha = gerarSenha();
  await prisma.user.update({
    where: { id: vinculo.userId },
    data: { passwordHash: await bcrypt.hash(senha, 12) },
  });

  console.log(`\nSenha redefinida para ${vinculo.tenant.name}.\n`);
  console.log(`  Painel   /painel/entrar`);
  console.log(`  Login    ${vinculo.user.email}`);
  console.log(`  Senha    ${senha}\n`);
}

main()
  .catch((err) => {
    console.error(`Falhou: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
