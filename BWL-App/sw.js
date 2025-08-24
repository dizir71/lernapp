const CACHE='bwl-cache-v3';
const ASSETS=[
  './','./index.html','./app.js','./manifest.json',
  './questions_all_completed_marked.json',
  './external_teacher_questions_marked.json'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });

