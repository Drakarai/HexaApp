import { prisma } from "@/lib/db";

/**
 * Cuánto ocupa la base de datos y en qué se va.
 *
 * Existe porque la pregunta «¿cuántos lockes caben?» no se puede contestar de
 * memoria: casi todo el peso son **imágenes guardadas como data URL** (sprites,
 * ilustraciones, mapas), y eso depende de cuánto haya apuntado la gente, no del
 * número de tablas. Aquí se mide sobre la base de datos de verdad.
 */

/** Lo que da Neon en el plan gratis. */
export const PLAN_GRATIS = 512 * 1024 * 1024;

export type Ocupacion = {
  /** Todo lo que ocupan las tablas de la aplicación, índices incluidos */
  total: number;
  /** Lo mismo sin las copias de seguridad, que van y vienen */
  sinCopias: number;
  /** Lo que ocupan las copias de seguridad guardadas dentro de la propia base */
  copias: number;
  /** Las tablas más gordas, de mayor a menor */
  tablas: { nombre: string; bytes: number }[];
  /** Cuánto pesan de verdad las imágenes, por columna */
  imagenes: { que: string; filas: number; media: number; total: number }[];
  /** La suma de todas las imágenes */
  totalImagenes: number;
  /** Cuántas competiciones hay guardadas ahora mismo */
  lockes: number;
};

/**
 * Las columnas que guardan imágenes. Va a mano y no leyendo el esquema porque
 * son cuatro y así se ve de un vistazo cuáles son las que engordan.
 */
const COLUMNAS: [tabla: string, columna: string, nombre: string][] = [
  ["MatchPokemon", "boxImage", "Equipos de combate · sprite"],
  ["MatchPokemon", "detailImage", "Equipos de combate · ilustración"],
  ["Death", "boxImage", "Cementerio · sprite"],
  ["Death", "detailImage", "Cementerio · ilustración"],
  ["Capture", "image", "Capturas del mapa"],
  ["SorteoPokemon", "boxImage", "Botes de sorteo"],
  ["MapRegion", "image", "Fondos de los mapas"],
  ["Participant", "aceImage", "Ases de los jugadores"],
  ["Participant", "aceDetailImage", "Ases · ilustración"],
  ["LevelCap", "image", "Medallas y líderes"],
  ["HallOfFameEntry", "image", "Hall de la fama"],
  ["FavoritePokemon", "image", "Favoritos"],
  ["User", "avatarImage", "Fotos de perfil"],
  ["Item", "image", "Objetos"],
  ["ItemOption", "image", "Objetos · variantes"],
];

export async function medirOcupacion(): Promise<Ocupacion> {
  const tablas = await prisma.$queryRaw<{ nombre: string; bytes: bigint }[]>`
    SELECT relname AS nombre, pg_total_relation_size(c.oid) AS bytes
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
  `;

  const medidas: Ocupacion["imagenes"] = [];
  for (const [tabla, columna, nombre] of COLUMNAS) {
    // Una consulta por columna: son pocas y así una tabla que falte no tira el resto
    try {
      const fila = await prisma.$queryRawUnsafe<
        { filas: bigint; media: number; total: bigint }[]
      >(
        `SELECT count("${columna}") AS filas,
                coalesce(avg(length("${columna}")), 0)::int AS media,
                coalesce(sum(length("${columna}")), 0)::bigint AS total
         FROM "${tabla}"`,
      );
      const filas = Number(fila[0]?.filas ?? 0);
      if (filas) {
        medidas.push({
          que: nombre,
          filas,
          media: Number(fila[0].media),
          total: Number(fila[0].total),
        });
      }
    } catch {
      // Una columna que ya no exista no debe romper la pantalla entera
    }
  }
  medidas.sort((a, b) => b.total - a.total);

  const lista = tablas.map((t) => ({ nombre: t.nombre, bytes: Number(t.bytes) }));
  const total = lista.reduce((suma, t) => suma + t.bytes, 0);
  const copias = lista.find((t) => t.nombre === "Backup")?.bytes ?? 0;

  return {
    total,
    copias,
    sinCopias: total - copias,
    tablas: lista.filter((t) => t.bytes > 0).slice(0, 8),
    imagenes: medidas,
    totalImagenes: medidas.reduce((suma, m) => suma + m.total, 0),
    lockes: await prisma.competition.count(),
  };
}

/** Bytes en algo que se pueda leer de un vistazo. */
export function pesar(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
