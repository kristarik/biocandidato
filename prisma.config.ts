import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    // A hospedagem compartilhada nao permite CREATE DATABASE, entao nao ha
    // shadow database e `prisma migrate dev` nao funciona aqui.
    // As migrations sao geradas com `npm run db:migrate:new` (migrate diff,
    // que nao precisa de shadow) e aplicadas com `npm run db:deploy`.
  },
});
