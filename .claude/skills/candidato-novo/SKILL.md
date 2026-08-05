---
name: candidato-novo
description: Publica a página de um candidato no Candidato Online a partir do material bruto que o cliente mandou — foto de perfil, arte de capa, nome, número, partido e um texto solto sobre ele. Cria a pasta, escreve o conteudo.json, provisiona o acesso e sobe tudo. Escreve propostas e preenche o currículo quando o material não trouxer. Use quando o usuário mandar material de um candidato novo, disser "cria a página do fulano", "monta esse candidato", "sobe mais um", ou anexar foto/banner com nome de candidato.
---

# Montar um candidato

Em quase todo caso é a equipe que entrega o site pronto: o candidato manda foto,
arte e alguns temas, e nunca abre o painel. Esta habilidade cobre o caminho
inteiro, do material bruto à URL no ar.

## O que precisa chegar

**Mínimo para começar:** nome e as imagens (foto de perfil e capa).

Tudo o mais pode ser deduzido, escrito ou perguntado depois. Não trave esperando
material completo — monte com o que veio e liste no fim o que ficou em aberto.

| Campo | Se faltar |
|---|---|
| Nome | **pergunte** — sem ele não há slug nem acesso |
| Foto de perfil | pergunte; a página fica sem rosto |
| Capa | monte sem, a página aguenta |
| Número | pergunte; aparece embaixo do nome |
| Partido, cargo, cidade, estado | pergunte se não der para inferir do material |
| Cores | **tire das imagens** |
| Bio, slogan | **escreva** a partir do material |
| Propostas | **escreva** (ver limites abaixo) |
| Currículo | **só do material** (ver limites abaixo) |
| Redes, links | monte sem |

## Limite entre escrever e inventar

O usuário autorizou gerar propostas e currículo. Os dois não são a mesma coisa.

**Propostas — pode escrever.** São posição política sobre um tema. Se o material
diz "foco em segurança, saúde e educação", escrever a proposta de segurança é
redação, não invenção. Escreva na primeira pessoa, ancorada na trajetória que o
material informa.

**Currículo — só do que veio no material.** Cada linha ali é uma afirmação de
fato sobre uma pessoa real: formação, cargo, profissão. Inventar "Formado em
Direito" para um candidato que não é advogado é fabricar credencial, e quem paga
é ele — não nós. Monte o currículo apenas com o que o material sustenta. Se
sobrar pouco, entregue pouco e diga ao usuário quais campos faltam para ele
confirmar.

**Sempre avise no fim** que as propostas foram escritas por você e precisam do
aval do candidato antes de circular. É texto político assinado com o nome dele.

## Passo a passo

### 1 — Pasta do candidato

O slug sai do nome: `Dra. Maria Souza` → `dra-maria-souza`. Confira que não
colide com rota do sistema (`painel`, `master`, `admin`, `api`, `sair`, `app`,
`assets`, `status`, `health`).

```
candidatos/<slug>/
  foto.jpg           perfil, recorte quadrado
  capa.jpg           arte do topo
  cidade.jpg         fundo da seção de propostas (opcional)
  galeria/           artes do "COMPARTILHE" (opcional)
  briefing.md        o material bruto como chegou
  conteudo.json      o que você escreveu
```

A pasta `candidatos/` é ignorada pelo git — material de campanha não entra em
repositório público. Não force nada dali para dentro de um commit.

O script acha a imagem por **pedaço do nome**, não pelo nome exato: qualquer
arquivo com `foto` no nome vira a foto, com `capa` ou `banner` vira a capa, com
`cidade` vira o fundo. Entre dois candidatos, o nome mais curto ganha — `banner`
passa na frente de `banner-original`.

### 2 — Cores

Abra as imagens e tire a paleta delas. A regra:

- `cor` — a cor dominante da identidade. É a dos botões e destaques.
- `cor2` — a de apoio, para contraste.
- `corEscura` — o tom mais escuro da paleta, usado no rodapé e no aviso de
  cookies. Se não houver um, o sistema escurece a `cor` sozinho.

