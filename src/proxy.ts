import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_DE_SESION,
  RENOVAR_CADA,
  firmarSesion,
  leerSesion,
  opcionesDeLaCookie,
} from "@/lib/sesion-token";
import { CABECERA_DE_RUTA } from "@/lib/volver";

/**
 * Corre antes que cualquier pantalla o acción, y hace dos cosas:
 *
 * 1. **Estirar la sesión de quien sigue entrando.** Antes duraba 30 días desde
 *    que se inició, se usara o no, así que a cada uno le echaba un día
 *    cualquiera a mitad de locke. Ahora caduca a los 30 días **sin entrar**.
 *
 * 2. **Apuntar qué pantalla se pidió.** Las páginas no saben en qué dirección
 *    están, y sin eso el que llega por un enlace sin sesión acababa en la
 *    portada después de entrar en vez de donde iba.
 *
 * No decide quién entra: eso lo sigue haciendo cada página y cada acción.
 */
export async function proxy(request: NextRequest) {
  const ruta = new URL(request.nextUrl);
  // El trozo que pide Next al navegar por dentro lleva esto; la pantalla no
  ruta.searchParams.delete("_rsc");

  const cabeceras = new Headers(request.headers);
  cabeceras.set(CABECERA_DE_RUTA, ruta.pathname + ruta.search);
  const respuesta = NextResponse.next({ request: { headers: cabeceras } });

  const token = request.cookies.get(COOKIE_DE_SESION)?.value;
  if (token) {
    const leida = await leerSesion(token);
    const ahora = Math.floor(Date.now() / 1000);
    if (leida && ahora - leida.firmadaEn >= RENOVAR_CADA) {
      respuesta.cookies.set(
        COOKIE_DE_SESION,
        await firmarSesion(leida.sesion),
        opcionesDeLaCookie,
      );
    }
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Fuera lo que no es una pantalla ni una acción: lo de Next, las imágenes,
    // el service worker y los ficheros sueltos de public
    "/((?!_next/static|_next/image|api/imagen|sw\\.js|icons/|favicon\\.ico|icon\\.svg|manifest\\.webmanifest|sin-conexion\\.html|.*\\.pdf$).*)",
  ],
};
