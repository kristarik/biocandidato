// Service worker do Candidato Online.
//
// Servido da raiz de proposito: o escopo de um service worker nao pode subir
// acima da pasta em que ele mora, e a inscricao de push e por dominio. Da raiz
// ele atende a pagina de qualquer candidato.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }

  const titulo = dados.titulo || 'Nova mensagem';
  const opcoes = {
    body: dados.corpo || '',
    // Icone pequeno ao lado do texto: a foto do candidato quando existe. E o
    // unico dos dois que aparece em todo aparelho.
    icon: dados.icone || '/assets/icone-192.png',
    badge: '/assets/icone-32.png',
    // Imagem grande abaixo do texto. Android e desktop exibem; o iPhone ignora
    // o campo em silencio, entao a mensagem nunca pode depender dela.
    ...(dados.imagem ? { image: dados.imagem } : {}),
    // Agrupa por campanha: duas notificacoes da mesma campanha nao empilham
    // na tela do eleitor.
    tag: dados.campanha || undefined,
    // A saida da lista vive aqui porque e o unico lugar que so o dono do
    // aparelho alcanca. Um link na pagina precisaria identificar a pessoa, e
    // identificar sem confirmar o numero e o que abriu o buraco anterior.
    actions: dados.sair ? [{ action: 'sair', title: 'Não quero mais receber' }] : undefined,
    data: { url: dados.url || '/', sair: dados.sair },
    lang: 'pt-BR',
  };

  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  // Quem pediu para sair vai direto para a pagina de saida, numa aba nova. A
  // aba ja aberta do site nao serve: ela esta noutro endereco, e reaproveitar
  // faria o toque parecer ignorado.
  if (evento.action === 'sair' && evento.notification.data?.sair) {
    evento.waitUntil(self.clients.openWindow(evento.notification.data.sair));
    return;
  }

  const destino = evento.notification.data?.url || '/';

  // Reaproveita uma aba ja aberta do site em vez de abrir outra: o eleitor
  // que deixou a pagina aberta nao quer uma segunda.
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if (aba.url.includes(destino) && 'focus' in aba) return aba.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
