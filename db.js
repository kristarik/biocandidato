const mysql = require('mysql2/promise');

let pool;

// Loopback IPv4 explicito. Sem isso o mysql2 assume "localhost", que no
// servidor da Hostinger resolve para ::1 (loopback IPv6) e o grant do usuario
// MySQL nao cobre esse endereco - da ER_ACCESS_DENIED_ERROR enganoso.
const HOST_PADRAO = '127.0.0.1';

function hostEmUso() {
  const host = process.env.DB_HOST || HOST_PADRAO;
  return host === 'localhost' ? HOST_PADRAO : host;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: hostEmUso(),
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

/// Quais variaveis chegaram ao processo. Nao expoe valores secretos - so diz
/// se estao definidas, para diagnosticar env var faltando em producao.
function diagnostico() {
  const definida = (k) => Boolean(process.env[k]);
  return {
    hostConfigurado: process.env.DB_HOST || '(nao definido)',
    hostEmUso: hostEmUso(),
    DB_PORT: process.env.DB_PORT || '(nao definido)',
    DB_USER: definida('DB_USER'),
    DB_PASSWORD: definida('DB_PASSWORD'),
    DB_NAME: process.env.DB_NAME || '(nao definido)',
    DATABASE_URL: definida('DATABASE_URL'),
  };
}

module.exports = { getPool, inspect, diagnostico };
