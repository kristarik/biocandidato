// Gera uma nova senha temporaria para o acesso de um candidato.
// A mesma acao existe na ficha do candidato no painel Master.
//
// Uso: npm run candidato:senha -- dra-maria
require('dotenv').config();

const { getPrisma } = require('../prisma-client');
const { redefinirSenha, ErroProvisionamento } = require('../provisionar');

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Informe o slug. Ex: npm run candidato:senha -- dra-maria');
    process.exit(1);
  }

  const tenant = await getPrisma().tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Candidato "${slug}" nao encontrado.`);
    process.exit(1);
  }

  const { senha, usuario } = await redefinirSenha(tenant.id);

  console.log(`\nSenha redefinida para ${tenant.name}.\n`);
  console.log('  Painel   /painel/entrar');
  console.log(`  Usuario  ${usuario}`);
  console.log(`  Senha    ${senha}  (temporaria)\n`);
  console.log('No proximo acesso o painel exige a troca antes de liberar o restante.\n');
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof ErroProvisionamento ? err.message : `Falhou: ${err.message}`}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
