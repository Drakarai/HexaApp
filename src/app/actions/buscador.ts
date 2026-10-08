"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant, getParticipants } from "@/lib/competition";
import { puedeVerLocke } from "@/lib/acceso";
import { getZonasParaElegir } from "@/lib/mapas";
import { regionesDelJuego } from "@/lib/juegos";

/** Algo a lo que saltar desde el buscador rápido (ver components/buscador-rapido.tsx) */
export type CosaBuscable = {
  tipo: "jugador" | "ruta" | "pokemon" | "baja";
  texto: string;
  detalle?: string;
  href: string;
  pokemonId?: number | null;
};

/**
 * Lo que el buscador rápido puede encontrar del locke que se está viendo,
 * **con la misma privacidad que el resto**: los jugadores y el cementerio son
 * de todos los que ven el locke; las rutas, de tu mapa, así que solo si
 * juegas; y los pokémon de la caja, solo los tuyos, salvo en un Soul Link,
 * donde la caja de todos está a la vista. Las pantallas no vienen de aquí:
 * las pone el menú, que ya sabe cuáles te tocan.
 */
export async function buscadorAction(): Promise<CosaBuscable[]> {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition || !(await puedeVerLocke(competition.id))) return [];

  const soulLink = competition.estilo === "soullink";
  const [jugadores, yo] = await Promise.all([
    getParticipants(competition.id),
    getMyParticipant(competition.id, user.id),
  ]);
  const [zonas, capturas, bajas] = await Promise.all([
    yo ? getZonasParaElegir(regionesDelJuego(competition.gameId)) : [],
    yo || soulLink
      ? prisma.capture.findMany({
          where: soulLink
            ? { participant: { competitionId: competition.id }, failed: false }
            : { participantId: yo!.id, failed: false },
          select: { id: true, species: true, nickname: true, pokemonId: true, deathId: true, participantId: true },
          take: 2000,
        })
      : [],
    prisma.death.findMany({
      where: { participant: { competitionId: competition.id } },
      select: { id: true, species: true, nickname: true, participantId: true },
      take: 2000,
    }),
  ]);

  const nombreDe = new Map(jugadores.map((j) => [j.id, j.displayName]));
  return [
    ...jugadores.map((j) => ({
      tipo: "jugador" as const,
      texto: j.displayName,
      detalle: `@${j.user.username}`,
      href: `/jugador/${j.id}`,
    })),
    ...zonas.map((z) => ({ tipo: "ruta" as const, texto: z.label, href: `/mapa?buscar=${encodeURIComponent(z.label.split(" › ").pop() ?? z.label)}` })),
    // Los vivos a su ficha del Equipo y PC; los caídos están en el cementerio
    ...capturas
      .filter((c) => !c.deathId)
      .map((c) => ({
        tipo: "pokemon" as const,
        texto: c.nickname || c.species,
        detalle: [c.nickname ? c.species : null, soulLink ? nombreDe.get(c.participantId) : null].filter(Boolean).join(" · "),
        href: `/equipo?ver=${c.id}`,
        pokemonId: c.pokemonId,
      })),
    ...bajas.map((b) => ({
      tipo: "baja" as const,
      texto: b.nickname || b.species,
      detalle: [b.nickname ? b.species : null, nombreDe.get(b.participantId)].filter(Boolean).join(" · "),
      href: `/muertes?jugador=${b.participantId}`,
    })),
  ];
}
