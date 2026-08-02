# Voto.IO — CRM Eleitoral

Plataforma SaaS multi-tenant onde cada candidato tem um WebApp para captar
apoiadores e comunicar sua base via Push, SMS e RCS.

Arquitetura completa: [CRM_Eleitoral_VotoIO_Arquitetura_MVP.md](CRM_Eleitoral_VotoIO_Arquitetura_MVP.md)

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com os dados do hPanel
npm run db:check       # testa a conexao com o MySQL
npm run dev
```

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
