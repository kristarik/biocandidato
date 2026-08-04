const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPrisma } = require('./prisma-client');

const COOKIE = 'sessao';
const DURACAO_HORAS = 12;

/// Tentativas de login por email, em memoria. Suficiente para uma instancia;
/// com varios processos isso precisa ir para o Redis previsto no documento.
const tentativas = new Map();
const MAX_TENTATIVAS = 8;
const JANELA_MS = 15 * 60_000;

function segredo() {
  const valor = process.env.JWT_SECRET;
  // Falhar aqui e melhor que assinar sessao com segredo previsivel: sem isso,
  // qualquer pessoa forjaria um cookie e entraria como qualquer candidato.
  if (!valor || valor.length < 32) {
    throw new Error('JWT_SECRET ausente ou curto demais (minimo 32 caracteres).');
  }
  return valor;
}

function registrarTentativa(email) {
  const agora = Date.now();
  const registro = tentativas.get(email);
  if (!registro || agora - registro.desde > JANELA_MS) {
    tentativas.set(email, { contagem: 1, desde: agora });
    return;
  }
  registro.contagem += 1;
}

function bloqueado(email) {
  const registro = tentativas.get(email);
  if (!registro) return false;
  if (Date.now() - registro.desde > JANELA_MS) {
    tentativas.delete(email);
    return false;
  }
  return registro.contagem >= MAX_TENTATIVAS;
}

/// Autentica e devolve o vinculo com o tenant. Erros nunca distinguem usuario
/// inexistente de senha errada: a diferenca revelaria quais contas existem.
async function autenticar(usuario, senha) {
  const chave = String(usuario || '').trim().toLowerCase();
  if (bloqueado(chave)) {
    return { erro: 'Muitas tentativas. Aguarde alguns minutos.' };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { username: chave },
    include: { tenants: { include: { tenant: true } } },
  });

  const hash = user?.passwordHash;
  // Compara mesmo sem usuario, contra um hash descartavel, para o tempo de
  // resposta nao denunciar se o email existe.
  const confere = await bcrypt.compare(
    String(senha || ''),
    hash || '$2b$12$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalido'
  );

  if (!user || !user.active || !confere) {
    registrarTentativa(chave);
    return { erro: 'E-mail ou senha incorretos.' };
  }

  // O Master administra a plataforma e nao pertence a candidato nenhum, entao
  // a falta de vinculo so e erro para quem nao e Master.
  const vinculo = user.tenants[0];
  if (!vinculo && user.role !== 'MASTER') {
    return { erro: 'Sua conta ainda nao esta ligada a nenhum candidato.' };
  }

  tentativas.delete(chave);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user, tenant: vinculo?.tenant || null };
}

function criarCookie(res, { user, tenant }) {
  const token = jwt.sign(
    { sub: user.id, tid: tenant?.id || null, nome: user.name, papel: user.role },
    segredo(),
    { expiresIn: `${DURACAO_HORAS}h` }
  );

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_HORAS * 3600_000,
    // Raiz, e nao /painel: o Master vive em /master e precisa do mesmo cookie.
    path: '/',
  });
}

function limparCookie(res) {
  res.clearCookie(COOKIE, { path: '/' });
  // O cookie antigo foi gravado em /painel; sem limpar os dois, uma sessao
  // criada antes desta mudanca sobreviveria ao logout.
  res.clearCookie(COOKIE, { path: '/painel' });
}

/// Exige sessao valida e carrega o tenant. Toda rota do painel passa por aqui,
/// e o tenant vem do token — nunca da URL ou do formulario. Sem Row Level
/// Security no MariaDB, este e o unico ponto que impede um candidato de ler
/// dados de outro.
async function exigirSessao(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.redirect('/painel/entrar');

  try {
    const dados = jwt.verify(token, segredo());
    const prisma = getPrisma();
    // O usuario e lido a cada requisicao, e nao tirado do token: uma conta
    // desativada ou uma senha recem-trocada precisam valer na hora, sem
    // esperar a sessao expirar.
    const [tenant, user] = await Promise.all([
      dados.tid ? prisma.tenant.findUnique({ where: { id: dados.tid } }) : null,
      prisma.user.findUnique({ where: { id: dados.sub } }),
    ]);
    if (!user || !user.active) {
      limparCookie(res);
      return res.redirect('/painel/entrar');
    }
    // Sessao de candidato exige tenant ativo; a de Master nao tem tenant.
    if (dados.tid && (!tenant || !tenant.active)) {
      limparCookie(res);
      return res.redirect('/painel/entrar');
    }
    req.sessao = {
      userId: user.id,
      nome: user.name,
      papel: user.role,
      precisaTrocarSenha: user.mustChangePassword,
    };
    req.tenant = tenant;
    next();
  } catch {
    limparCookie(res);
    res.redirect('/painel/entrar');
  }
}

const MINIMO_SENHA = 8;

/// Recusa senhas que qualquer lista de ataque tenta primeiro. Nao substitui
/// tamanho minimo, mas evita o caso comum de trocar a senha entregue por
/// "12345678" e achar que resolveu.
const SENHAS_OBVIAS = new Set([
  '12345678', '123456789', '1234567890', 'senha123', 'password', 'candidato',
  'qwertyui', 'abc12345', '11111111', 'candidatoonline',
]);

/// Troca a senha exigindo a atual. Mesmo na troca obrigatoria a atual e
/// pedida: sem isso, uma sessao esquecida aberta num aparelho emprestado
/// deixaria qualquer um assumir a conta.
async function trocarSenha({ userId, atual, nova, confirmacao, ip }) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { erro: 'Sessão inválida. Entre novamente.' };

  if (!(await bcrypt.compare(String(atual || ''), user.passwordHash))) {
    return { erro: 'A senha atual está incorreta.' };
  }

  const senha = String(nova || '');
  if (senha.length < MINIMO_SENHA) {
    return { erro: `A nova senha precisa ter pelo menos ${MINIMO_SENHA} caracteres.` };
  }
  if (senha !== String(confirmacao || '')) {
    return { erro: 'A confirmação não bate com a nova senha.' };
  }
  if (SENHAS_OBVIAS.has(senha.toLowerCase())) {
    return { erro: 'Essa senha é fácil demais de adivinhar. Escolha outra.' };
  }
  if (await bcrypt.compare(senha, user.passwordHash)) {
    return { erro: 'A nova senha precisa ser diferente da atual.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(senha, 12),
      mustChangePassword: false,
      passwordSetAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'UPDATE', entity: 'User.password', entityId: user.id, ip },
  });

  return { ok: true };
}

/// So o Master entra na administracao da plataforma. Vem depois de
/// exigirSessao, que ja garantiu que a conta existe e esta ativa.
function exigirMaster(req, res, next) {
  if (req.sessao?.papel !== 'MASTER') return res.redirect('/painel/entrar');
  next();
}

module.exports = {
  autenticar, criarCookie, limparCookie, exigirSessao, exigirMaster,
  trocarSenha, COOKIE, MINIMO_SENHA,
};
