const { esc, tagsDeIcone } = require('./html');

/// Para onde vao os botoes de conversao. WhatsApp primeiro porque e o canal
/// que o publico dessa pagina usa; e-mail como reserva; ancora dos planos
/// quando nenhum dos dois esta configurado, para o botao nunca ficar morto.
function destinoContato() {
  const zap = String(process.env.WHATSAPP_VENDAS || '').replace(/\D/g, '');
  if (zap) {
    const texto = encodeURIComponent(
      'Olá! Vi o site do Candidato Online e quero saber mais sobre a plataforma.'
    );
    return `https://wa.me/${zap}?text=${texto}`;
  }
  if (process.env.EMAIL_VENDAS) {
    return `mailto:${process.env.EMAIL_VENDAS}?subject=${encodeURIComponent('Quero conhecer o Candidato Online')}`;
  }
  return '#planos';
}

const PASSOS = [
  {
    numero: '01',
    titulo: 'A gente monta tudo pra você',
    texto:
      'Você manda foto, número, partido e propostas. Nós montamos seu site e entregamos pronto, no ar, com endereço próprio. Você não configura nada, não escolhe template, não mexe em código.',
  },
  {
    numero: '02',
    titulo: 'Seu eleitor entra com um toque',
    texto:
      'Ele abre seu site, digita o WhatsApp e confirma um código. Pronto: virou contato seu. Nome e CEP só depois da confirmação, para não espantar ninguém logo na entrada.',
  },
  {
    numero: '03',
    titulo: 'Você fala com todos quando quiser',
    texto:
      'Um comício marcado, uma resposta a ataque, um pedido de voto na véspera. Você escreve uma vez e alcança sua base inteira por push, WhatsApp, SMS ou RCS. Sem intermediário, sem leilão de anúncio.',
  },
];

const CANAIS = [
  {
    nome: 'Push',
    etiqueta: 'Sem custo por envio',
    destaque: true,
    icone:
      '<path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/>',
    texto:
      'Notificação na tela de quem instalou seu site no celular. Chega na hora, aparece sem precisar abrir nada e você manda quantas quiser.',
    alcance: 'Quem autorizou notificações',
  },
  {
    nome: 'WhatsApp',
    etiqueta: 'Onde seu eleitor já está',
    icone:
      '<path d="M12 2a10 10 0 0 0-8.7 15l-1.2 4.3 4.4-1.2A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.6-4.8c-.4-.7-.9-1.6-.9-2.5 0-.9.5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.8c0 .2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.2.1.4.1.6-.1l.7-.9c.2-.2.3-.2.5-.1l1.7.8c.2.1.4.2.4.3v1Z"/>',
    texto:
      'O canal que o brasileiro abre todo dia. Pela API oficial, com modelos aprovados pela Meta e o consentimento de cada pessoa registrado no cadastro.',
    alcance: 'Quem confirmou o número',
  },
  {
    nome: 'SMS',
    etiqueta: 'Chega em qualquer aparelho',
    icone:
      '<path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM7 9h10v2H7V9Zm0 4h7v2H7v-2Z"/>',
    texto:
      'Não depende de internet, de aplicativo instalado nem de bateria carregada. Quando a mensagem não pode falhar, é o SMS que segura.',
    alcance: 'Quem confirmou o número',
  },
  {
    nome: 'RCS',
    etiqueta: 'SMS com imagem e botão',
    icone:
      '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-1 14H6l3-4 2 2.7L14 12l4 5Z"/>',
    texto:
      'A evolução do SMS: entra na mesma caixa, mas com sua foto, seu número e botões clicáveis. Sua mensagem com cara de campanha, não de aviso de banco.',
    alcance: 'Quem confirmou o número',
  },
];

const RECURSOS = [
  {
    icone:
      '<path d="M17 2H7a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3Zm-5 18.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM18 16H6V5h12v11Z"/>',
    titulo: 'Site próprio, não perfil alugado',
    texto:
      'candidato.bio/seunome, com sua foto, seu número, suas cores. O eleitor pode instalar na tela inicial do celular e abrir como aplicativo.',
  },
  {
    icone:
      '<path d="M16 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 2c-2.7 0-6 1.3-6 4v2h9v-2c0-1 .4-1.9 1-2.6-1.2-.9-2.9-1.4-4-1.4Zm8 0c-1.3 0-4 .6-5.2 1.8.7.7 1.2 1.6 1.2 2.6V19h10v-2c0-2.7-3.3-4-6-4Z"/>',
    titulo: 'CRM de apoiadores',
    texto:
      'Cada pessoa que se cadastra vira ficha: telefone, cidade, CEP, de onde veio. Filtre por bairro, por origem, por quem confirmou o número.',
  },
  {
    icone:
      '<path d="M3 3v18h18v-2H5V3H3Zm4 12h2v4H7v-4Zm4-6h2v10h-2V9Zm4-4h2v14h-2V5Z"/>',
    titulo: 'Você enxerga o que funcionou',
    texto:
      'Cadastros por dia, de onde vieram, em que cidade estão, quantos pararam no meio do caminho. Cada link de campanha rastreado por origem.',
  },
  {
    icone:
      '<path d="M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm-1 15-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9l-7 7Z"/>',
    titulo: 'LGPD desde o primeiro cadastro',
    texto:
      'Consentimento registrado com data, IP e o texto exato que a pessoa aceitou. Confirmação por código prova que o número é de quem autorizou.',
  },
];

