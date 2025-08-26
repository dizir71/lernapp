const CACHE = "bwl-v8";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith(".json")) {
    event.respondWith(fetch(event.request, {cache:"reload"}));
    return;
  }
  // … dein bestehendes Caching für HTML/CSS/JS/Icons …
});
