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

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
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
