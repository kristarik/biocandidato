const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { getPrisma } = require('./prisma-client');

class ErroProvisionamento extends Error {}

/// "Dra. Maria Souza" -> "dra-maria-souza"
function gerarSlug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/// Senha legivel: sem caracteres ambiguos, porque ela vai ser ditada por
/// telefone ou lida numa mensagem.
function gerarSenha() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(14), (b) => alfabeto[b % alfabeto.length]).join('');
}

// Slugs que colidiriam com rotas da aplicacao.
const RESERVADOS = new Set([
  'api', 'admin', 'painel', 'master', 'login', 'health', 'status', 'db-check',
  'assets', 'static', 'public', 'app', 'www', 'sair',
]);

const HEX = /^#[0-9a-fA-F]{6}$/;

/// Cria tenant, usuario e vinculo numa transacao so. Um candidato sem login
/// seria um WebApp que ninguem administra.
async function criarCandidato(dados, { createdById } = {}) {
  const prisma = getPrisma();

  const nome = String(dados.nome || '').trim();
  if (nome.length < 2) throw new ErroProvisionamento('Informe o nome do candidato.');

  const slug = gerarSlug(dados.slug || nome);
  if (!slug) throw new ErroProvisionamento('Não foi possível gerar o endereço a partir do nome.');
  if (RESERVADOS.has(slug)) throw new ErroProvisionamento(`O endereço "${slug}" é reservado pelo sistema.`);

  const email = String(dados.email || `${slug}@candidato.bio`).trim().toLowerCase();

  const [slugEmUso, emailEmUso] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ]);
  if (slugEmUso) throw new ErroProvisionamento(`Já existe candidato no endereço "${slug}".`);
  if (emailEmUso) throw new ErroProvisionamento(`O e-mail "${email}" já está em uso.`);

  const senha = gerarSenha();
  // Fora da transacao: bcrypt com 12 rounds leva centenas de milissegundos e
  // nao deve manter uma transacao aberta esperando CPU.
  const passwordHash = await bcrypt.hash(senha, 12);
  const creditos = Math.max(0, Math.trunc(Number(dados.creditos) || 0));

  const resultado = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug,
        name: nome,
        number: dados.numero || null,
        party: dados.partido || null,
        city: dados.cidade || null,
        state: dados.estado ? String(dados.estado).toUpperCase().slice(0, 2) : null,
        slogan: dados.slogan || null,
        bio: dados.bio || null,
        creditBalance: creditos,
        ...(HEX.test(dados.cor || '') ? { primaryColor: dados.cor } : {}),
        ...(HEX.test(dados.cor2 || '') ? { secondaryColor: dados.cor2 } : {}),
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: nome,
        role: 'CANDIDATE',
        passwordHash,
        // A senha vai trafegar por WhatsApp ou telefone: vale um acesso.
        mustChangePassword: true,
      },
    });

    await tx.tenantUser.create({
      data: { tenantId: tenant.id, userId: user.id, role: 'CANDIDATE' },
    });

    if (creditos > 0) {
      await tx.creditTransaction.create({
        data: {
          tenantId: tenant.id,
          type: 'BONUS',
          amount: creditos,
          balanceAfter: creditos,
          description: 'Créditos iniciais na criação do candidato',
          createdById: createdById || null,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: createdById || null,
        action: 'CREATE',
        entity: 'Tenant',
        entityId: tenant.id,
        after: { slug, name: nome, email, creditos },
      },
    });

    return { tenant, user };
  });

  return { ...resultado, senha };
}

/// Gera nova senha temporaria para o acesso de um candidato.
async function redefinirSenha(tenantId, { createdById } = {}) {
  const prisma = getPrisma();
  const vinculo = await prisma.tenantUser.findFirst({
    where: { tenantId },
    include: { user: true, tenant: true },
  });
  if (!vinculo) throw new ErroProvisionamento('Este candidato não tem usuário de acesso.');

  const senha = gerarSenha();
  await prisma.user.update({
    where: { id: vinculo.userId },
    data: { passwordHash: await bcrypt.hash(senha, 12), mustChangePassword: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: createdById || null,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: vinculo.userId,
    },
  });

  return { senha, email: vinculo.user.email, tenant: vinculo.tenant };
}

module.exports = { criarCandidato, redefinirSenha, gerarSlug, gerarSenha, ErroProvisionamento };
