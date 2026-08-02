const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 15000,
    });
  }
  return pool;
}

// Retorna versao do servidor e as tabelas existentes. Usado pelo /db-check
// e pelo script de linha de comando.
async function inspect() {
  const db = getPool();
  const [[version]] = await db.query('SELECT VERSION() AS version');
  const [tables] = await db.query(
    'SELECT table_name AS name, table_rows AS approx_rows ' +
      'FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [process.env.DB_NAME]
  );
  return { version: version.version, database: process.env.DB_NAME, tables };
}

module.exports = { getPool, inspect };
