import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La huella de un PDF de `public/`: un trozo del hash de su contenido.
 *
 * Va en la dirección de las guías (`/guia-de-uso.pdf?v=…`) porque el service
 * worker las guarda para leerlas sin conexión, y con la dirección de siempre
 * quien la había abierto una vez se quedaba con la vieja para siempre. Así,
 * cada vez que se sube un PDF distinto cambia su dirección sola, sin tener
 * que acordarse de nada.
 */
function huella(fichero: string) {
  try {
    return createHash("sha256")
      .update(readFileSync(join(process.cwd(), "public", fichero)))
      .digest("hex")
      .slice(0, 10);
  } catch {
    return "0";
  }
}

/**
 * Las cabeceras de seguridad de todas las respuestas. Ninguna cambia lo que se
 * ve; cierran puertas que la aplicación no usa:
 *
 * - **Que nadie la meta en un marco de otra web** (`frame-ancestors`): la
 *   trampa de poner la app invisible encima de otra página y que se pulse sin
 *   querer. Ella misma sí puede (la guía se ve en un `<object>` en el
 *   ordenador), por eso es `'self'` y no `'none'`.
 * - `object-src 'self'`: el visor de la guía sigue funcionando, y no se cuela
 *   un `<object>` de fuera. `base-uri` y `form-action`, que los formularios
 *   solo puedan mandar aquí.
 * - `nosniff`: el navegador no adivina el tipo de un fichero (una imagen
 *   subida no se puede hacer pasar por un script).
 * - El `Referer` sale sin la ruta al ir a otra web: el enlace de la
 *   clasificación pública no se filtra por un vídeo de YouTube.
 * - Sin cámara, micrófono, ubicación ni pagos: la app no los usa, y así
 *   ningún contenido incrustado los puede pedir.
 * - HSTS: siempre por https, también si alguien escribe la dirección sin él.
 *
 * Sin `script-src` a propósito: Next mete scripts en línea, y cerrarlos de
 * verdad pide un nonce en cada página. Lo que más protege de eso —que nada de
 * lo que escribe la gente se pinte como HTML— ya lo hace React.
 */
const CABECERAS_DE_SEGURIDAD = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'self'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Que no se anuncie con qué está hecha
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_DE_SEGURIDAD }];
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  /**
   * Las letras de la imagen del resumen del locke se leen del disco al
   * dibujarla. Sin decírselo, al desplegar no viajarían con esa ruta: Next solo
   * se lleva los ficheros que ve importados.
   */
  outputFileTracingIncludes: {
    "/api/resumen/[id]": [
      "./node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff",
      "./node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff",
    ],
    "/api/pokemon/[id]": [
      "./node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff",
      "./node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff",
    ],
  },
  env: {
    HUELLA_GUIA_USO: huella("guia-de-uso.pdf"),
    HUELLA_GUIA_ADMIN: huella("guia-de-administrador.pdf"),
  },
  experimental: {
    serverActions: {
      // Las imágenes viajan como data URL dentro del formulario
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
