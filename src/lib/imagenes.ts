import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  urlDeImagen,
  urlDeMedalla,
  type TipoImagen,
} from "@/lib/imagen-url";

/**
 * De dónde sale cada tipo de imagen. Es una lista cerrada a propósito: el
 * nombre de la tabla y de la columna se meten tal cual en el SQL, así que solo
 * pueden salir de aquí.
 */
export const FUENTES = {
  avatar: { tabla: "User", columna: "avatarImage" },
  as: { tabla: "Participant", columna: "aceImage" },
  "as-ficha": { tabla: "Participant", columna: "aceDetailImage" },
  baja: { tabla: "Death", columna: "boxImage" },
  "baja-ficha": { tabla: "Death", columna: "detailImage" },
  equipo: { tabla: "MatchPokemon", columna: "boxImage" },
  "equipo-ficha": { tabla: "MatchPokemon", columna: "detailImage" },
  salon: { tabla: "HallOfFameEntry", columna: "image" },
  favorito: { tabla: "FavoritePokemon", columna: "image" },
} as const satisfies Record<
  Exclude<TipoImagen, "medalla">,
  { tabla: string; columna: string }
>;

export type TipoConsultable = keyof typeof FUENTES;

/**
 * Firma de cada imagen: un resumen corto de su contenido.
 *
 * El truco está en que el resumen lo calcula PostgreSQL, así que por el cable
 * vuelven 10 caracteres por fila en vez de los 13-44 KB de la imagen. Con eso
 * sabemos a la vez si hay imagen y qué versión es.
 */
export async function firmasDeImagen(
  tipo: TipoConsultable,
  ids: string[],
): Promise<Map<string, string>> {
  const firmas = new Map<string, string>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return firmas;

  const { tabla, columna } = FUENTES[tipo];
  const filas = await prisma.$queryRaw<{ id: string; v: string }[]>`
    select "id", substr(md5(${Prisma.raw(`"${columna}"`)}), 1, 10) as v
    from ${Prisma.raw(`"${tabla}"`)}
    where "id" in (${Prisma.join(unicos)})
      and ${Prisma.raw(`"${columna}"`)} is not null
      and ${Prisma.raw(`"${columna}"`)} <> ''
  `;
  for (const fila of filas) firmas.set(fila.id, fila.v);
  return firmas;
}

/** Atajo para cuando solo hace falta una fila. */
export async function firmaDeImagen(tipo: TipoConsultable, id: string) {
  return (await firmasDeImagen(tipo, [id])).get(id) ?? null;
}

/**
 * Igual pero para las medallas de un level cap, que son una lista. Devuelve
 * una firma por imagen, ya resuelta la lista efectiva (la nueva `images` y, si
 * está vacía, la `image` suelta de las primeras versiones).
 */
export async function firmasDeMedallas(
  ids: string[],
): Promise<Map<string, string[]>> {
  const firmas = new Map<string, string[]>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return firmas;

  const filas = await prisma.$queryRaw<{ id: string; v: string[] }[]>`
    select "id", array(
      select substr(md5(x), 1, 10)
      from unnest(
        case when coalesce(array_length("images", 1), 0) = 0
          then array_remove(array["image"], null)
          else "images"
        end
      ) as x
    ) as v
    from "LevelCap"
    where "id" in (${Prisma.join(unicos)})
  `;
  for (const fila of filas) firmas.set(fila.id, fila.v);
  return firmas;
}

/**
 * Ayudante de un solo uso: pide las firmas y devuelve directamente las
 * direcciones, que es lo que casi siempre quiere la página.
 */
export async function urlsDeImagen(tipo: TipoConsultable, ids: string[]) {
  const firmas = await firmasDeImagen(tipo, ids);
  return (id: string) => urlDeImagen(tipo, id, firmas.get(id));
}

export async function urlsDeMedallas(ids: string[]) {
  const firmas = await firmasDeMedallas(ids);
  return (id: string) =>
    (firmas.get(id) ?? []).map(
      (firma, indice) => urlDeMedalla(id, indice, firma)!,
    );
}
