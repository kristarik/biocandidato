# Candidato Online — CRM Eleitoral

Plataforma SaaS multi-tenant onde cada candidato tem um WebApp para captar
apoiadores e comunicar sua base via Push, SMS e RCS.

Arquitetura completa: [CRM_Eleitoral_CandidatoOnline_Arquitetura_MVP.md](CRM_Eleitoral_CandidatoOnline_Arquitetura_MVP.md)

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com os dados do hPanel
npm run db:check       # testa a conexao com o MySQL
npm run dev
```

## Criando um candidato

```bash
npm run candidato:novo -- --nome "Dra. Maria" --numero 12345 \
  --partido "PSDB" --cidade "Recife" --estado PE

npm run candidato:exemplo -- dra-maria   # conteudo ficticio para ver o layout
```

O comando cria tenant, usuario e senha inicial numa unica transacao e imprime
as credenciais. A senha e aleatoria por candidato — senha padrao previsivel em
sistema multi-tenant significa que quem descobre o padrao entra em todas as
contas. Ela so aparece uma vez: depois vira hash e nao pode ser lida.

## Cadastro do apoiador

Tres etapas, para pedir o minimo na entrada:

1. `POST /:slug/apoiar/iniciar` — WhatsApp, dispara o codigo por SMS
2. `POST /:slug/apoiar/confirmar` — codigo de 6 digitos
3. `POST /:slug/apoiar/completar` — nome e CEP

O consentimento LGPD e gravado na etapa 2, nao na 1: e a confirmacao do codigo
que prova que quem autorizou controla o numero informado.

**Nenhum gateway de SMS esta integrado.** O codigo vai para o log do servidor.
Em desenvolvimento, `SMS_MODO=console` no `.env` faz a API devolver o codigo na
resposta — nunca use isso em producao.

## Banco de dados (Prisma + MariaDB)

O schema fica em [prisma/schema.prisma](prisma/schema.prisma). A URL de conexao
fica em [prisma.config.ts](prisma.config.ts), lida do `.env` (exigencia do
Prisma 7 — nao vai mais no schema).

```bash
npm run db:check                     # testa conexao e lista tabelas
npm run db:status                    # migrations pendentes
npm run db:migrate -- nome_da_mudanca  # gera nova migration
npm run db:deploy                    # aplica migrations
npm run db:studio                    # navegador visual do banco
```

### Por que nao usamos `prisma migrate dev`

Ele exige um *shadow database*, e o usuario da hospedagem compartilhada nao tem
permissao de `CREATE DATABASE` — so privilegio dentro do proprio banco. Por isso
`npm run db:migrate` usa `prisma migrate diff --from-config-datasource`, que
compara o banco real com o schema e nao precisa de shadow.

Consequencia pratica: **revise sempre o SQL gerado antes de aplicar.** Sem
shadow database o Prisma nao valida a migration antes de rodar.

### Isolamento multi-tenant

MariaDB nao tem Row Level Security. Todo o isolamento por `tenant_id` e
responsabilidade da aplicacao — uma consulta sem `where.tenantId` vaza dados
entre candidatos. Use sempre a camada de acesso com o tenant ja aplicado.

## Deploy na Hostinger

hPanel > **Implante web app** > conectar este repositorio do GitHub.

A Hostinger roda `npm install` e depois `npm start`. O que ela precisa
encontrar no repositorio:

| Item | Onde |
|---|---|
| `package.json` com script `start` | raiz |
| Versao do Node (`engines`) | `package.json` |
| App escutando em `process.env.PORT` e `0.0.0.0` | `server.js` |

As variaveis de ambiente (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
`DEBUG_TOKEN`) sao configuradas no painel da Hostinger — o `.env` fica fora
do Git.

### Acesso remoto ao MySQL

Para conectar ao banco de fora da hospedagem (maquina local, por exemplo),
libere o IP em hPanel > **Bancos de Dados** > **MySQL Remoto**. Nao use
"Qualquer host" (`%`).

## Rotas

| Rota | Descricao |
|---|---|
| `GET /` | status da aplicacao |
| `GET /health` | healthcheck |
| `GET /db-check?token=...` | diagnostico do banco; exige `DEBUG_TOKEN` |
