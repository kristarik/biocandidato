// Gera uma nova migration comparando o banco real com o schema.prisma.
//
// Uso: npm run db:migrate -- nome_da_migration
//
// Por que nao `prisma migrate dev`: ele exige um shadow database, e a
// hospedagem compartilhada da Hostinger nao permite CREATE DATABASE. O
// `migrate diff --from-config-datasource` le o estado real do banco e nao
// precisa de shadow. Depois de gerar, revise o SQL e rode `npm run db:deploy`.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const nome = process.argv[2];
if (!nome || !/^[a-z0-9_]+$/.test(nome)) {
  console.error('Informe um nome em minusculas com underscore.');
  console.error('Exemplo: npm run db:migrate -- adiciona_campo_whatsapp');
  process.exit(1);
}

const agora = new Date();
const carimbo =
  agora.getUTCFullYear().toString() +
  String(agora.getUTCMonth() + 1).padStart(2, '0') +
  String(agora.getUTCDate()).padStart(2, '0') +
  String(agora.getUTCHours()).padStart(2, '0') +
  String(agora.getUTCMinutes()).padStart(2, '0') +
  String(agora.getUTCSeconds()).padStart(2, '0');

const dir = path.join('prisma', 'migrations', `${carimbo}_${nome}`);
const arquivo = path.join(dir, 'migration.sql');
fs.mkdirSync(dir, { recursive: true });

execFileSync(
  'npx',
  [
    'prisma', 'migrate', 'diff',
    '--from-config-datasource',
    '--to-schema', path.join('prisma', 'schema.prisma'),
    '--script',
    '--output', arquivo,
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);

const sql = fs.readFileSync(arquivo, 'utf8').trim();
if (!sql || sql.startsWith('-- This is an empty migration')) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('\nNenhuma diferenca entre o banco e o schema. Nada a fazer.');
  process.exit(0);
}

console.log(`\nMigration criada: ${arquivo}`);
console.log('Revise o SQL e aplique com: npm run db:deploy');
