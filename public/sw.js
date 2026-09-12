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

// La versión va en el nombre: al subirla, el service worker nuevo tira lo que
// guardó el anterior y empieza limpio. Se sube **siempre** que cambie la forma
// de guardar, para no heredar copias hechas con otras reglas.
const VERSION = "v2";
const PAGINAS = `hexaapp-paginas-${VERSION}`;
const IMAGENES = `hexaapp-imagenes-${VERSION}`;
const BASICO = `hexaapp-basico-${VERSION}`;
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
  // Un service worker roto es pegajoso: se queda mandando aunque la aplicación
  // se arregle. Este mensaje es la salida de emergencia (ver Mi perfil).
  if (event.data?.tipo === "rendirse") {
    event.waitUntil(
      caches
        .keys()
        .then((claves) => Promise.all(claves.map((clave) => caches.delete(clave))))
        .then(() => self.registration.unregister()),
    );
    return;
  }

  if (event.data?.tipo === "limpiar") {
    event.waitUntil(caches.delete(PAGINAS));
  }
  /**
   * Guardar de antemano las pantallas del menú, con conexión.
   *
   * Sin esto, sin línea solo se veía lo que se hubiera abierto **en ese
   * momento**: si alguien entra, mira la portada y luego se mete en el metro,
   * el resto de la aplicación no existe. Así, con abrirla una vez al día
   * teniendo cobertura, se lleva todo encima.
   */
  if (event.data?.tipo === "precalentar" && Array.isArray(event.data.rutas)) {
    event.waitUntil(precalentar(event.data.rutas));
  }
});

async function precalentar(rutas) {
  const cache = await caches.open(PAGINAS);
  // De una en una y no todas a la vez: son consultas de verdad contra la base
  // de datos, y esto pasa de fondo sin que nadie lo esté esperando
  for (const ruta of rutas.slice(0, 20)) {
    if (typeof ruta !== "string" || !ruta.startsWith("/")) continue;
    try {
      const respuesta = await fetch(ruta, { credentials: "same-origin" });
      if (respuesta.ok) await cache.put(ruta, respuesta.clone());
    } catch {
      // Se fue la línea a mitad: lo que haya entrado, entrado está
      return;
    }
  }
}

/**
 * Una pantalla de la aplicación: **solo las cargas de página enteras**.
 *
 * Al navegar por dentro, Next no pide el HTML sino un trozo suyo (`?_rsc=`), y
 * esos **no se tocan a propósito**, por dos motivos:
 *
 * - Guardarlos no vale: hay trozos de "adelanto" a medias que, servidos como
 *   si fueran la pantalla entera, la dejan rota.
 * - Contestarles cualquier cosa sin conexión —hasta un error— es peor que no
 *   contestar: Next tiene su propio plan B (recargar la página entera, que sí
 *   sabemos servir de lo guardado) y solo lo usa cuando la petición **falla de
 *   verdad**. Contestándole un 503 se le quitaba ese plan B, y por eso al
 *   principio no se podía cambiar de pestaña sin línea.
 */
function esPantalla(request) {
  return request.mode === "navigate";
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

  if (esPantalla(request)) {
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
    /**
     * Lo que acabó en otra dirección no se guarda: pedir /mapa sin sesión
     * acaba en /login, y guardar eso como si fuera el mapa haría que sin
     * conexión saliera la pantalla de entrada en su sitio.
     */
    if (respuesta.ok && !respuesta.redirected && respuesta.type !== "opaqueredirect") {
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
