# CRM ELEITORAL — Arquitetura (MVP v1)

## Nome
**Candidato Online**

## Objetivo
Criar uma plataforma SaaS onde cada candidato possua um WebApp personalizado para captar apoiadores, gerenciar relacionamento e comunicar sua base através de Push Notification, SMS, RCS e futuramente WhatsApp.

O candidato **não cria** seu próprio site. O administrador (Master) cria toda a estrutura e o candidato utiliza apenas o CRM.

---

# Arquitetura Geral

Internet
    │
    ▼
voto.io/joaosilva
voto.io/maria
voto.io/pedro
    │
    ▼
Frontend Público
    │
    ▼
API Node.js
    │
    ▼
PostgreSQL
    │
    ├── Painel Master
    └── Painel do Candidato

---

# Tipos de Usuário

## Master
- Criar candidatos
- Editar WebApps
- Gerenciar identidade visual
- Configurar integrações
- Visualizar todos os candidatos
- Dashboard global
- Configurar gateways (SMS, Push, etc.)

## Candidato
- Agenda
- Propostas
- Notícias
- CRM de apoiadores
- Estatísticas
- Disparos autorizados
- Equipe

## Apoiador
Sem login.
- Visualiza o WebApp
- Realiza cadastro
- Confirma SMS
- Autoriza Push

---

# Multi-tenant

Banco único.

Toda tabela deve possuir obrigatoriamente:

```text
tenant_id
```

Nenhuma consulta poderá ser executada sem filtrar pelo tenant.

---

# Estrutura do WebApp

- Foto
- Logo
- Nome
- Número
- Partido
- Cidade
- Estado
- Biografia
- Slogan
- Cor principal
- Cor secundária

## Menu

- Início
- Quem Sou
- Propostas
- Agenda
- Notícias
- Fotos
- Vídeos
- Contato
- Quero Apoiar

CTA principal:

> **QUERO APOIAR**

---

# Fluxo do Cadastro

1. Acessa o WebApp
2. Clica em "Quero apoiar"
3. Nome
4. Telefone
5. CEP
6. Recebe código SMS
7. Confirma código
8. Autoriza Push
9. Cadastro concluído

---

# Dados do Apoiador

- Nome
- Telefone
- CEP
- Cidade
- Estado
- Data de cadastro
- Origem
- IP
- Push ativo
- SMS validado
- Último acesso
- Tags
- Observações

Guardar também:

- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term

---

# Dashboard do Candidato

- Total de apoiadores
- Cadastros hoje
- Semana
- Mês
- Push ativos
- SMS confirmados
- Agenda
- Últimos cadastros

---

# CRM

Filtros por:

- Cidade
- CEP
- Data
- Origem
- Tags
- Push ativo
- SMS confirmado

---

# Comunicação

Único módulo para:

- Push
- SMS
- RCS
- WhatsApp (futuro)
- Email (futuro)

Fluxo:

Campanha → Segmentação → Prévia → Agendamento → Disparo → Relatórios

---

# Tags

Exemplos:

- Empresário
- Médico
- Pastor
- Jovem
- Comerciante
- Líder Comunitário
- Zona Norte
- Zona Sul

---

# Banco de Dados

- users
- tenants
- tenant_users
- supporters
- campaigns
- notifications
- sms_logs
- push_tokens
- events
- news
- photos
- videos
- proposals
- integrations
- settings
- audit_logs
- utm_logs

---

# Stack

Backend
- Node.js
- NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- JWT

Frontend
- Next.js
- React
- TailwindCSS
- PWA

Infra
- Firebase Cloud Messaging
- Cloudflare R2
- Hostinger VPS

---

# Roadmap

## V1
- Painel Master
- Cadastro de candidatos
- WebApp
- CRM
- SMS
- Push

## V2
- Agenda
- Notícias
- Galeria
- Equipe

## V3
- WhatsApp
- RCS
- Segmentação avançada

## V4
- IA
- Sugestões de campanha
- Score de apoiadores
- Analytics avançado

---

# Módulo Futuro — Central de Comunidades

- Cadastro de grupos do WhatsApp
- Comunidades
- Links
- QR Codes
- Administradores
- Categoria
- Associação por candidato
- Histórico de divulgação

**Observação:** a API oficial do WhatsApp não permite gerenciamento completo de grupos. Este módulo deve atuar como um organizador e distribuidor de comunidades.

---

# Visão Estratégica

O CRM Eleitoral deve nascer como o primeiro produto de uma plataforma maior.

Produtos futuros:

- CRM Eleitoral
- CRM para Igrejas
- CRM para Associações
- CRM para Influenciadores
- CRM para Empresas
- CRM para Franquias

Todos compartilhando o mesmo núcleo tecnológico.
