// Service Worker mínimo para PWA (Cardinal)
const CACHE='gymquest-v1';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch',e=>{
  // cache-first para estáticos, network para API
  if(e.request.url.includes('/api/')) return;
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(resp=>{c.put(e.request,resp.clone());return resp;}))));
});