const PLANOS = [
  {
    nome: 'Vereador',
    preco: '297',
    periodo: '/mês',
    resumo: 'Para campanhas municipais que estão começando a base.',
    itens: [
      'Site próprio no ar em 6 horas',
      'Apoiadores ilimitados',
      'Push ilimitado e sem custo por envio',
      'CRM com filtros e exportação',
      '1.000 SMS inclusos por mês',
      'Suporte por WhatsApp',
    ],
  },
  {
    nome: 'Prefeito',
    preco: '697',
    periodo: '/mês',
    destaque: true,
    selo: 'Mais escolhido',
    resumo: 'Para quem precisa falar com a cidade inteira, com segmentação.',
    itens: [
      'Tudo do plano Vereador',
      '5.000 SMS inclusos por mês',
      'WhatsApp pela API oficial',
      'RCS com imagem e botões',
      'Segmentação por bairro e por tag',
      'Agendamento de disparos',
      'Relatório de entrega por campanha',
    ],
  },
  {
    nome: 'Estadual',
    preco: 'Sob consulta',
    periodo: '',
    resumo: 'Deputado, senador, governador ou grupo com vários candidatos.',
    itens: [
      'Tudo do plano Prefeito',
      'Vários candidatos no mesmo painel',
      'Volume de SMS negociado',
      'Integração com seu provedor',
      'Gerente de conta dedicado',
    ],
  },
];

const PERGUNTAS = [
  {
    p: 'Preciso saber mexer em site?',
    r: 'Não. Você não monta nada. Manda o material pelo WhatsApp e devolvemos o site pronto e no ar. Depois, se quiser trocar uma proposta ou uma foto, o painel tem um formulário simples — mas mesmo isso a gente faz por você se preferir.',
  },
  {
    p: 'Qual a diferença para impulsionar no Instagram?',
    r: 'Anúncio é alcance alugado: você paga toda vez e a plataforma decide quem vê. Aqui o contato é seu. Uma vez que a pessoa se cadastrou, você fala com ela quantas vezes quiser, sem leilão e sem algoritmo no meio. O ideal é usar os dois: anúncio para trazer a pessoa, plataforma para não perder ela.',
  },
  {
    p: 'Como funciona o disparo por WhatsApp?',
    r: 'Pela API oficial da Meta, não por chip ou aplicativo pirata — esses derrubam o número e queimam a campanha. Na prática isso significa duas coisas: a pessoa precisa ter autorizado no cadastro, o que a plataforma já registra, e a mensagem sai de um modelo aprovado pela Meta antes do envio. A gente cuida da aprovação junto com você. É mais burocrático que SMS, e em troca não corre risco de bloqueio.',
  },
  {
    p: 'Isso está de acordo com a legislação eleitoral?',
    r: 'A plataforma registra o consentimento de cada pessoa com data, IP e o texto aceito, e confirma o número por código antes de qualquer envio. Todo disparo tem origem identificável e caminho de descadastro. Ainda assim, a responsabilidade pelo conteúdo e pelo enquadramento na legislação é da campanha — vale alinhar com seu advogado eleitoral.',
  },
  {
    p: 'O que acontece com meus dados depois da eleição?',
    r: 'A base é sua. Você exporta quando quiser, em qualquer momento, e leva embora. Não vendemos, não compartilhamos e não usamos os contatos de um candidato para outro.',
  },
  {
    p: 'Quanto tempo leva para entrar no ar?',
    r: 'Até 6 horas depois que você mandar o material. Em período de campanha, com prazo apertado, a gente prioriza.',
  },
  {
    p: 'Consigo cancelar quando quiser?',
    r: 'Sim, sem multa e sem fidelidade. Campanha tem começo e fim, e o contrato acompanha isso.',
  },
];

