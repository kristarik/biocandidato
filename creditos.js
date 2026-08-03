const { getPrisma } = require('./prisma-client');

class ErroCredito extends Error {}

/// Lanca um movimento no extrato e atualiza o saldo na mesma transacao.
///
/// O saldo novo sai de um incremento no banco, e nao de "ler, somar, gravar":
/// dois lancamentos simultaneos leriam o mesmo saldo antigo e um sobrescreveria
/// o outro, sumindo com creditos.
async function lancar({ tenantId, tipo, quantidade, descricao, campaignId, createdById }) {
  const prisma = getPrisma();
  const valor = Math.trunc(Number(quantidade));

  if (!Number.isFinite(valor) || valor === 0) {
    throw new ErroCredito('Informe uma quantidade diferente de zero.');
  }
  if (Math.abs(valor) > 10_000_000) {
    throw new ErroCredito('Quantidade fora do limite.');
  }

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({
      where: { id: tenantId },
      data: { creditBalance: { increment: valor } },
      select: { creditBalance: true },
    });

    if (tenant.creditBalance < 0) {
      // Desfaz dentro da propria transacao: saldo negativo significaria
      // disparo entregue sem lastro.
      throw new ErroCredito('Saldo insuficiente para este lançamento.');
    }

    await tx.creditTransaction.create({
      data: {
        tenantId,
        type: tipo,
        amount: valor,
        balanceAfter: tenant.creditBalance,
        description: descricao || null,
        campaignId: campaignId || null,
        createdById: createdById || null,
      },
    });

    return tenant.creditBalance;
  });
}

/// Quanto entrou, quanto saiu e quanto sobrou.
async function resumo(tenantId) {
  const prisma = getPrisma();
  const [porTipo, tenant] = await Promise.all([
    prisma.creditTransaction.groupBy({
      by: ['type'],
      where: { tenantId },
      _sum: { amount: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { creditBalance: true } }),
  ]);

  const soma = (tipos) =>
    porTipo.filter((t) => tipos.includes(t.type)).reduce((total, t) => total + (t._sum.amount || 0), 0);

  return {
    saldo: tenant?.creditBalance ?? 0,
    creditado: soma(['COMPRA', 'BONUS', 'ESTORNO']) + Math.max(0, soma(['AJUSTE'])),
    consumido: Math.abs(soma(['CONSUMO'])),
  };
}

async function extrato(tenantId, limite = 40) {
  return getPrisma().creditTransaction.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });
}

module.exports = { lancar, resumo, extrato, ErroCredito };
