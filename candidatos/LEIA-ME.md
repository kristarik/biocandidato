# Material dos candidatos

Uma pasta por candidato, com o nome dele em minúsculas e hífen — o mesmo
formato do endereço no site:

```
candidatos/
  dra-maria/
    briefing.md      ← dados, propostas, tom de voz, o que ele mandou
    foto.jpg         ← foto do candidato
    banner.jpg       ← imagem do topo
    icones/          ← ícones dos links importantes
    banners/         ← peças de divulgação
```

## Por que fica fora do Git

O repositório é público. Foto, telefone, rascunho de proposta e material de
campanha não podem ir para lá. O `.gitignore` bloqueia tudo nesta pasta menos
este arquivo.

Se um dia o repositório virar privado, vale reavaliar — mas mesmo assim
material de cliente costuma envelhecer melhor fora do código.

## Como o material vira site

O que chega aqui é a base para montar o candidato no painel Master:

| O que você manda | Onde entra |
|---|---|
| Foto | upload na identidade |
| Banner / arte de campanha | banner do topo, e a cor principal sai dela |
| Propostas | cards do carrossel, com o texto longo no lightbox |
| Redes sociais | ícones do bloco "Me acompanhe" |
| Links (agenda, programa, doação) | bloco "Links importantes" |
| Slogan e mini biografia | topo da página |

A cor principal e a secundária saem da arte que o candidato mandar, para o
site não destoar do material impresso e das redes dele.
