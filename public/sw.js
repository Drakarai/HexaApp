// Service worker de HexaApp.
//
// Hace tres cosas:
//  1. Que la aplicación se pueda instalar (era lo único que hacía antes).
//  2. Que sin conexión se pueda **seguir viendo** lo último que se descargó,
//     en vez de una pantalla de cortesía.
//  3. Guardar los sprites y los mapas, que son inmutables y pesan, para que
//     esas pantallas guardadas se vean enteras y no llenas de huecos.
//
// Lo que NUNCA se guarda es lo que escribe: los envíos van por su cuenta y,
// si no hay línea, la propia aplicación los mete en su cola (ver lib/cola.ts).
// Aquí no se reintenta nada a espaldas de nadie.

const PAGINAS = "hexaapp-paginas-v1";
const IMAGENES = "hexaapp-imagenes-v1";
const BASICO = "hexaapp-basico-v1";
const OFFLINE_URL = "/sin-conexion.html";

const MIOS = [PAGINAS, IMAGENES, BASICO];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(BASICO).then((cache) => cache.addAll([OFFLINE_URL])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => !MIOS.includes(clave)).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Al cerrar sesión, la aplicación manda "limpiar": las pantallas guardadas
 * llevan dentro los datos de quien las vio, y en un móvil compartido no tienen
 * por qué quedarse ahí. Las imágenes no: son sprites públicos.
 */
self.addEventListener("message", (event) => {
  if (event.data?.tipo === "limpiar") {
    event.waitUntil(caches.delete(PAGINAS));
  }
});

/** Una pantalla de la aplicación, de las que hay que guardar tal cual. */
function esPantalla(request, url) {
  if (request.mode === "navigate") return true;
  // Al navegar por dentro, Next no pide el HTML: pide este trozo
  return url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
}

function esInmutable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/api/imagen/") ||
    url.pathname === "/guia-de-uso.pdf"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Lo que nunca cambia se sirve de lo guardado y se pide una sola vez. Los
  // sprites y los mapas llevan su firma en la dirección, así que si cambian,
  // cambia la dirección.
  if (esInmutable(url)) {
    event.respondWith(deLoGuardadoPrimero(request, url.pathname.startsWith("/_next/") ? BASICO : IMAGENES));
    return;
  }

  if (esPantalla(request, url)) {
    event.respondWith(deLaRedPrimero(request, url));
    return;
  }
});

async function deLoGuardadoPrimero(request, dondeGuardar) {
  const cache = await caches.open(dondeGuardar);
  const guardada = await cache.match(request, { ignoreVary: true });
  if (guardada) return guardada;

  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) cache.put(request, respuesta.clone());
    return respuesta;
  } catch (error) {
    // Sin conexión y sin copia: que la imagen salga rota es mejor que
    // tumbar la pantalla entera
    return new Response("", { status: 504, statusText: "Sin conexión" });
  }
}

/**
 * Las pantallas se piden **siempre al servidor primero**: mientras haya línea,
 * lo que se ve está al día, como hasta ahora. La copia solo entra en juego
 * cuando la petición falla, y entonces la aplicación avisa por dentro de que
 * eso es de la última vez (ver components/estado-conexion.tsx).
 */
async function deLaRedPrimero(request, url) {
  const cache = await caches.open(PAGINAS);
  // La clave es la dirección a secas: así el HTML y el trozo de Next de la
  // misma pantalla no se pisan, y las cabeceras Vary no estorban al buscar
  const clave = url.pathname + url.search;

  try {
    const respuesta = await fetch(request);
    // Guardar una redirección a /login dejaría la copia inservible
    if (respuesta.ok && respuesta.type !== "opaqueredirect") {
      cache.put(clave, respuesta.clone());
    }
    return respuesta;
  } catch (error) {
    const guardada = await cache.match(clave, { ignoreVary: true });
    if (guardada) return guardada;

    // Nunca se estuvo en esa pantalla: la de cortesía, y solo si es una
    // navegación de verdad (a un trozo de Next hay que contestarle un error
    // para que el navegador se vaya a recargar la página entera)
    if (request.mode === "navigate") {
      const basico = await caches.open(BASICO);
      const cortesia = await basico.match(OFFLINE_URL);
      if (cortesia) return cortesia;
    }
    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
