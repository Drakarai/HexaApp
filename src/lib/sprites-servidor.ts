import "server-only";
import sharp from "sharp";
import { spriteCandidates } from "@/lib/pokedex";
import { spriteDeObjeto } from "@/lib/objetos";
import { IMAGE_SIZES } from "@/lib/image";
import {
  claveDeSprite,
  guardar,
  referenciaA,
  yaGuardada,
} from "@/lib/almacen-de-imagenes";

/**
 * Descarga y reduce los sprites de un pokémon **en el servidor**.
 *
 * Antes lo hacía el navegador: por cada pokémon se bajaba de GitHub el render
 * de Pokémon HOME y la ilustración oficial (unos 110 KB cada uno), los
 * redimensionaba con canvas y mandaba 57 KB de base64 al guardar. En un móvil
 * eso son varios segundos por bicho, y apuntar un equipo son seis seguidos.
 *
 * Desde el servidor la descarga va de centro de datos a centro de datos y el
 * navegador solo manda el número de la especie. Las imágenes se siguen
 * guardando como copia propia, igual que antes.
 */

/** Si GitHub no contesta en este tiempo, se guarda sin imagen y a otra cosa. */
const TIEMPO_LIMITE = 8000;

async function bajarPrimeraQueExista(urls: string[]) {
  for (const url of urls) {
    try {
      const respuesta = await fetch(url, {
        signal: AbortSignal.timeout(TIEMPO_LIMITE),
        // Las imágenes de PokéAPI no cambian nunca
        cache: "force-cache",
      });
      if (!respuesta.ok) continue;
      return Buffer.from(await respuesta.arrayBuffer());
    } catch {
      // se prueba la siguiente dirección
    }
  }
  return null;
}

async function aWebp(origen: Buffer, maximo: number) {
  const salida = await sharp(origen)
    .resize(maximo, maximo, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return `data:image/webp;base64,${salida.toString("base64")}`;
}

export type SpritesDescargados = {
  boxImage: string | null;
  detailImage: string | null;
};

/**
 * Sprite de caja e ilustración de un pokémon, ya reducidos y listos para
 * guardar. Devuelve null en los que no se hayan podido conseguir: es mejor
 * apuntar el pokémon sin imagen que no dejar apuntarlo.
 */
export async function descargarSprites(
  pokemonId: number,
  shiny: boolean,
): Promise<SpritesDescargados> {
  const [boxImage, detailImage] = await Promise.all([
    spriteDeEspecie(pokemonId, shiny, "box"),
    spriteDeEspecie(pokemonId, shiny, "detail"),
  ]);

  return { boxImage, detailImage };
}

/**
 * Un sprite de una especie, **descargado como mucho una vez en la vida de la
 * aplicación**.
 *
 * El sprite de Garchomp es el mismo para todo el mundo y no cambia nunca, así
 * que la segunda vez que alguien lo apunta no hay que volver a cruzar hasta
 * GitHub ni volver a pasarlo por sharp: ya está en el almacén y lo que se
 * devuelve es la referencia. Apuntar un equipo de seis pasa de seis descargas
 * a ninguna en cuanto el grupo lleva un rato jugando.
 */
async function spriteDeEspecie(
  pokemonId: number,
  shiny: boolean,
  tipo: "box" | "detail",
): Promise<string | null> {
  const clave = claveDeSprite(pokemonId, shiny, tipo);
  if (await yaGuardada(clave)) return referenciaA(clave);

  const original = await bajarPrimeraQueExista(
    spriteCandidates(pokemonId, shiny, tipo),
  );
  if (!original) return null;

  const dataUrl = await aWebp(
    original,
    tipo === "box" ? IMAGE_SIZES.box : IMAGE_SIZES.detail,
  );
  return guardar(clave, dataUrl);
}

/**
 * El dibujo de un objeto de la bolsa, ya reducido y listo para guardar.
 *
 * Se baja aquí y se guarda como copia propia por lo mismo que los pokémon: son
 * un kilobyte cada uno y así la bolsa se pinta aunque GitHub esté caído. Si no
 * se puede bajar se guarda sin dibujo, que es mejor que no dejar crear el
 * objeto.
 */
/**
 * No pasa por el almacén: del dibujo de un objeto ya hay **uno por objeto del
 * catálogo**, no uno por uso, así que no hay nada que deduplicar. Y la bolsa lo
 * pinta directamente desde la fila, sin pasar por `/api/imagen`.
 */
export async function descargarSpriteDeObjeto(slug: string) {
  const original = await bajarPrimeraQueExista([spriteDeObjeto(slug)]);
  return original ? aWebp(original, IMAGE_SIZES.objeto) : null;
}

/**
 * Lee del formulario lo que haga falta para poner las imágenes de un pokémon.
 *
 * Hay dos vías y conviven: el buscador de especie manda el número del pokémon
 * y aquí se descargan; los formularios manuales (la ficha del cementerio)
 * siguen mandando las imágenes ellos, y entonces no se toca nada.
 */
export async function spritesDelFormulario(formData: FormData) {
  const bruto = String(formData.get("pokemonId") ?? "").trim();
  const pokemonId = Number(bruto);
  if (!bruto || !Number.isFinite(pokemonId) || pokemonId <= 0) return null;

  return descargarSprites(pokemonId, formData.get("shiny") === "on");
}