function render() {
  const contato = destinoContato();

  const passos = PASSOS.map(
    (p, i) => `<article class="passo revelar" style="--atraso:${i * 70}ms">
      <span class="passo-numero">${p.numero}</span>
      <h3>${esc(p.titulo)}</h3>
      <p>${esc(p.texto)}</p>
    </article>`
  ).join('');

  const canais = CANAIS.map(
    (c, i) => `<article class="canal ${c.destaque ? 'canal-destaque' : ''} revelar" style="--atraso:${i * 60}ms">
      <span class="canal-icone">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">${c.icone}</svg>
      </span>
      <h3>${esc(c.nome)}</h3>
      <span class="canal-etiqueta">${esc(c.etiqueta)}</span>
      <p>${esc(c.texto)}</p>
      <p class="canal-alcance">Alcança: <b>${esc(c.alcance)}</b></p>
    </article>`
  ).join('');

  const recursos = RECURSOS.map(
    (r, i) => `<article class="recurso revelar" style="--atraso:${(i % 3) * 60}ms">
      <span class="recurso-icone">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">${r.icone}</svg>
      </span>
      <h3>${esc(r.titulo)}</h3>
      <p>${esc(r.texto)}</p>
    </article>`
  ).join('');

  const planos = PLANOS.map(
    (p, i) => `<article class="plano ${p.destaque ? 'plano-destaque' : ''} revelar" style="--atraso:${i * 70}ms">
      ${p.selo ? `<span class="selo">${esc(p.selo)}</span>` : ''}
      <h3>${esc(p.nome)}</h3>
      <p class="plano-resumo">${esc(p.resumo)}</p>
      <p class="plano-preco">${
        p.preco === 'Sob consulta'
          ? '<span class="consulta">Sob consulta</span>'
          : `<span class="cifrao">R$</span>${esc(p.preco)}<span class="periodo">${esc(p.periodo)}</span>`
      }</p>
      <ul>${p.itens
        .map(
          (item) => `<li>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
              stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
            ${esc(item)}</li>`
        )
        .join('')}</ul>
      <a class="botao ${p.destaque ? 'botao-primario' : 'botao-suave'}" href="${esc(contato)}">
        ${p.preco === 'Sob consulta' ? 'Falar com a gente' : 'Começar agora'}
      </a>
    </article>`
  ).join('');

  const perguntas = PERGUNTAS.map(
    (q) => `<details class="pergunta revelar">
      <summary>
        <span>${esc(q.p)}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9.5 12 15l6-5.5"/></svg>
      </summary>
      <div class="resposta"><p>${esc(q.r)}</p></div>
    </details>`
  ).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidato Online — a base de apoiadores que é sua, não alugada</title>
<meta name="description" content="Cada candidato ganha um site pronto que transforma seguidor em contato, e um painel para falar com a base inteira por push, SMS e RCS. Sem depender do alcance das redes.">
<meta property="og:title" content="Candidato Online">
<meta property="og:description" content="A base de apoiadores da sua campanha, no seu nome. Site pronto, CRM e disparos por push, SMS e RCS.">
<meta property="og:image" content="/assets/logo-candidato-online.png">
<meta property="og:type" content="website">
<meta name="theme-color" content="#0d4f9e">
${tagsDeIcone()}
<style>
  :root {
    --azul: #0d4f9e;
    --azul-escuro: #08356c;
    --azul-vivo: #1c86e8;
    --verde: #3ea746;
    --tinta: #10151c;
    --tinta-media: #4a5461;
    --tinta-fraca: #78828f;
    --borda: #e5e8ee;
    --superficie: #ffffff;
    --plano-fundo: #f6f8fb;

    /* Curvas fortes: as nativas do CSS nao tem a firmeza necessaria. */
    --saida: cubic-bezier(0.23, 1, 0.32, 1);
    --entrada-saida: cubic-bezier(0.77, 0, 0.175, 1);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
  body {
    margin: 0; background: var(--superficie); color: var(--tinta);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6; -webkit-font-smoothing: antialiased;
  }
  img, svg { display: block; max-width: 100%; }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { letter-spacing: -.03em; line-height: 1.12; margin: 0; }
  p { margin: 0; }
  .largura { width: min(100% - 2.5rem, 1120px); margin-inline: auto; }
  .secao { padding: clamp(4rem, 9vw, 7.5rem) 0; }

  /* ---------------- topo ---------------- */
  .topo {
    position: sticky; top: 0; z-index: 50;
    background: rgba(255,255,255,.82); backdrop-filter: saturate(180%) blur(14px);
    border-bottom: 1px solid transparent;
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }
  .topo.rolado { border-bottom-color: var(--borda); box-shadow: 0 1px 18px rgba(16,21,28,.05); }
  .topo-linha { display: flex; align-items: center; gap: 2rem; padding: .85rem 0; }
  .topo img { height: 32px; width: auto; }
  .topo nav { display: none; gap: 1.9rem; margin-left: auto; font-size: .92rem; font-weight: 500; color: var(--tinta-media); }
  .topo nav a { position: relative; padding: .2rem 0; transition: color 180ms ease; }
  .topo-acao { margin-left: auto; }
  @media (min-width: 900px) {
    .topo nav { display: flex; }
    .topo-acao { margin-left: 0; }
  }

  /* ---------------- botoes ---------------- */
  .botao {
    display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
    padding: .82rem 1.5rem; border-radius: 11px; border: 0; cursor: pointer;
    font: inherit; font-weight: 620; font-size: .95rem; white-space: nowrap;
    transition: transform 160ms var(--saida), background-color 180ms ease,
                box-shadow 180ms ease, color 180ms ease;
  }
  /* Toda superficie apertavel responde na hora: sem isso a interface parece
     nao ter escutado o toque. */
  .botao:active { transform: scale(.97); }
  .botao-primario {
    background: var(--azul); color: #fff;
    box-shadow: 0 1px 2px rgba(8,53,108,.28), 0 8px 22px -8px rgba(8,53,108,.5);
  }
  .botao-suave { background: #eef2f8; color: var(--azul-escuro); }
  .botao-vidro { background: rgba(255,255,255,.14); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.28); }
  .botao-linha { background: transparent; color: var(--tinta); box-shadow: inset 0 0 0 1.5px var(--borda); }
  .botao-grande { padding: 1rem 1.9rem; font-size: 1.02rem; }
  /* Aparelho de toque dispara hover no primeiro toque; a consulta evita isso. */
  @media (hover: hover) and (pointer: fine) {
    .botao-primario:hover { background: var(--azul-escuro); box-shadow: 0 2px 4px rgba(8,53,108,.3), 0 14px 30px -10px rgba(8,53,108,.55); }
    .botao-suave:hover { background: #e4eaf4; }
    .botao-vidro:hover { background: rgba(255,255,255,.22); }
    .botao-linha:hover { box-shadow: inset 0 0 0 1.5px #cfd6e2; }
    .topo nav a:hover { color: var(--tinta); }
  }

  /* ---------------- topo da pagina ---------------- */
  .capa {
    position: relative; overflow: hidden;
    background:
      radial-gradient(1100px 520px at 78% -12%, rgba(28,134,232,.16), transparent 62%),
      radial-gradient(760px 420px at 4% 8%, rgba(62,167,70,.13), transparent 60%);
    padding: clamp(3.5rem, 8vw, 6.5rem) 0 clamp(3.5rem, 7vw, 5.5rem);
  }
  .capa-grade { display: grid; gap: clamp(3rem, 6vw, 4.5rem); align-items: center; }
  @media (min-width: 980px) { .capa-grade { grid-template-columns: 1.06fr .94fr; } }
  .marcador {
    display: inline-flex; align-items: center; gap: .5rem; padding: .34rem .8rem .34rem .5rem;
    background: #fff; border: 1px solid var(--borda); border-radius: 999px;
    font-size: .8rem; font-weight: 600; color: var(--tinta-media);
    box-shadow: 0 1px 3px rgba(16,21,28,.05);
  }
  .marcador b { color: var(--verde); font-weight: 700; }
  .ponto {
    width: 7px; height: 7px; border-radius: 50%; background: var(--verde);
    box-shadow: 0 0 0 3px rgba(62,167,70,.18);
  }
  .capa h1 { font-size: clamp(2.3rem, 5.6vw, 3.9rem); font-weight: 780; margin: 1.15rem 0 0; }
  .capa h1 em { font-style: normal; color: var(--azul); }
  .capa .chamada { font-size: clamp(1.03rem, 1.9vw, 1.2rem); color: var(--tinta-media); margin-top: 1.15rem; max-width: 33rem; }
  .capa-acoes { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: 1.9rem; }
  .capa-nota { margin-top: 1.1rem; font-size: .86rem; color: var(--tinta-fraca); }

  /* ---------------- aparelho ---------------- */
  .palco { display: grid; place-items: center; position: relative; }
  .brilho {
    position: absolute; width: 78%; aspect-ratio: 1; border-radius: 50%;
    background: radial-gradient(circle, rgba(28,134,232,.2), transparent 68%); filter: blur(26px);
  }
  .aparelho {
    position: relative; width: min(288px, 78vw); aspect-ratio: 9 / 18.6;
    background: #10151c; border-radius: 40px; padding: 9px;
    box-shadow: 0 2px 6px rgba(16,21,28,.2), 0 40px 70px -28px rgba(8,53,108,.5),
                inset 0 0 0 1.5px rgba(255,255,255,.1);
  }
  .tela {
    width: 100%; height: 100%; border-radius: 32px; overflow: hidden;
    background: #fff; display: flex; flex-direction: column;
  }
  .tela-capa {
    height: 34%; background: linear-gradient(158deg, var(--azul-vivo), var(--azul-escuro));
    position: relative;
  }
  .tela-retrato {
    position: absolute; left: 50%; bottom: -30px; transform: translateX(-50%);
    width: 68px; height: 68px; border-radius: 50%; background: #dbe3ee;
    border: 4px solid #fff; display: grid; place-items: center;
    font-weight: 750; color: var(--azul); font-size: 1.5rem;
  }
  .tela-corpo { padding: 42px 16px 0; text-align: center; flex: 1; }
  .tela-nome { font-weight: 750; font-size: .96rem; letter-spacing: -.02em; }
  .tela-numero { font-weight: 750; font-size: .9rem; color: var(--tinta-fraca); }
  .tela-partido { font-size: .58rem; font-weight: 700; letter-spacing: .09em; color: var(--azul); margin-top: .3rem; }
  .tela-cartoes { display: flex; gap: 7px; margin-top: 14px; }
  .tela-cartao {
    flex: 1; height: 56px; border-radius: 9px; background: #10151c;
    display: grid; place-items: center; padding: 6px;
  }
  .tela-cartao span { width: 70%; height: 4px; border-radius: 2px; background: rgba(255,255,255,.45); }
  .tela-campo {
    margin-top: 14px; height: 32px; border-radius: 999px; border: 1.5px solid var(--borda);
    display: flex; align-items: center; padding: 0 11px; gap: 7px;
  }
  .tela-campo i { width: 12px; height: 12px; border-radius: 50%; background: var(--verde); flex: 0 0 auto; }
  .tela-campo span { height: 5px; width: 62%; border-radius: 3px; background: #e2e7ef; }
  .tela-botao {
    margin-top: 7px; height: 32px; border-radius: 8px; background: #10151c; color: #fff;
    display: grid; place-items: center; font-size: .56rem; font-weight: 750; letter-spacing: .1em;
  }
  .tela-barra {
    margin-top: auto; height: 44px; border-top: 1px solid var(--borda);
    display: flex; align-items: center; justify-content: space-around; padding: 0 8px;
  }
  .tela-barra i { width: 15px; height: 15px; border-radius: 4px; background: #e2e7ef; }
  .tela-barra i.forte { background: var(--azul); border-radius: 50%; width: 26px; height: 26px; }

  /* Aviso de push flutuando: mostra o produto em uso, nao so a tela parada. */
  .aviso {
    position: absolute; left: -8%; bottom: 19%; width: min(252px, 68vw);
    /* Em tela estreita o recuo negativo jogaria o cartao para fora do palco,
       e a capa tem overflow oculto: o aviso apareceria cortado ao meio. */
    background: rgba(255,255,255,.92); backdrop-filter: blur(12px);
    border: 1px solid rgba(16,21,28,.07); border-radius: 15px; padding: .7rem .8rem;
    box-shadow: 0 16px 38px -12px rgba(8,53,108,.34); display: flex; gap: .6rem;
    animation: flutuar 5.5s var(--entrada-saida) infinite;
  }
  .aviso-icone {
    width: 30px; height: 30px; border-radius: 8px; flex: 0 0 auto;
    background: linear-gradient(150deg, var(--azul-vivo), var(--azul)); display: grid; place-items: center;
  }
  .aviso-titulo { font-size: .76rem; font-weight: 700; }
  .aviso-texto { font-size: .72rem; color: var(--tinta-media); line-height: 1.35; }
  .aviso-hora { font-size: .64rem; color: var(--tinta-fraca); margin-top: .12rem; }
  @media (max-width: 760px) { .aviso { left: 0; bottom: 13%; } }
  @keyframes flutuar {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-9px); }
  }

  /* ---------------- numeros ---------------- */
  .placa {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px;
    background: var(--borda); border: 1px solid var(--borda); border-radius: 16px; overflow: hidden;
  }
  .placa div { background: #fff; padding: 1.5rem 1.3rem; }
  .placa dt { font-size: clamp(1.7rem, 3.4vw, 2.3rem); font-weight: 750; letter-spacing: -.04em; color: var(--azul); }
  .placa dd { margin: .18rem 0 0; font-size: .84rem; color: var(--tinta-media); }

  /* ---------------- blocos ---------------- */
  .cabecalho { max-width: 40rem; margin-bottom: clamp(2.4rem, 4.5vw, 3.4rem); }
  .cabecalho.centro { margin-inline: auto; text-align: center; }
  .etiqueta {
    font-size: .76rem; font-weight: 720; letter-spacing: .11em; text-transform: uppercase;
    color: var(--azul); margin-bottom: .8rem;
  }
  .cabecalho h2 { font-size: clamp(1.85rem, 4vw, 2.7rem); font-weight: 760; }
  .cabecalho p { margin-top: .95rem; color: var(--tinta-media); font-size: 1.04rem; }

  .escuro { background: var(--tinta); color: #fff; }
  .escuro .cabecalho h2 { color: #fff; }
  .escuro .cabecalho p { color: #a8b2bf; }
  .escuro .etiqueta { color: #6db4f5; }

  .passos { display: grid; gap: 1.1rem; }
  @media (min-width: 860px) { .passos { grid-template-columns: repeat(3, 1fr); } }
  .passo {
    background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.1);
    border-radius: 16px; padding: 1.6rem 1.5rem;
  }
  .passo-numero {
    display: inline-block; font-size: .78rem; font-weight: 750; letter-spacing: .1em;
    color: #6db4f5; margin-bottom: .9rem;
  }
  .passo h3 { font-size: 1.13rem; font-weight: 700; }
  .passo p { margin-top: .6rem; color: #a8b2bf; font-size: .94rem; }

  /* ---------------- canais ---------------- */
  .canais { display: grid; gap: 1.1rem; }
  @media (min-width: 640px) { .canais { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1040px) { .canais { grid-template-columns: repeat(4, 1fr); } }
  .canal {
    background: #fff; border: 1px solid var(--borda); border-radius: 16px;
    padding: 1.7rem 1.5rem; display: flex; flex-direction: column;
    transition: transform 220ms var(--saida), box-shadow 220ms ease, border-color 220ms ease;
  }
  .canal-destaque { border-color: rgba(13,79,158,.35); background: linear-gradient(170deg, #f4f8ff, #fff 62%); }
  @media (hover: hover) and (pointer: fine) {
    .canal:hover { transform: translateY(-3px); border-color: #cdd8ea; box-shadow: 0 14px 34px -18px rgba(8,53,108,.35); }
  }
  .canal-icone {
    width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center;
    background: rgba(13,79,158,.09); color: var(--azul); margin-bottom: 1rem;
  }
  .canal h3 { font-size: 1.1rem; font-weight: 720; }
  .canal-etiqueta {
    display: inline-block; align-self: flex-start; margin-top: .45rem;
    font-size: .72rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
    color: var(--verde);
  }
  .canal p { margin-top: .7rem; color: var(--tinta-media); font-size: .92rem; }
  .canal-alcance {
    margin-top: auto; padding-top: .9rem; font-size: .82rem; color: var(--tinta-fraca);
  }
  .canal-alcance b { color: var(--tinta-media); font-weight: 620; }

  .recursos { display: grid; gap: 1.1rem; }
  @media (min-width: 720px) { .recursos { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1040px) { .recursos { grid-template-columns: repeat(4, 1fr); } }
  .recurso {
    background: #fff; border: 1px solid var(--borda); border-radius: 16px; padding: 1.6rem 1.5rem;
    transition: transform 220ms var(--saida), box-shadow 220ms ease, border-color 220ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .recurso:hover {
      transform: translateY(-3px); border-color: #d3dcea;
      box-shadow: 0 14px 34px -18px rgba(8,53,108,.35);
    }
  }
  .recurso-icone {
    width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
    background: linear-gradient(150deg, rgba(28,134,232,.14), rgba(62,167,70,.14));
    color: var(--azul); margin-bottom: 1.05rem;
  }
  .recurso h3 { font-size: 1.05rem; font-weight: 700; }
  .recurso p { margin-top: .55rem; color: var(--tinta-media); font-size: .93rem; }

  /* ---------------- comparacao ---------------- */
  .comparacao { display: grid; gap: 1.1rem; }
  @media (min-width: 820px) { .comparacao { grid-template-columns: 1fr 1fr; } }
  .lado {
    border-radius: 18px; padding: 1.9rem 1.8rem; border: 1px solid var(--borda); background: var(--plano-fundo);
  }
  .lado.bom { background: linear-gradient(165deg, #0d4f9e, #08356c); border-color: transparent; color: #fff; }
  .lado h3 { font-size: 1.2rem; font-weight: 720; }
  .lado ul { list-style: none; padding: 0; margin: 1.2rem 0 0; display: grid; gap: .78rem; }
  .lado li { display: flex; gap: .65rem; font-size: .95rem; color: var(--tinta-media); }
  .lado.bom li { color: rgba(255,255,255,.86); }
  .lado li svg { flex: 0 0 auto; margin-top: .22rem; }
  .lado .ruim svg { color: #c2705f; }
  .lado.bom li svg { color: #78dd83; }

  /* ---------------- planos ---------------- */
  .planos { display: grid; gap: 1.2rem; align-items: start; }
  @media (min-width: 880px) { .planos { grid-template-columns: repeat(3, 1fr); } }
  .plano {
    position: relative; background: #fff; border: 1px solid var(--borda);
    border-radius: 18px; padding: 1.9rem 1.7rem; display: flex; flex-direction: column;
  }
  .plano-destaque {
    border-color: var(--azul); box-shadow: 0 22px 50px -26px rgba(8,53,108,.45);
  }
  @media (min-width: 880px) { .plano-destaque { transform: scale(1.035); } }
  .selo {
    position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
    background: var(--azul); color: #fff; font-size: .7rem; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; padding: .28rem .8rem; border-radius: 999px;
    white-space: nowrap;
  }
  .plano h3 { font-size: 1.22rem; font-weight: 730; }
  .plano-resumo { margin-top: .45rem; font-size: .9rem; color: var(--tinta-media); min-height: 2.6rem; }
  .plano-preco {
    margin: 1.15rem 0 0; font-size: 2.5rem; font-weight: 770; letter-spacing: -.045em; line-height: 1;
  }
  .plano-preco .cifrao { font-size: 1.05rem; font-weight: 650; vertical-align: .8rem; margin-right: .12rem; color: var(--tinta-media); }
  .plano-preco .periodo { font-size: .92rem; font-weight: 550; color: var(--tinta-fraca); letter-spacing: -.01em; }
  .plano-preco .consulta { font-size: 1.55rem; }
  .plano ul { list-style: none; padding: 0; margin: 1.4rem 0 1.7rem; display: grid; gap: .68rem; flex: 1; }
  .plano li { display: flex; gap: .6rem; font-size: .91rem; color: var(--tinta-media); }
  .plano li svg { color: var(--verde); flex: 0 0 auto; margin-top: .18rem; }
  .plano .botao { width: 100%; }

  /* ---------------- perguntas ---------------- */
  .perguntas { max-width: 46rem; margin-inline: auto; display: grid; gap: .7rem; }
  .pergunta { border: 1px solid var(--borda); border-radius: 13px; background: #fff; overflow: hidden; }
  .pergunta summary {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 1.1rem 1.3rem; cursor: pointer; list-style: none;
    font-weight: 620; font-size: .99rem;
  }
  .pergunta summary::-webkit-details-marker { display: none; }
  .pergunta summary svg { flex: 0 0 auto; color: var(--tinta-fraca); transition: transform 220ms var(--saida); }
  .pergunta[open] summary svg { transform: rotate(180deg); }
  .resposta { padding: 0 1.3rem 1.2rem; color: var(--tinta-media); font-size: .95rem; }
  @media (hover: hover) and (pointer: fine) {
    .pergunta summary:hover { background: #fafbfd; }
  }

  /* ---------------- chamada final ---------------- */
  .final {
    border-radius: 22px; padding: clamp(2.6rem, 6vw, 4.2rem) clamp(1.6rem, 5vw, 3.4rem);
    background: linear-gradient(158deg, #0d4f9e, #08356c); color: #fff; text-align: center;
    position: relative; overflow: hidden;
  }
  .final::after {
    content: ''; position: absolute; inset: auto -10% -60% -10%; height: 70%;
    background: radial-gradient(circle at 50% 0%, rgba(62,167,70,.35), transparent 62%);
  }
  .final > * { position: relative; }
  .final h2 { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 760; }
  .final p { margin-top: 1rem; color: rgba(255,255,255,.82); font-size: 1.03rem; max-width: 34rem; margin-inline: auto; }
  .final-acoes { display: flex; flex-wrap: wrap; gap: .7rem; justify-content: center; margin-top: 2rem; }
  .final .botao-primario { background: #fff; color: var(--azul-escuro); box-shadow: 0 10px 26px -10px rgba(0,0,0,.4); }
  @media (hover: hover) and (pointer: fine) { .final .botao-primario:hover { background: #eef2f8; } }

  /* ---------------- rodape ---------------- */
  footer { border-top: 1px solid var(--borda); padding: 2.6rem 0 3rem; }
  .rodape { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: center; justify-content: space-between; }
  .rodape img { height: 30px; }
  .rodape nav { display: flex; flex-wrap: wrap; gap: 1.4rem; font-size: .89rem; color: var(--tinta-media); }
  .rodape small { display: block; color: var(--tinta-fraca); font-size: .82rem; margin-top: 1.6rem; }

  /* ---------------- revelacao ---------------- */
  .revelar {
    opacity: 0; transform: translateY(16px);
    transition: opacity 620ms var(--saida) var(--atraso, 0ms),
                transform 620ms var(--saida) var(--atraso, 0ms);
  }
  .revelar.visivel { opacity: 1; transform: none; }
  .entrada { opacity: 0; transform: translateY(14px); animation: subir 640ms var(--saida) forwards; }
  .entrada:nth-child(1) { animation-delay: 40ms; }
  .entrada:nth-child(2) { animation-delay: 110ms; }
  .entrada:nth-child(3) { animation-delay: 180ms; }
  .entrada:nth-child(4) { animation-delay: 250ms; }
  .entrada:nth-child(5) { animation-delay: 320ms; }
  @keyframes subir { to { opacity: 1; transform: none; } }

  /* Movimento reduzido nao e ausencia de animacao: mantem o que ajuda a
     entender (opacidade) e tira o que desloca. */
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .revelar, .entrada { transform: none !important; transition-duration: 260ms; animation-duration: 260ms; }
    .aviso { animation: none; }
    .recurso:hover { transform: none; }
    .botao:active { transform: none; }
  }
</style>
</head>
<body>

<header class="topo" id="topo">
  <div class="largura topo-linha">
    <a href="#topo" aria-label="Candidato Online">
      <img src="/assets/logo-72.png" srcset="/assets/logo-72.png 1x, /assets/logo-144.png 2x"
        alt="Candidato Online" width="213" height="72">
    </a>
    <nav>
      <a href="#como-funciona">Como funciona</a>
      <a href="#canais">Canais</a>
      <a href="#recursos">Recursos</a>
      <a href="#planos">Planos</a>
    </nav>
    <div class="topo-acao">
      <a class="botao botao-primario" href="${esc(contato)}">Quero minha página</a>
    </div>
  </div>
</header>

<main>
  <section class="capa">
    <div class="largura capa-grade">
      <div>
        <span class="marcador entrada"><i class="ponto"></i> <b>Push ilimitado</b> · sem custo por envio</span>
        <h1 class="entrada">A base da sua campanha precisa ser <em>sua</em>.</h1>
        <p class="chamada entrada">
          Você paga caro para alcançar quem já te segue. Aqui, cada pessoa que
          demonstra apoio vira contato seu — e você fala com ela quando quiser,
          por push, WhatsApp, SMS e RCS, sem leilão de anúncio no meio.
        </p>
        <div class="capa-acoes entrada">
          <a class="botao botao-primario botao-grande" href="${esc(contato)}">Quero minha página</a>
          <a class="botao botao-linha botao-grande" href="/dra-maria" target="_blank" rel="noopener">Ver demonstração</a>
        </div>
        <p class="capa-nota entrada">No ar em até 6 horas · Sem fidelidade · Você não configura nada</p>
      </div>

      <div class="palco entrada">
        <div class="brilho" aria-hidden="true"></div>
        <div class="aparelho" role="img" aria-label="Página de um candidato aberta no celular, com notificação de push chegando">
          <div class="tela">
            <div class="tela-capa"><div class="tela-retrato">M</div></div>
            <div class="tela-corpo">
              <div class="tela-nome">Dra. Maria</div>
              <div class="tela-numero">Nº 12345</div>
              <div class="tela-partido">RECIFE · PE</div>
              <div class="tela-cartoes">
                <div class="tela-cartao"><span></span></div>
                <div class="tela-cartao"><span></span></div>
              </div>
              <div class="tela-campo"><i></i><span></span></div>
              <div class="tela-botao">CADASTRAR AGORA</div>
            </div>
            <div class="tela-barra"><i></i><i></i><i class="forte"></i><i></i><i></i></div>
          </div>
        </div>
        <div class="aviso">
          <div class="aviso-icone">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff" aria-hidden="true">
              <path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/>
            </svg>
          </div>
          <div>
            <div class="aviso-titulo">Dra. Maria</div>
            <div class="aviso-texto">Comício amanhã às 18h na Praça do Carmo. Conto com você!</div>
            <div class="aviso-hora">agora</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="largura" style="padding-bottom: clamp(3rem, 6vw, 4.5rem)">
    <dl class="placa revelar">
      <div><dt>6h</dt><dd>do material enviado ao site no ar</dd></div>
      <div><dt>Único</dt><dd>CRM eleitoral com notificação push</dd></div>
      <div><dt>4</dt><dd>canais: push, SMS, RCS e WhatsApp</dd></div>
      <div><dt>100%</dt><dd>da base é sua, exportável quando quiser</dd></div>
    </dl>
  </section>

  <section class="secao escuro" id="como-funciona">
    <div class="largura">
      <div class="cabecalho">
        <p class="etiqueta">Como funciona</p>
        <h2>Três passos. Nenhum deles é com você.</h2>
        <p>Candidato não tem tempo de aprender ferramenta em ano eleitoral. Por isso você não monta, não configura e não integra nada.</p>
      </div>
      <div class="passos">${passos}</div>
    </div>
  </section>

  <section class="secao" id="canais">
    <div class="largura">
      <div class="cabecalho centro">
        <p class="etiqueta">Canais de disparo</p>
        <h2>Quatro formas de chegar em quem já te apoia</h2>
        <p>Você escreve uma vez e escolhe por onde sai. Cada canal alcança um grupo diferente da sua base — e o painel mostra o tamanho de cada um antes de você enviar.</p>
      </div>
      <div class="canais">${canais}</div>
    </div>
  </section>

  <section class="secao" id="recursos" style="padding-top:0">
    <div class="largura">
      <div class="cabecalho centro">
        <p class="etiqueta">O que você recebe</p>
        <h2>Um site que capta e um painel que fala</h2>
        <p>Todo o resto existe para servir a esses dois. Nada de recurso que ninguém usa.</p>
      </div>
      <div class="recursos">${recursos}</div>
    </div>
  </section>

  <section class="secao" style="padding-top:0">
    <div class="largura">
      <div class="cabecalho centro">
        <p class="etiqueta">Por que importa</p>
        <h2>Alcance alugado x base própria</h2>
      </div>
      <div class="comparacao">
        <div class="lado revelar">
          <h3>Só impulsionando nas redes</h3>
          <ul>
            <li class="ruim"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg> Paga de novo cada vez que quer falar</li>
            <li class="ruim"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg> O algoritmo decide quem vê</li>
            <li class="ruim"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg> Não sabe quem é a pessoa nem onde ela vota</li>
            <li class="ruim"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg> Conta suspensa no fim da campanha e acabou tudo</li>
          </ul>
        </div>
        <div class="lado bom revelar" style="--atraso:70ms">
          <h3>Com base própria</h3>
          <ul>
            <li><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg> Fala quantas vezes quiser, sem pagar por alcance</li>
            <li><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg> A mensagem chega direto no aparelho</li>
            <li><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg> Sabe nome, cidade, CEP e de onde ela veio</li>
            <li><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg> A base continua sua na próxima eleição</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="secao" id="planos" style="background: var(--plano-fundo)">
    <div class="largura">
      <div class="cabecalho centro">
        <p class="etiqueta">Planos</p>
        <h2>Escolha pelo tamanho da sua disputa</h2>
        <p>Push ilimitado em todos os planos. Você só paga a mais quando manda SMS, que tem custo de operadora.</p>
      </div>
      <div class="planos">${planos}</div>
    </div>
  </section>

  <section class="secao" id="perguntas">
    <div class="largura">
      <div class="cabecalho centro">
        <p class="etiqueta">Dúvidas</p>
        <h2>O que todo candidato pergunta</h2>
      </div>
      <div class="perguntas">${perguntas}</div>
    </div>
  </section>

  <section class="largura" style="padding-bottom: clamp(4rem, 8vw, 6rem)">
    <div class="final revelar">
      <h2>Sua próxima eleição começa com quem já te apoia.</h2>
      <p>Manda seu material hoje e em 6 horas seu site está no ar captando apoiador. Sem fidelidade, sem taxa de setup.</p>
      <div class="final-acoes">
        <a class="botao botao-primario botao-grande" href="${esc(contato)}">Quero minha página</a>
        <a class="botao botao-vidro botao-grande" href="/dra-maria" target="_blank" rel="noopener">Ver demonstração</a>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="largura">
    <div class="rodape">
      <img src="/assets/logo-72.png" srcset="/assets/logo-72.png 1x, /assets/logo-144.png 2x"
        alt="Candidato Online" width="213" height="72">
      <nav>
        <a href="#como-funciona">Como funciona</a>
        <a href="#recursos">Recursos</a>
        <a href="#planos">Planos</a>
        <a href="/painel/entrar">Área do candidato</a>
      </nav>
    </div>
    <small>© ${new Date().getFullYear()} Candidato Online. Plataforma de relacionamento para campanhas eleitorais.</small>
  </div>
</footer>

<script>
(function () {
  // Sombra no topo so depois que a pagina rola: sem isso a barra parece
  // descolada do conteudo desde o inicio.
  var topo = document.getElementById('topo');
  var marcar = function () { topo.classList.toggle('rolado', window.scrollY > 8); };
  marcar();
  window.addEventListener('scroll', marcar, { passive: true });

  // Revelacao por rolagem, uma vez so. Quem prefere menos movimento recebe o
  // conteudo ja visivel, sem espera.
  var alvos = document.querySelectorAll('.revelar');
  if (!window.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    alvos.forEach(function (e) { e.classList.add('visivel'); });
    return;
  }
  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add('visivel');
      observador.unobserve(entrada.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  alvos.forEach(function (e) { observador.observe(e); });
})();
</script>
</body>
</html>`;
}

module.exports = { render };
