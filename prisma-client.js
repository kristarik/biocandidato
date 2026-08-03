const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { hostEmUso } = require('./db');

// A configuracao vem das variaveis DB_* e nao da DATABASE_URL porque
// hostEmUso() converte "localhost" para 127.0.0.1 — no servidor da Hostinger
// localhost resolve para ::1 e o grant do usuario MySQL nao cobre esse
// endereco. A DATABASE_URL continua existindo para o CLI de migrations.
const adapter = new PrismaMariaDb({
  host: hostEmUso(),
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  // As tabelas usam utf8mb4_unicode_ci. Sem fixar isso, o driver envia os
  // parametros como utf8mb4_bin e o MariaDB recusa qualquer LIKE com
  // "Illegal mix of collations" — o que derrubaria as buscas do CRM.
  collation: 'UTF8MB4_UNICODE_CI',
});

let prisma;

function getPrisma() {
  if (!prisma) prisma = new PrismaClient({ adapter });
  return prisma;
}

module.exports = { getPrisma };
