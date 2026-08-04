// Envia um SMS de teste pelo provedor configurado.
// Uso: npm run sms:teste -- 81988887777
require('dotenv').config();

const { getPrisma } = require('../prisma-client');
const sms = require('../sms');
const { normalizarTelefone } = require('../cadastro');

async function main() {
  const diag = sms.diagnostico();
  console.log('\nProvedor');
  console.log(`  escolhido em SMS_PROVEDOR : ${diag.escolhido}`);
  console.log(`  provedor conhecido        : ${diag.conhecido ? 'sim' : 'NAO'}`);
  console.log(`  credenciais completas     : ${diag.configurado ? 'sim' : 'NAO'}`);
  console.log(`  vai enviar por            : ${diag.emUso}`);

  if (diag.emUso === 'console') {
    console.log('\nNenhum SMS real sera enviado. Preencha as credenciais no .env');
    console.log('e defina SMS_PROVEDOR=twilio para enviar de verdade.\n');
  }

  const destino = process.argv[2];
  if (!destino) {
    console.log('\nPara enviar, informe o numero: npm run sms:teste -- 81988887777\n');
    return;
  }

  const para = normalizarTelefone(destino);
  const tenant = await getPrisma().tenant.findFirst({ select: { id: true, name: true } });

  console.log(`\nEnviando para +${para} ...`);
  const r = await sms.enviar({
    tenantId: tenant?.id,
    para,
    texto: `${tenant?.name || 'Candidato Online'}: teste de envio. Se voce recebeu isso, o SMS esta funcionando.`,
    proposito: 'VERIFICATION',
  });

  if (r.ok) {
    console.log(`OK  id do provedor: ${r.id} | status: ${r.status}\n`);
  } else {
    console.log(`FALHOU: ${r.erro}`);
    console.log(`Erro ${r.permanente ? 'permanente — repetir nao resolve' : 'temporario — pode tentar de novo'}\n`);
  }
}

main()
  .catch((err) => {
    console.error(`\nFalhou: ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
