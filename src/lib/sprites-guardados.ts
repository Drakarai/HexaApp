import "server-only";
import sharp from "sharp";
import { guardar, referenciaA, resolverImagen, yaGuardada } from "@/lib/almacen-de-imagenes";
import { objetoPorSlug, origenDeObjeto } from "@/lib/objetos";
import { spriteCandidates } from "@/lib/pokedex";
import { spriteDeEspecie } from "@/lib/sprites-servidor";
import { CLASES_DE_SPRITE, ORIGEN_BW, ORIGEN_ICONOS, type ClaseDeSprite } from "@/lib/sprites-de-quinta";

/**
 * Los sprites de PokéAPI que se ven por toda la app (los de Blanco y Negro,
 * quietos y animados; los iconos de Espada y Escudo; el render de HOME de una
 * mega; la vista previa del buscador; los dibujos de los objetos), **bajados
 * una sola vez** y servidos desde aquí, como las imágenes de las capturas.
 *
 * Antes cada navegador se los pedía a GitHub, uno por uno, y además recortaba
 * en un lienzo los quietos y los iconos en cada visita (salían un instante
 * invisibles mientras tanto). Ahora el primero que pide uno hace que el
 * servidor lo baje, lo **deje ya recortado** y lo guarde en el almacén
 * (`spr-…`); los demás se lo llevan del almacén, o directamente de la red de
 * Vercel, que lo guarda para siempre (ver `/api/sprite`). Si GitHub se cae,
 * lo que ya se ha visto una vez se sigue viendo.
 */

/** Si GitHub no contesta en este tiempo, mejor que el navegador pruebe lo siguiente */
const TIEMPO_LIMITE = 8000;

async function bajar(url: string) {
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIEMPO_LIMITE), cache: "no-store" });
    if (!respuesta.ok) return null;
    return Buffer.from(await respuesta.arrayBuffer());
  } catch {
    return null;
  }
}

/** Lado mínimo de un icono recortado: el de `LADO_MINIMO_DE_ICONO` que tenía el navegador */
const LADO_MINIMO_DE_ICONO = 26;

/**
 * Recortado a lo que se ve, con 2 píxeles de margen y cuadrado: el sprite de
 * Blanco y Negro va en un lienzo de 96 en el que el pokémon ocupa a veces un
 * tercio, y en una casilla salía diminuto. Es lo que antes hacía el navegador
 * con un lienzo en cada visita. Sin tocar un píxel (PNG sin pérdida).
 */
async function recortado(original: Buffer, ladoMinimo: number) {
  const imagen = sharp(original).ensureAlpha();
  const { data, info } = await imagen.raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const ancho = x1 - x0 + 1;
  const alto = y1 - y0 + 1;
  const lado = Math.max(ancho + 4, alto + 4, ladoMinimo);
  const izquierda = Math.round((lado - ancho) / 2);
  const arriba = Math.round((lado - alto) / 2);
  return sharp(original)
    .ensureAlpha()
    .extract({ left: x0, top: y0, width: ancho, height: alto })
    .extend({
      left: izquierda,
      right: lado - ancho - izquierda,
      top: arriba,
      bottom: lado - alto - arriba,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function aDataUrl(bytes: Buffer, tipo: string) {
  return `data:${tipo};base64,${bytes.toString("base64")}`;
}

/** La imagen de un sprite de esa clase, recién bajada y preparada; null si no existe */
async function preparar(clase: ClaseDeSprite, id: string, shiny: boolean): Promise<string | null> {
  const n = Number(id);
  const variocolor = shiny ? "shiny/" : "";
  switch (clase) {
    case "bw": {
      const png = await bajar(`${ORIGEN_BW}/${variocolor}${n}.png`);
      return png ? aDataUrl(png, "image/png") : null;
    }
    case "bw-recorte": {
      const png = await bajar(`${ORIGEN_BW}/${variocolor}${n}.png`);
      const hecho = png ? await recortado(png, 0) : null;
      return hecho ? aDataUrl(hecho, "image/png") : null;
    }
    case "bw-animado": {
      const gif = await bajar(`${ORIGEN_BW}/animated/${variocolor}${n}.gif`);
      return gif ? aDataUrl(gif, "image/gif") : null;
    }
    case "icono": {
      const png = await bajar(`${ORIGEN_ICONOS}/${n}.png`);
      const hecho = png ? await recortado(png, LADO_MINIMO_DE_ICONO) : null;
      return hecho ? aDataUrl(hecho, "image/png") : null;
    }
    case "mini": {
      // El sprite pequeño de siempre y, si no hay (formas recientes), lo siguiente que haya, en pequeño
      for (const url of spriteCandidates(n, shiny, "mini")) {
        const original = await bajar(url);
        if (!original) continue;
        const pequeno = await sharp(original)
          .resize(96, 96, { fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9 })
          .toBuffer();
        return aDataUrl(pequeno, "image/png");
      }
      return null;
    }
    case "objeto": {
      const png = await bajar(origenDeObjeto(id));
      return png ? aDataUrl(png, "image/png") : null;
    }
    case "home":
      // Este ya lo guarda el almacén al apuntar una captura: es el mismo (`pkm-…-box`)
      return null;
  }
}

/** Qué se puede pedir: números de pokémon, y objetos que existen y no son de Añil (esos van en public/) */
export function esPeticionValida(clase: string, id: string): clase is ClaseDeSprite {
  if (!(CLASES_DE_SPRITE as readonly string[]).includes(clase)) return false;
  if (clase === "objeto") return /^[a-z0-9-]+$/.test(id) && !id.startsWith("anil-") && Boolean(objetoPorSlug(id));
  const n = Number(id);
  return Number.isInteger(n) && n > 0 && n < 20000;
}

/**
 * El sprite, del almacén o bajándolo la primera vez. Devuelve la data URL, o
 * null si no existe (hay formas sin icono, o sin animado).
 */
export async function spriteGuardado(clase: ClaseDeSprite, id: string, shiny: boolean): Promise<string | null> {
  if (clase === "home") {
    const referencia = await spriteDeEspecie(Number(id), shiny, "box");
    return resolverImagen(referencia);
  }
  const clave = `spr-${clase}-${shiny ? "s-" : ""}${id}`;
  if (await yaGuardada(clave)) return resolverImagen(referenciaA(clave));
  const hecho = await preparar(clase, id, shiny);
  if (!hecho) return null;
  await guardar(clave, hecho);
  return hecho;
}
