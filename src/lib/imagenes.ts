import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  urlDeCartel,
  urlDeImagen,
  urlDeMedalla,
  urlDeMedallaDePlantilla,
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
  "salon-ficha": { tabla: "HallOfFameEntry", columna: "detailImage" },
  favorito: { tabla: "FavoritePokemon", columna: "image" },
  objeto: { tabla: "Item", columna: "image" },
  "objeto-opcion": { tabla: "ItemOption", columna: "image" },
  mapa: { tabla: "MapRegion", columna: "image" },
  captura: { tabla: "Capture", columna: "image" },
  sorteo: { tabla: "SorteoPokemon", columna: "boxImage" },
  logo: { tabla: "Competition", columna: "logo" },
  "logo-antes": { tabla: "LockeDeAntes", columna: "logo" },
} as const satisfies Record<
  // Fuera las que guardan una lista: esas tienen su propia consulta
  Exclude<TipoImagen, "medalla" | "medalla-plantilla" | "cartel">,
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
/**
 * La firma de una columna, en SQL.
 *
 * Si la fila apunta al almacén (`ref:...`) **la firma es la propia referencia**,
 * y de ahí sale una dirección por imagen en vez de una por fila. Si todavía
 * lleva la imagen entera —lo de antes—, se resume con md5 como siempre.
 *
 * De paso se ahorra el md5: resumir 35 KB por fila y por visita costaba lo suyo,
 * y sobre `ref:pkm-445-detail` no cuesta nada.
 */
function firmaSql(columna: string) {
  const col = `"${columna}"`;
  return Prisma.raw(
    `case
       when nullif(${col}, '') is null then null
       when ${col} like 'ref:%' then ${col}
       else substr(md5(${col}), 1, 10)
     end`,
  );
}

export async function firmasDeImagen(
  tipo: TipoConsultable,
  ids: string[],
): Promise<Map<string, string>> {
  const firmas = new Map<string, string>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return firmas;

  const { tabla, columna } = FUENTES[tipo];
  const filas = await prisma.$queryRaw<{ id: string; v: string }[]>`
    select "id", ${firmaSql(columna)} as v
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
 * Firmas de **dos columnas de la misma tabla en una sola consulta**.
 *
 * Cada consulta es un viaje de ida y vuelta a la base de datos, y contra una
 * base de datos en internet eso cuesta mucho más que la consulta en sí. Pedir
 * el sprite y la ilustración por separado eran dos viajes para el mismo dato.
 */
export async function firmasDeDosImagenes(
  tipoA: TipoConsultable,
  tipoB: TipoConsultable,
  ids: string[],
): Promise<[Map<string, string>, Map<string, string>]> {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return [a, b];

  const fuenteA = FUENTES[tipoA];
  const fuenteB = FUENTES[tipoB];
  if (fuenteA.tabla !== fuenteB.tabla) {
    throw new Error("Las dos columnas tienen que ser de la misma tabla.");
  }

  const filas = await prisma.$queryRaw<
    { id: string; va: string | null; vb: string | null }[]
  >`
    select "id",
           ${firmaSql(fuenteA.columna)} as va,
           ${firmaSql(fuenteB.columna)} as vb
    from ${Prisma.raw(`"${fuenteA.tabla}"`)}
    where "id" in (${Prisma.join(unicos)})
  `;

  for (const fila of filas) {
    if (fila.va) a.set(fila.id, fila.va);
    if (fila.vb) b.set(fila.id, fila.vb);
  }
  return [a, b];
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
      select case when x like 'ref:%' then x else substr(md5(x), 1, 10) end
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

/**
 * Las firmas de las medallas de un hito de plantilla. Es la misma consulta que
 * la de `LevelCap` pero más corta: aquí no hay `image` suelta de las primeras
 * versiones que resolver, porque la tabla nació con la lista.
 */
export async function firmasDeMedallasDePlantilla(
  ids: string[],
): Promise<Map<string, string[]>> {
  const firmas = new Map<string, string[]>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return firmas;

  const filas = await prisma.$queryRaw<{ id: string; v: string[] }[]>`
    select "id", array(
      select case when x like 'ref:%' then x else substr(md5(x), 1, 10) end
      from unnest("images") as x
    ) as v
    from "LevelCapTemplateItem"
    where "id" in (${Prisma.join(unicos)})
  `;
  for (const fila of filas) firmas.set(fila.id, fila.v);
  return firmas;
}

export async function urlsDeMedallasDePlantilla(ids: string[]) {
  const firmas = await firmasDeMedallasDePlantilla(ids);
  return (id: string) =>
    (firmas.get(id) ?? []).map(
      (firma, indice) => urlDeMedallaDePlantilla(id, indice, firma)!,
    );
}

/**
 * Las firmas del cartel del final, que vive en la competición. Mismo truco que
 * las medallas: la lista entera resumida por Postgres.
 */
export async function firmasDeCarteles(
  ids: string[],
): Promise<Map<string, string[]>> {
  const firmas = new Map<string, string[]>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return firmas;

  const filas = await prisma.$queryRaw<{ id: string; v: string[] }[]>`
    select "id", array(
      select case when x like 'ref:%' then x else substr(md5(x), 1, 10) end
      from unnest("finalImages") as x
    ) as v
    from "Competition"
    where "id" in (${Prisma.join(unicos)})
  `;
  for (const fila of filas) firmas.set(fila.id, fila.v);
  return firmas;
}

export async function urlsDeCarteles(ids: string[]) {
  const firmas = await firmasDeCarteles(ids);
  return (id: string) =>
    (firmas.get(id) ?? []).map(
      (firma, indice) => urlDeCartel(id, indice, firma)!,
    );
}

export async function urlsDeMedallas(ids: string[]) {
  const firmas = await firmasDeMedallas(ids);
  return (id: string) =>
    (firmas.get(id) ?? []).map(
      (firma, indice) => urlDeMedalla(id, indice, firma)!,
    );
}
