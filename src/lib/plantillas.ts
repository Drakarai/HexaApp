import "server-only";
import { prisma } from "@/lib/db";
import { JUEGOS, juegoPorId } from "@/lib/juegos";
import { LEVEL_CAPS_DE_FABRICA } from "@/lib/level-caps-de-fabrica";

/**
 * Las plantillas de level caps: los hitos que trae cada juego de serie.
 *
 * Es la misma idea que los mapas: viven en la base de datos, se editan desde
 * Administración y valen para todos los lockes, porque los gimnasios de Johto
 * son los mismos jueguen quien juegue. Lo de fábrica
 * (`lib/level-caps-de-fabrica.ts`) solo se copia **con un botón**, así que
 * borrar un hito a conciencia no lo hace volver.
 *
 * Dentro de un locke, los level caps siguen siendo suyos y editables como
 * siempre: la plantilla solo es el punto de partida que se copia una vez.
 */

export type ItemDePlantilla = {
  id: string;
  label: string;
  cap: number;
  kind: string;
  notes: string | null;
  position: number;
};

/** Los hitos guardados de un juego, en orden. */
export async function getPlantilla(gameId: string) {
  const plantilla = await prisma.levelCapTemplate.findUnique({
    where: { gameId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  return plantilla?.items ?? [];
}

/**
 * Cuántos hitos tiene la plantilla de cada juego, para pintar las pestañas del
 * panel sin traerse todos los hitos de los veintiocho juegos.
 */
export async function getResumenDePlantillas() {
  const cuentas = await prisma.levelCapTemplate.findMany({
    select: { gameId: true, _count: { select: { items: true } } },
  });
  const porJuego = new Map(
    cuentas.map((fila) => [fila.gameId, fila._count.items]),
  );

  return JUEGOS.map((juego) => ({
    ...juego,
    hitos: porJuego.get(juego.id) ?? 0,
    hayDeFabrica: Boolean(LEVEL_CAPS_DE_FABRICA[juego.region]?.length),
  }));
}

/** Crea la fila de la plantilla si no existía. */
export async function asegurarPlantilla(gameId: string) {
  const existente = await prisma.levelCapTemplate.findUnique({
    where: { gameId },
  });
  if (existente) return existente;
  return prisma.levelCapTemplate.create({ data: { gameId } });
}

/**
 * Lo que traería de fábrica un juego: lo de su región.
 *
 * La semilla es por región porque los gimnasios y su orden son los mismos en
 * todas las versiones de una; lo que cambia de una versión a otra son los
 * niveles, y eso se ajusta después en la plantilla de cada juego, que se guarda
 * por separado.
 */
export function deFabricaParaJuego(gameId: string) {
  const juego = juegoPorId(gameId);
  if (!juego) return [];
  return LEVEL_CAPS_DE_FABRICA[juego.region] ?? [];
}
