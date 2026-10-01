import "server-only";
import { prisma } from "@/lib/db";
import { puedeVerLocke } from "@/lib/acceso";
import { urlsDeImagen } from "@/lib/imagenes";
import { getEquipoActual } from "@/lib/soul-link";

export type PokemonDeLaFicha = { id: string; nombre: string; especie: string; imagen: string | null };

export type FichaRapida = {
  /** De dónde sale el equipo: "Jornada 4", "la final", "Equipo y PC" */
  equipoDe: string | null;
  equipo: PokemonDeLaFicha[];
  /** Las últimas bajas, de la más reciente a la más antigua */
  bajas: PokemonDeLaFicha[];
  as: { nombre: string; especie: string; imagen: string | null } | null;
};

const ULTIMAS_BAJAS = 4;

/**
 * Lo que sale al pasar el ratón por un jugador en la clasificación: su equipo,
 * sus últimas bajas y su as. **Solo lo que ya es público**: el equipo es el de
 * su último combate (o el de la final), nunca el de su Equipo y PC, que fuera
 * de un Soul Link es privado. Por eso no se usa `getUltimoEquipo`, que si no
 * hay combates tira de la caja (allí sí vale: lo usa el propio jugador).
 */
export async function getFichaRapida(participantId: string): Promise<FichaRapida> {
  const jugador = await prisma.participant.findUnique({
    where: { id: participantId },
    select: {
      competitionId: true,
      aceSpecies: true,
      aceNickname: true,
      competition: { select: { estilo: true } },
    },
  });
  if (!jugador || !(await puedeVerLocke(jugador.competitionId))) {
    throw new Error("No tienes acceso a este locke.");
  }
  const { competitionId } = jugador;

  const [equipos, bajas, urlDelAs] = await Promise.all([
    prisma.matchPokemon.findMany({
      where: {
        participantId,
        OR: [
          { finalFour: { competitionId } },
          { match: { matchday: { competitionId } } },
          { royale: { matchday: { competitionId } } },
        ],
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        species: true,
        nickname: true,
        finalFourId: true,
        matchId: true,
        royaleId: true,
        match: { select: { matchday: { select: { position: true, label: true } } } },
        royale: { select: { matchday: { select: { position: true, label: true } } } },
      },
    }),
    prisma.death.findMany({
      where: { participantId },
      orderBy: { diedAt: "desc" },
      take: ULTIMAS_BAJAS,
      select: { id: true, species: true, nickname: true },
    }),
    jugador.aceSpecies ? urlsDeImagen("as", [participantId]) : null,
  ]);

  // El último combate: primero la final, si la jugó; si no, la jornada más avanzada
  const deLaFinal = equipos.filter((p) => p.finalFourId);
  let equipo: typeof equipos = deLaFinal;
  let equipoDe: string | null = deLaFinal.length ? "la final" : null;
  if (!equipo.length) {
    const porCombate = new Map<string, { posicion: number; label: string; pokemon: typeof equipos }>();
    for (const p of equipos) {
      const jornada = p.match?.matchday ?? p.royale?.matchday;
      if (!jornada) continue;
      const clave = p.matchId ?? p.royaleId!;
      const grupo = porCombate.get(clave) ?? { posicion: jornada.position, label: jornada.label, pokemon: [] };
      grupo.pokemon.push(p);
      porCombate.set(clave, grupo);
    }
    const ultimo = [...porCombate.values()].sort((a, b) => b.posicion - a.posicion)[0];
    equipo = ultimo?.pokemon ?? [];
    equipoDe = ultimo?.label ?? null;
  }

  const [sprites, spritesDeBajas, enLaCaja] = await Promise.all([
    urlsDeImagen("equipo", equipo.map((p) => p.id)),
    urlsDeImagen("baja", bajas.map((b) => b.id)),
    // En un Soul Link la caja es de todos: sin combates, vale la de ahora
    !equipo.length && jugador.competition.estilo === "soullink" ? getEquipoActual(participantId) : null,
  ]);

  let pokemon: PokemonDeLaFicha[] = equipo.map((p) => ({
    id: p.id,
    nombre: p.nickname ?? p.species,
    especie: p.species,
    imagen: sprites(p.id),
  }));
  if (enLaCaja?.length) {
    const deLaCaja = await urlsDeImagen("captura", enLaCaja.map((c) => c.id));
    pokemon = enLaCaja.map((c) => ({
      id: c.id,
      nombre: c.nickname ?? c.species,
      especie: c.species,
      imagen: deLaCaja(c.id),
    }));
    equipoDe = "Equipo y PC";
  }

  return {
    equipoDe,
    equipo: pokemon,
    bajas: bajas.map((b) => ({
      id: b.id,
      nombre: b.nickname ?? b.species,
      especie: b.species,
      imagen: spritesDeBajas(b.id),
    })),
    as: jugador.aceSpecies
      ? {
          nombre: jugador.aceNickname ?? jugador.aceSpecies,
          especie: jugador.aceSpecies,
          imagen: urlDelAs?.(participantId) ?? null,
        }
      : null,
  };
}