Se o material já trouxer paleta escrita, use a paleta e ignore o que você
extraiu — a identidade do candidato manda.

Só entram valores `#RRGGBB`. Hex de 3 dígitos ou nome de cor é descartado em
silêncio pelo provisionamento.

### 3 — conteudo.json

```json
{
  "numero": "22111",
  "cor": "#052F76",
  "cor2": "#E5B106",
  "corEscura": "#030E21",
  "slogan": "Juntos somos mais fortes",
  "bio": "Duas ou três frases. Quem é, o que faz, no que acredita.",
  "curriculo": "Um parágrafo curto de abertura do currículo.",
  "experiencias": [
    { "titulo": "Policial Militar do Rio de Janeiro", "detalhe": "14 anos de serviço" },
    { "titulo": "Formado em Administração" }
  ],
  "propostas": [
    {
      "titulo": "Segurança que valoriza quem está na rua",
      "resumo": "Uma linha. É o que aparece no card.",
      "texto": "O texto longo, que abre no lightbox."
    }
  ],
  "redes": [{ "rede": "instagram", "url": "https://instagram.com/perfil" }],
  "links": [{ "rotulo": "Nosso programa", "url": "https://..." }]
}
```

Campo ausente é ignorado, não apagado. Rodar de novo depois de editar o JSON
deixa o site igual ao arquivo — propostas, currículo, redes e links são
**substituídos**, não acrescentados.

Referência real: `candidatos/diego-moreno/conteudo.json`.

### 4 — Provisionar e montar

```bash
npm run candidato:novo -- --nome "Diego Moreno" --numero 22111 --partido "NOVO" --cidade "Rio de Janeiro" --estado RJ
```

Devolve usuário (= slug) e senha temporária. **Anote na hora** — é gravada com
hash e não dá para ler depois. Se perder, `npm run candidato:senha`.

```bash
npm run candidato:montar -- <slug>
```

Sobe as imagens, aplica cores e grava todo o conteúdo.

Os dois comandos escrevem direto no **banco de produção**. Não existe ambiente de
teste. Confira o slug antes de rodar.

### 5 — Conferir antes de entregar

Abra `http://localhost:3000/<slug>` no preview e verifique:

- a capa carregou e não ficou espremida
- a foto redonda está sobre a capa, com o rosto centralizado
- as cores dos botões batem com a identidade
- as propostas abrem no lightbox
- o menu de baixo não cobre conteúdo

O servidor local fala com o mesmo banco de produção, então o que aparece ali é o
que está no ar.

### 6 — Entregar

```
Página    candidato.bio/<slug>
Painel    candidato.bio/painel/entrar
Usuário   <slug>
Senha     <a temporária>
```

Diga também:

- que as propostas são sua redação e precisam do aval do candidato
- o que ficou faltando (currículo incompleto, redes, número, artes)
- que o saldo de disparos começa em **0** — push só depois de liberar crédito no
  Master

## Tropeços conhecidos

**Capa espremida.** A capa segue a proporção da própria imagem quando é retrato
(mais alta que 1.3 de largura/altura). Arte quadrada ou vertical fica bonita.
Arte muito panorâmica vira uma tira fina — peça outra ou corte.

**Tamanhos.** Foto 800×800, capa até 1600×1600, cidade 1400×1000, arte de
compartilhar 1440×1800. Entrada de até 8 MB. Tudo é reprocessado para WebP com
EXIF removido, então não gaste tempo otimizando antes.

**Galeria.** Os arquivos entram em ordem alfabética do nome. Nomeie `g1`, `g2`,
`g3` para controlar a sequência.

**Arte com número errado.** Peça de campanha costuma vir com "VOTE 00.000" de
template. Confira antes de subir — é o tipo de coisa que só aparece depois que
alguém compartilhou.

**Nome de arquivo com acento ou espaço** funciona, mas complica na hora de
depurar. Renomeie para minúsculo sem acento ao salvar na pasta.
