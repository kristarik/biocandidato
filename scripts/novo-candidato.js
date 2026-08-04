// Provisiona um candidato completo: tenant + usuario de acesso + senha.
// A regra vive em provisionar.js, compartilhada com o painel Master — duas
// versoes da mesma regra divergem na primeira mudanca.
//
// Uso:
//   npm run candidato:novo -- --nome "Dra. Maria" --numero 12345 \
//     --partido "PSDB" --cidade "Recife" --estado PE
//
// Opcionais: --slug --usuario --email --slogan --cor --cor2 --bio --creditos
require('dotenv').config();

const { getPrisma } = require('../prisma-client');
const { criarCandidato, ErroProvisionamento } = require('../provisionar');

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
    console.error('Faltou --nome.\n');
    console.error('Exemplo:');
    console.error('  npm run candidato:novo -- --nome "Dra. Maria" --numero 12345 \\');
    console.error('    --partido "PSDB" --cidade "Recife" --estado PE');
    process.exit(1);
  }

  const { tenant, user, senha } = await criarCandidato(args);
  const dominio = process.env.APP_DOMAIN || 'candidato.bio';

  console.log('\nCandidato criado.\n');
  console.log(`  Nome      ${tenant.name}`);
  console.log(`  WebApp    https://${dominio}/${tenant.slug}`);
  console.log(`  Usuario   ${user.username}`);
  console.log(`  Senha     ${senha}  (temporaria)`);
  console.log('\nAnote a senha agora: ela e gravada com hash e nao pode ser lida depois.');
  console.log('No primeiro acesso o painel exige a troca antes de liberar qualquer tela.\n');
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof ErroProvisionamento ? err.message : `Falhou: ${err.message}`}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
