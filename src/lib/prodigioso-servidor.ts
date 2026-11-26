import "server-only";
import { prisma } from "@/lib/db";
import { getJornadasParaCheckpoints, jornadaJugada } from "@/lib/checkpoints";
import { CLAVE_DEL_BONO, NOMBRE_DEL_BONO, imagenDelBono } from "@/lib/bono-prodigioso";
import { formatoDePartida } from "@/lib/partida/formato";

/**
 * Lo del Intercambio Prodigioso que toca la base de datos (las cuentas, en
 * `lib/prodigioso.ts`).
 */

/** Si un locke puede hacer Prodigiosos, y si no, por qué (para el cartel de «en obras») */
export function prodigiosoDelLocke(locke: {
  prodigioso: boolean;
  modality: string | null;
  game: string | null;
  gameId: string | null;
  juegoNoOficial: boolean;
}): { abierto: true } | { abierto: false; porQue: string; enObras: boolean } {
  if (!locke.prodigioso) return { abierto: false, porQue: "Este locke no tiene el Intercambio Prodigioso encendido.", enObras: false };
  const formato = formatoDePartida(locke);
  if (formato?.tipo !== "oficial" || formato.familia !== "usum") {
    return {
      abierto: false,
      enObras: true,
      porQue: "Por ahora solo funciona en Ultrasol y Ultraluna: en los demás juegos está en obras.",
    };
  }
  // Sin randomizar haría falta lo que aprende cada pokémon a cada nivel
  if (!/random/i.test(locke.modality ?? "")) {
    return {
      abierto: false,
      enObras: true,
      porQue: "Por ahora solo en lockes random (la modalidad del locke tiene que decir «Random»): sin randomizar está en obras.",
    };
  }
  return { abierto: true };
}

/** El bono del catálogo: se crea la primera vez que hace falta */
export async function asegurarBonoProdigioso() {
  const ya = await prisma.item.findUnique({ where: { apiSlug: CLAVE_DEL_BONO }, select: { id: true } });
  if (ya) return ya.id;
  try {
    const nuevo = await prisma.item.create({
      data: {
        name: NOMBRE_DEL_BONO,
        apiSlug: CLAVE_DEL_BONO,
        description: "Un Intercambio Prodigioso más, aparte del que da cada jornada. Se gasta solo al hacerlo, en Intercambios.",
        image: imagenDelBono(),
      },
      select: { id: true },
    });
    return nuevo.id;
  } catch {
    // Dos a la vez: el otro ya lo ha creado
    const otro = await prisma.item.findUniqueOrThrow({ where: { apiSlug: CLAVE_DEL_BONO }, select: { id: true } });
    return otro.id;
  }
}

/**
 * Los bonos de alguien: **uno por cada jornada acabada**, menos los que ya ha
 * gastado de esos, y los que tenga en la Bolsa (de premios). Se gastan
 * primero los de las jornadas.
 */
export async function bonosProdigiososDe(competitionId: string, participantId: string) {
  const [jornadas, gastados, enLaBolsa] = await Promise.all([
    getJornadasParaCheckpoints(competitionId),
    prisma.intercambioProdigioso.count({ where: { participantId, deLaBolsa: false } }),
    prisma.bagEntry.findFirst({
      where: { participantId, item: { apiSlug: CLAVE_DEL_BONO } },
      select: { id: true, quantity: true, itemId: true },
    }),
  ]);
  const porJornadas = Math.max(0, jornadas.filter(jornadaJugada).length - gastados);
  return { porJornadas, enLaBolsa: enLaBolsa?.quantity ?? 0, entrada: enLaBolsa };
}
