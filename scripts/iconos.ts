/**
 * Genera todos los iconos de la aplicación a partir del logo de `lib/logo.ts`.
 *
 *   npx tsx scripts/iconos.ts
 *
 * Saca:
 * - `src/app/icon.svg`: el de la pestaña del navegador (el logo solo, sin fondo).
 * - `src/app/favicon.ico`: el mismo en 16, 32 y 48, para quien pida el .ico.
 * - `public/icons/icon-192.png` e `icon-512.png`: para instalar la aplicación,
 *   sobre una baldosa oscura de esquinas redondeadas y **fondo transparente**
 *   fuera de ella (los de antes llevaban las esquinas en blanco).
 * - `public/icons/icon-maskable-512.png` y `src/app/apple-icon.png`: a sangre,
 *   sin esquinas, porque ahí es el móvil el que recorta la forma. El logo va
 *   más pequeño para que ningún recorte se lo coma.
 *
 * Se lanza a mano cuando cambia el logo; lo que genera se sube al repositorio.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { logoSvg } from "../src/lib/logo";

const FONDO_ARRIBA = "#1c1c26";
const FONDO_ABAJO = "#0b0b0e";

/** El logo, del tamaño pedido, sobre transparente */
function soloLogo(tamano: number) {
  return sharp(Buffer.from(logoSvg("l", tamano)), { density: 300 })
    .resize(tamano, tamano)
    .png()
    .toBuffer();
}

/**
 * La baldosa: fondo oscuro con un degradado muy suave y el logo en medio.
 * `radio` 0 es a sangre; `proporcion` es cuánto del lado ocupa el logo.
 */
async function baldosa(lado: number, radio: number, proporcion: number) {
  const fondo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
      <defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${FONDO_ARRIBA}"/><stop offset="1" stop-color="${FONDO_ABAJO}"/>
      </linearGradient></defs>
      <rect width="${lado}" height="${lado}" rx="${radio}" fill="url(#f)"/>
    </svg>`,
  );
  const tamano = Math.round(lado * proporcion);
  const logo = await soloLogo(tamano);
  const margen = Math.round((lado - tamano) / 2);
  return sharp(fondo)
    .composite([{ input: logo, top: margen, left: margen }])
    .png()
    .toBuffer();
}

/**
 * Un .ico con los PNG dentro, que es como lo guardan hoy todos los navegadores.
 * El formato es una cabecera, una entrada por tamaño y las imágenes seguidas.
 */
function ico(imagenes: { lado: number; png: Buffer }[]) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2); // 1 = icono
  cabecera.writeUInt16LE(imagenes.length, 4);

  let desplazamiento = 6 + 16 * imagenes.length;
  const entradas = imagenes.map(({ lado, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado >= 256 ? 0 : lado, 0);
    e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt8(0, 2); // sin paleta
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por píxel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(desplazamiento, 12);
    desplazamiento += png.length;
    return e;
  });
  return Buffer.concat([cabecera, ...entradas, ...imagenes.map((i) => i.png)]);
}

async function main() {
  // La pestaña: el SVG tal cual, que se ve nítido a cualquier tamaño
  writeFileSync("src/app/icon.svg", logoSvg("icono") + "\n");

  const pequenos = await Promise.all(
    [16, 32, 48].map(async (lado) => ({ lado, png: await soloLogo(lado) })),
  );
  writeFileSync("src/app/favicon.ico", ico(pequenos));

  writeFileSync("public/icons/icon-192.png", await baldosa(192, 42, 0.7));
  writeFileSync("public/icons/icon-512.png", await baldosa(512, 112, 0.7));
  // A sangre: el sistema recorta un círculo o una gota, y lo que vale es el 80 %
  // del centro, así que el logo va al 56 %
  writeFileSync("public/icons/icon-maskable-512.png", await baldosa(512, 0, 0.56));
  // El de iPhone va en src/app, donde Next lo enlaza solo como apple-icon
  writeFileSync("src/app/apple-icon.png", await baldosa(180, 0, 0.64));

  console.log("Iconos generados.");
}

main();
