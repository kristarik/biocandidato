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

/// Autentica e devolve o vinculo com o tenant. Erros nunca distinguem email
/// inexistente de senha errada: a diferenca revelaria quais contas existem.
async function autenticar(email, senha) {
  const chave = String(email || '').trim().toLowerCase();
  if (bloqueado(chave)) {
    return { erro: 'Muitas tentativas. Aguarde alguns minutos.' };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: chave },
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

  const vinculo = user.tenants[0];
  if (!vinculo) {
    return { erro: 'Sua conta ainda nao esta ligada a nenhum candidato.' };
  }

  tentativas.delete(chave);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user, tenant: vinculo.tenant };
}

function criarCookie(res, { user, tenant }) {
  const token = jwt.sign(
    { sub: user.id, tid: tenant.id, nome: user.name, papel: user.role },
    segredo(),
    { expiresIn: `${DURACAO_HORAS}h` }
  );

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_HORAS * 3600_000,
    path: '/painel',
  });
}

function limparCookie(res) {
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
    const tenant = await getPrisma().tenant.findUnique({ where: { id: dados.tid } });
    if (!tenant || !tenant.active) {
      limparCookie(res);
      return res.redirect('/painel/entrar');
    }
    req.sessao = { userId: dados.sub, nome: dados.nome, papel: dados.papel };
    req.tenant = tenant;
    next();
  } catch {
    limparCookie(res);
    res.redirect('/painel/entrar');
  }
}

module.exports = { autenticar, criarCookie, limparCookie, exigirSessao, COOKIE };
