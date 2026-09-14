import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Pasar al almacén las imágenes que ya estaban escritas fila a fila.
 *
 * Va **en SQL a propósito**. Traerse las imágenes a Node para resumirlas y
 * volver a escribirlas serían cientos de megas de ida y vuelta contra una base
 * de datos que está en Fráncfort; así lo hace PostgreSQL donde están los datos
 * y por el cable solo viaja la cuenta de lo que ha movido.
 *
 * Es **repetible**: solo toca lo que empieza por `data:`, así que pasarlo dos
 * veces no hace nada la segunda. Y no borra nada: cambia la columna por la
 * referencia a una imagen que acaba de guardar.
 */

/** Las columnas que guardan una imagen suelta. */
const COLUMNAS: [tabla: string, columna: string][] = [
  ["MatchPokemon", "boxImage"],
  ["MatchPokemon", "detailImage"],
  ["Death", "boxImage"],
  ["Death", "detailImage"],
  ["Capture", "image"],
  ["SorteoPokemon", "boxImage"],
  ["Participant", "aceImage"],
  ["Participant", "aceDetailImage"],
  ["HallOfFameEntry", "image"],
  ["FavoritePokemon", "image"],
  ["LevelCap", "image"],
  ["MapRegion", "image"],
  ["User", "avatarImage"],
  // Los objetos no entran: hay un dibujo por objeto del catálogo, no uno por
  // uso, y la bolsa los pinta directamente desde la fila.
];

/** Y las que guardan una lista: las medallas. */
const LISTAS: [tabla: string, columna: string][] = [
  ["LevelCap", "images"],
  ["LevelCapTemplateItem", "images"],
];

export type ResultadoDelReparto = {
  /** Cuántas filas se han cambiado por una referencia */
  filas: number;
  /** Cuántas imágenes distintas hay guardadas al terminar */
  imagenes: number;
  /** Lo que ocupaban antes esas filas */
  antes: number;
  /** Lo que ocupa el almacén */
  ahora: number;
};

export async function deduplicarImagenes(): Promise<ResultadoDelReparto> {
  let filas = 0;
  let antes = 0;

  for (const [tabla, columna] of COLUMNAS) {
    const t = Prisma.raw(`"${tabla}"`);
    const c = Prisma.raw(`"${columna}"`);

    // Lo que ocupaban, antes de cambiarlas: después ya no se puede contar
    const pesa = await prisma.$queryRaw<{ total: bigint }[]>`
      select coalesce(sum(length(${c})), 0)::bigint as total
      from ${t} where ${c} like 'data:%'
    `;
    antes += Number(pesa[0]?.total ?? 0);

    // Cada imagen distinta, una sola vez
    await prisma.$executeRaw`
      insert into "Imagen" ("clave", "datos", "bytes", "createdAt")
      select distinct on (md5(${c})) 'h-' || md5(${c}), ${c}, length(${c}), now()
      from ${t} where ${c} like 'data:%'
      on conflict ("clave") do nothing
    `;

    // Y ahora las filas apuntan a ella
    filas += await prisma.$executeRaw`
      update ${t} set ${c} = 'ref:h-' || md5(${c}) where ${c} like 'data:%'
    `;
  }

  for (const [tabla, columna] of LISTAS) {
    const t = Prisma.raw(`"${tabla}"`);
    const c = Prisma.raw(`"${columna}"`);

    const pesa = await prisma.$queryRaw<{ total: bigint }[]>`
      select coalesce(sum(length(x)), 0)::bigint as total
      from ${t}, unnest(${c}) as x where x like 'data:%'
    `;
    antes += Number(pesa[0]?.total ?? 0);

    await prisma.$executeRaw`
      insert into "Imagen" ("clave", "datos", "bytes", "createdAt")
      select distinct on (md5(x)) 'h-' || md5(x), x, length(x), now()
      from ${t}, unnest(${c}) as x where x like 'data:%'
      on conflict ("clave") do nothing
    `;

    /**
     * Una lista se rehace entera: se recorre elemento a elemento cambiando solo
     * los que son una imagen, **y se respeta el orden**, que en las medallas es
     * el orden de los gimnasios.
     */
    filas += await prisma.$executeRaw`
      update ${t} set ${c} = (
        select array_agg(
          case when x like 'data:%' then 'ref:h-' || md5(x) else x end
          order by n
        )
        from unnest(${c}) with ordinality as t(x, n)
      )
      where exists (select 1 from unnest(${c}) as x where x like 'data:%')
    `;
  }

  /**
   * Y se le devuelve el espacio al disco.
   *
   * Sin esto, mover las imágenes no se nota: PostgreSQL marca como libre lo que
   * ocupaban las filas viejas pero **no encoge el fichero**, así que la tabla
   * sigue midiendo lo mismo y la cuenta de «cuántos lockes caben» saldría igual
   * de mala que antes. `VACUUM FULL` lo reescribe de verdad.
   *
   * Bloquea la tabla mientras lo hace, pero son segundos y esto es un botón que
   * se pulsa a sabiendas, no algo que pase solo mientras se juega.
   */
  if (filas) {
    for (const tabla of new Set([...COLUMNAS, ...LISTAS].map(([t]) => t))) {
      try {
        await prisma.$executeRawUnsafe(`vacuum full "${tabla}"`);
      } catch {
        // Si el servidor no deja, se queda el espacio libre para reusarlo
      }
    }
  }

  const [cuenta] = await prisma.$queryRaw<{ n: bigint; bytes: bigint }[]>`
    select count(*)::bigint as n, coalesce(sum("bytes"), 0)::bigint as bytes
    from "Imagen"
  `;

  return {
    filas,
    antes,
    imagenes: Number(cuenta?.n ?? 0),
    ahora: Number(cuenta?.bytes ?? 0),
  };
}

/**
 * Tirar las imágenes del almacén a las que ya no apunta nadie.
 *
 * Hace falta porque al borrar una baja o un sorteo la imagen se queda: no se
 * puede borrar con la fila, porque a lo mejor la están usando otras diez. Se
 * pasa la lista de columnas al revés y se tira lo que no aparece en ninguna.
 */
export async function tirarImagenesHuerfanas() {
  const usadas = [
    ...COLUMNAS.map(
      ([tabla, columna]) =>
        `select "${columna}" as v from "${tabla}" where "${columna}" like 'ref:%'`,
    ),
    ...LISTAS.map(
      ([tabla, columna]) =>
        `select x as v from "${tabla}", unnest("${columna}") as x where x like 'ref:%'`,
    ),
    /**
     * Y las que necesita una copia de seguridad guardada. Las copias ya no
     * llevan las imágenes dentro —las sacan de aquí al restaurarlas—, así que
     * tirar una que una copia necesita la dejaría coja para siempre.
     */
    `select 'ref:' || x as v from "Backup", unnest("imagenes") as x`,
  ].join(" union ");

  return prisma.$executeRawUnsafe(
    `delete from "Imagen"
     where 'ref:' || "clave" not in (select v from (${usadas}) as usadas)`,
  );
}
