import "server-only";
import { prisma } from "@/lib/db";
import { getEquipoActual } from "@/lib/soul-link";

/**
 * El último equipo que alguien sacó en una jornada.
 *
 * Sirve para no tener que teclear en el hall de la fama seis pokémon que la
 * aplicación ya conoce: al terminar el locke, el equipo con el que llegaste al
 * final es casi siempre el de tu último combate.
 *
 * **Las imágenes se copian tal cual y no cuesta nada**: desde que existe el
 * almacén, lo que guarda la columna es una referencia (`ref:pkm-157-box`), así
 * que copiar la cadena apunta a la misma imagen sin duplicar bytes ni volver a
 * bajarla de internet.
 */

export type PokemonDelEquipo = {
  species: string;
  nickname: string | null;
  boxImage: string | null;
  detailImage: string | null;
};

export type UltimoEquipo = {
  /** De dónde sale: "Jornada 6" */
  deDonde: string;
  pokemon: PokemonDelEquipo[];
};

/**
 * Se miran los combates de jornada **y los Battle Royale**, que son los dos
 * sitios donde un equipo cuelga de una jornada. Gana el de la jornada más
 * avanzada; a igualdad, el royale, que es la jornada entera.
 */
export async function getUltimoEquipo(
  participantId: string,
  competitionId: string,
): Promise<UltimoEquipo | null> {
  /**
   * En un Soul Link no hay combates de jornada: el equipo con el que se acaba
   * es **el que se lleva ahora** en Equipo y PC.
   */
  const competicion = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { estilo: true },
  });
  if (competicion?.estilo === "soullink") return delEquipoYPc(participantId);

  /**
   * **Primero el de la final.** Si jugó el cuadro, ese es el equipo con el que
   * acabó el locke de verdad; el del último combate de jornada es lo que había
   * antes de que existiera esto y se queda de repuesto para quien no llegó a
   * la final.
   */
  const deLaFinal = await prisma.matchPokemon.findMany({
    where: { participantId, finalFour: { competitionId } },
    orderBy: { position: "asc" },
    select: {
      species: true,
      nickname: true,
      boxImage: true,
      detailImage: true,
    },
  });
  if (deLaFinal.length) {
    return { deDonde: "la final", pokemon: deLaFinal };
  }

  const filas = await prisma.matchPokemon.findMany({
    where: {
      participantId,
      OR: [
        { match: { matchday: { competitionId } } },
        { royale: { matchday: { competitionId } } },
      ],
    },
    orderBy: { position: "asc" },
    // Las imágenes se piden a propósito: aquí sí hacen falta, para copiarlas
    select: {
      species: true,
      nickname: true,
      boxImage: true,
      detailImage: true,
      matchId: true,
      royaleId: true,
      match: { select: { matchday: { select: { position: true, label: true } } } },
      royale: { select: { matchday: { select: { position: true, label: true } } } },
    },
  });
  // Sin combates con equipo (un solitario, o nadie los apuntó): el de la caja
  if (!filas.length) return delEquipoYPc(participantId);

  const jornadaDe = (fila: (typeof filas)[number]) =>
    fila.match?.matchday ?? fila.royale?.matchday ?? null;

  /** Los pokémon de un mismo combate van juntos; la clave es su contenedor. */
  const porCombate = new Map<
    string,
    { posicion: number; label: string; pokemon: PokemonDelEquipo[] }
  >();
  for (const fila of filas) {
    const jornada = jornadaDe(fila);
    if (!jornada) continue;
    const clave = fila.matchId ?? fila.royaleId!;
    if (!porCombate.has(clave)) {
      porCombate.set(clave, {
        posicion: jornada.position,
        label: jornada.label,
        pokemon: [],
      });
    }
    porCombate.get(clave)!.pokemon.push({
      species: fila.species,
      nickname: fila.nickname,
      boxImage: fila.boxImage,
      detailImage: fila.detailImage,
    });
  }

  const ultimo = [...porCombate.values()].sort(
    (a, b) => b.posicion - a.posicion,
  )[0];
  if (!ultimo?.pokemon.length) return delEquipoYPc(participantId);

  return { deDonde: ultimo.label, pokemon: ultimo.pokemon };
}

/** El equipo que lleva ahora en Equipo y PC, si lleva alguno */
async function delEquipoYPc(participantId: string): Promise<UltimoEquipo | null> {
  const equipo = await getEquipoActual(participantId);
  return equipo.length
    ? {
        deDonde: "Equipo y PC",
        pokemon: equipo.map((p) => ({
          species: p.species,
          nickname: p.nickname,
          boxImage: p.image,
          detailImage: null,
        })),
      }
    : null;
}
