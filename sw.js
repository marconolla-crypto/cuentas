/* Nuestras Cuentas · guarda la app en el teléfono para que abra sin internet.
   - La página: primero la red (así siempre llega la versión nueva) y, si no hay
     señal o tarda más de 4 segundos, la última que se guardó.
   - Letras, ícono y manifest: lo guardado primero, y se refresca por detrás.
   - Supabase no pasa por aquí: los datos sin red los maneja la app. */
const CACHE = 'nc-1';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icon180.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(BASE.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const conTope = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('lento')), ms))]);

self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const propio = u.origin === self.location.origin;
  const letras = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (!propio && !letras) return;

  if (r.mode === 'navigate') {
    e.respondWith(conTope(fetch(r), 4000)
      .then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put('index.html', c)); } return res; })
      .catch(() => caches.match('index.html').then((hit) => hit || caches.match('./'))));
    return;
  }

  e.respondWith(caches.match(r, { ignoreSearch: propio }).then((hit) => {
    const red = fetch(r).then((res) => {
      if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then((x) => x.put(r, c)); }
      return res;
    }).catch(() => hit);
    return hit || red;
  }));
});
