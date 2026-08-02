// Teste de conexao pela linha de comando: npm run db:check
require('dotenv').config();

const { getPool, inspect } = require('../db');

const faltando = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(
  (k) => !process.env[k]
);

if (faltando.length) {
  console.error('Variaveis ausentes no .env:', faltando.join(', '));
  process.exit(1);
}

(async () => {
  console.log(`Conectando em ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} ...`);
  try {
    const { version, database, tables } = await inspect();
    console.log(`OK - MySQL ${version} | banco: ${database}`);
    if (!tables.length) {
      console.log('Nenhuma tabela encontrada (banco vazio).');
    } else {
      console.log(`${tables.length} tabela(s):`);
      for (const t of tables) console.log(`  - ${t.name}`);
    }
  } catch (err) {
    console.error(`FALHOU [${err.code || 'ERRO'}] ${err.message}`);
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error('Provavel causa: IP nao liberado em hPanel > Bancos de Dados > MySQL Remoto.');
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Provavel causa: usuario ou senha incorretos no .env.');
    }
    process.exitCode = 1;
  } finally {
    await getPool().end();
  }
})();
