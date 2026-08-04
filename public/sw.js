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
    icon: dados.icone || '/assets/icone-192.png',
    badge: '/assets/icone-32.png',
    // Agrupa por campanha: duas notificacoes da mesma campanha nao empilham
    // na tela do eleitor.
    tag: dados.campanha || undefined,
    data: { url: dados.url || '/' },
    lang: 'pt-BR',
  };

  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
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
