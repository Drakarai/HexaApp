import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * El registro de cambios de cada locke (ver `CambioDelLocke`): lo que hace
 * quien administra y que luego alguien puede discutir. «Yo no toqué eso» se
 * contesta mirando Diagnóstico.
 *
 * Se apunta **después de contestar** (`after`): quien guarda un resultado no
 * espera a que se escriba el registro, y si el registro falla no se lleva por
 * delante lo que sí se guardó.
 */

export const ZONAS = {
  jornadas: "Jornadas",
  resultados: "Resultados",
  puntos: "Puntos",
  reglas: "Reglas",
  bolsa: "Bolsa y premios",
  gimnasios: "Gimnasios",
  jugadores: "Jugadores",
  locke: "El locke",
  cementerio: "Cementerio",
  final: "Final y hall",
} as const;
export type Zona = keyof typeof ZONAS;

const DIAS = 180;
const MAXIMO = 3000;

export async function registrar(
  competitionId: string | null,
  zona: Zona,
  texto: string,
  /** Si el locke ya no va a existir cuando se apunte (al borrarlo) */
  nombreDelLocke?: string,
) {
  // El usuario se lee ya, mientras dura la petición; lo demás, después
  const user = await getCurrentUser().catch(() => null);
  const apuntar = async () => {
    try {
      const locke = nombreDelLocke
        ? { name: nombreDelLocke }
        : competitionId
          ? await prisma.competition.findUnique({ where: { id: competitionId }, select: { name: true } })
          : null;
      await prisma.cambioDelLocke.create({
        data: {
          competitionId,
          locke: locke?.name ?? null,
          userId: user?.id ?? null,
          quien: user?.displayName ?? null,
          zona,
          texto: texto.slice(0, 500),
        },
      });
      if (Math.random() < 0.05) await recortar();
    } catch (error) {
      // Que no se apunte no puede romper lo que sí se ha guardado
      console.error("No se pudo apuntar el cambio:", error);
    }
  };
  try {
    after(apuntar);
  } catch {
    // Fuera de una petición (un script) no hay `after`: se apunta y ya
    await apuntar();
  }
}

async function recortar() {
  await prisma.cambioDelLocke.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - DIAS * 86_400_000) } },
  });
  const sobran = await prisma.cambioDelLocke.findMany({
    orderBy: { createdAt: "desc" },
    skip: MAXIMO,
    select: { id: true },
  });
  if (sobran.length) {
    await prisma.cambioDelLocke.deleteMany({ where: { id: { in: sobran.map((s) => s.id) } } });
  }
}

/** Para Diagnóstico: los últimos, de un locke o de todos */
export async function getCambios(competitionId: string | null, cuantos = 200) {
  return prisma.cambioDelLocke.findMany({
    where: competitionId ? { competitionId } : {},
    orderBy: { createdAt: "desc" },
    take: cuantos,
  });
}

/** El nombre de cada jugador, para escribir los textos del registro */
export async function nombresDeJugadores(...ids: (string | null | undefined)[]) {
  const validos = ids.filter((id): id is string => Boolean(id));
  const filas = validos.length
    ? await prisma.participant.findMany({ where: { id: { in: validos } }, select: { id: true, displayName: true } })
    : [];
  const mapa = new Map(filas.map((f) => [f.id, f.displayName]));
  return (id: string | null | undefined) => (id ? (mapa.get(id) ?? "?") : "nadie");
}
