import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { estadoDeVidas, type EstadoDeVidas } from "@/lib/vidas";
import { MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { resolverRetiradas } from "@/lib/retiradas";
import { registrar } from "@/lib/registro";

/** Las bajas que cuentan como vida perdida: las del cementerio sin revivir */
const BAJAS_QUE_CUENTAN = { revividoEl: null } as const;

/** Cómo va de vidas cada jugador de un locke; vacío si el locke no va con vidas */
export async function vidasDelLocke(competitionId: string): Promise<Map<string, EstadoDeVidas>> {
  const locke = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { vidas: true, vidaCero: true },
  });
  if (!locke?.vidas) return new Map();
  const [jugadores, bajas] = await Promise.all([
    prisma.participant.findMany({ where: { competitionId }, select: { id: true } }),
    prisma.death.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId }, ...BAJAS_QUE_CUENTAN },
      _count: { _all: true },
    }),
  ]);
  const cuantas = new Map(bajas.map((b) => [b.participantId, b._count._all]));
  return new Map(jugadores.map((j) => [j.id, estadoDeVidas(locke, cuantas.get(j.id) ?? 0)!]));
}

/**
 * Se llama **cada vez que cambian las bajas de alguien** (apuntar, borrar,
 * revivir, deshacer). Si se ha quedado sin vidas, pierde el locke solo; y si
 * las recupera (se borró una baja apuntada por error, revivió uno), vuelve,
 * pero solo si estaba fuera **por esto**: a quien se retiró o perdió por
 * wipeo no se le toca.
 *
 * Sacarle solo pasa en un locke de varios que compiten. En solitario y en un
 * Soul Link no hay nadie contra quien seguir: el contador avisa y ya.
 *
 * Devuelve cómo ha quedado, para decirlo al apuntar la baja.
 */
export async function comprobarVidas(participantId: string): Promise<EstadoDeVidas | null> {
  const jugador = await prisma.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      displayName: true,
      retiredAt: true,
      motivoDeSalida: true,
      competitionId: true,
      competition: { select: { vidas: true, vidaCero: true, maxPlayers: true, estilo: true } },
    },
  });
  if (!jugador) return null;
  const { competition: locke } = jugador;
  const bajas = await prisma.death.count({ where: { participantId, ...BAJAS_QUE_CUENTAN } });
  const estado = estadoDeVidas(locke, bajas);
  // Sin vidas en el locke y fuera por ellas (se quitaron después): vuelve
  const fueraPorVidas = jugador.retiredAt && jugador.motivoDeSalida === MOTIVOS_DE_SALIDA.VIDAS;

  const perfil = perfilDeLocke(locke.maxPlayers, locke.estilo);
  const compiten = !perfil.enSolitario && !perfil.cooperativo;

  if (estado?.sinVidas && compiten && !jugador.retiredAt) {
    await prisma.participant.update({
      where: { id: participantId },
      data: { retiredAt: new Date(), motivoDeSalida: MOTIVOS_DE_SALIDA.VIDAS },
    });
    await registrar(jugador.competitionId, "jugadores", `${jugador.displayName} se queda sin vidas y pierde el locke`);
    // Sus combates pendientes los gana el rival, como con cualquier locke perdido
    await resolverRetiradas(jugador.competitionId, null);
    revalidatePath("/", "layout");
  } else if (fueraPorVidas && !estado?.sinVidas) {
    await prisma.participant.update({
      where: { id: participantId },
      data: { retiredAt: null, motivoDeSalida: null },
    });
    await registrar(jugador.competitionId, "jugadores", `${jugador.displayName} recupera vidas y vuelve al locke`);
    revalidatePath("/", "layout");
  }
  return estado;
}

/** Al cambiar las vidas del locke: se mira a todos, que alguno puede salir o volver */
export async function comprobarVidasDelLocke(competitionId: string) {
  const jugadores = await prisma.participant.findMany({ where: { competitionId }, select: { id: true } });
  for (const j of jugadores) await comprobarVidas(j.id);
}
