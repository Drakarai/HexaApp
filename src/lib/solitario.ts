import "server-only";
import { prisma } from "@/lib/db";
import { LEVEL_CAP_KINDS } from "@/lib/constants";

/**
 * Cómo va una partida en solitario.
 *
 * Un locke de una persona no tiene clasificación, así que la portada no puede
 * enseñar una tabla: lo que se quiere ver es **cómo va la run**. Cuántos hitos
 * llevas, cuál es el siguiente, cuántos pokémon has perdido y por cuánto mapa
 * has pasado.
 *
 * Todo sale de lo que ya se apunta —los level caps, la caja y las capturas—, así
 * que no hay ningún dato nuevo que mantener.
 */

export type ProgresoEnSolitario = {
  participantId: string;
  displayName: string;
  /** Hitos superados y cuántos hay en total */
  hitos: { hechos: number; total: number };
  /** El siguiente que le toca, si queda alguno */
  siguiente: { label: string; cap: number; notes: string | null } | null;
  caidos: number;
  /** Zonas del mapa donde ha apuntado algo, y cuántas hay */
  zonas: { visitadas: number; total: number };
  /** Si ya se ha pasado la Liga: en solitario, eso es ganar el locke */
  ligaSuperada: boolean;
};

export async function getProgresoEnSolitario(
  competitionId: string,
): Promise<ProgresoEnSolitario | null> {
  const jugador = await prisma.participant.findFirst({
    where: { competitionId },
    orderBy: { joinedAt: "asc" },
    select: { id: true, displayName: true },
  });
  if (!jugador) return null;

  const [hitos, caidos, capturas, zonasDeSuRegion] = await Promise.all([
    prisma.levelCap.findMany({
      where: { competitionId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        label: true,
        cap: true,
        kind: true,
        notes: true,
        clears: { where: { participantId: jugador.id }, select: { id: true } },
      },
    }),
    prisma.death.count({ where: { participantId: jugador.id } }),
    prisma.capture.findMany({
      where: { participantId: jugador.id },
      select: { zoneId: true },
    }),
    // Las zonas de las regiones que se juegan en esta edición
    prisma.mapZone.count({
      where: {
        // Los trozos de una ruta partida son la misma ruta: no cuentan aparte
        trozoDeId: null,
        region: {
          zones: { some: { captures: { some: { participantId: jugador.id } } } },
        },
      },
    }),
  ]);

  const superados = hitos.filter((hito) => hito.clears.length);
  const siguiente = hitos.find((hito) => !hito.clears.length) ?? null;

  return {
    participantId: jugador.id,
    displayName: jugador.displayName,
    hitos: { hechos: superados.length, total: hitos.length },
    siguiente: siguiente
      ? { label: siguiente.label, cap: siguiente.cap, notes: siguiente.notes }
      : null,
    caidos,
    zonas: {
      visitadas: new Set(
        capturas.map((captura) => captura.zoneId).filter(Boolean),
      ).size,
      total: zonasDeSuRegion,
    },
    ligaSuperada: superados.some(
      (hito) => hito.kind === LEVEL_CAP_KINDS.CHAMPION,
    ),
  };
}
