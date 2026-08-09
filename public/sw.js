// Service worker mínimo. Su trabajo principal es hacer la app instalable;
// además guarda una página de cortesía para cuando no hay conexión.
// El contenido del locke siempre se pide al servidor: nunca se muestran
// puntos, muertes ni notas cacheados, que sería peor que no mostrar nada.

const CACHE = "hexaapp-v1";
const OFFLINE_URL = "/sin-conexion.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Solo interceptamos la navegación entre páginas
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (
        (await cache.match(OFFLINE_URL)) ??
        new Response("Sin conexión", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
