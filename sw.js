// Gemmer selve app'en, så den åbner med det samme. Kampdata hentes altid frisk.
const CACHE = 'renscore-v10';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'motion.js', 'vendor/gsap.min.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' går uden om telefonens HTTP-cache (GitHub siger "gem i 10 min"), så det er den nyeste version.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// App-filerne vises fra cachen med det samme og opdateres i baggrunden (ny version ved næste åbning).
// streaming.json hentes altid frisk, med cachen som reserve uden net.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // 'no-cache' spørger GitHub hver gang (svarer hurtigt med "uændret"), i stedet for at bruge en gammel kopi.
  const fresh = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  });
  if (url.pathname.endsWith('streaming.json')) {
    e.respondWith(fresh.catch(() => caches.match(e.request)));
    return;
  }
  e.waitUntil(fresh.catch(() => {}));
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fresh.catch(() => caches.match('index.html'))));
});
