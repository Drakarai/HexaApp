"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { puedeVerLocke } from "@/lib/acceso";
import { COPIABLE } from "@/lib/copiable";
import type { FormState } from "@/app/actions/auth";

/**
 * Copiar la configuración de una edición a otra.
 *
 * Montar el locke siguiente era reescribir a mano lo mismo de siempre: las
 * reglas, los level caps y los ajustes. Y con gente llevando sus propios
 * lockes, poder arrancar de una copia de los tuyos les ahorra la parte
 * aburrida.
 *
 * **Se copia lo que se marca y nada más.** No se tocan jugadores, jornadas,
 * puntos ni bajas: eso es lo que pasó en esa edición, no su configuración. Y
 * tampoco `maxPlayers`, que se decide al crear el locke y cambia cómo se
 * comporta entero (ver `lib/perfiles-de-locke.ts`).
 */

export async function copiarDeOtraEdicionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const destinoId = String(formData.get("destinoId") ?? "");
  const origenId = String(formData.get("origenId") ?? "");
  if (!origenId || origenId === destinoId) {
    return { error: "Elige de qué edición copiar." };
  }

  try {
    await requireCompetitionManager(destinoId);
  } catch (error) {
    return { error: (error as Error).message };
  }
  /**
   * Del origen basta con poder abrirlo: copiarse las reglas de un locke que ya
   * ves no le quita nada a nadie. Mandarlo lo manda el navegador, así que se
   * comprueba aquí y no solo escondiendo la opción del desplegable.
   */
  if (!(await puedeVerLocke(origenId))) {
    return { error: "Esa edición no es tuya." };
  }

  const que = formData.getAll("que").map(String);
  if (!que.length) return { error: "Marca al menos una cosa que copiar." };

  const [origen, destino] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: origenId },
      select: {
        name: true,
        gameId: true,
        startingPoints: true,
        challengeDiffCounts: true,
        jornadasPrevistas: true,
      },
    }),
    prisma.competition.findUnique({
      where: { id: destinoId },
      select: { gameId: true },
    }),
  ]);
  if (!origen || !destino) return { error: "Esa edición ya no existe." };

  const hecho: string[] = [];

  if (que.includes(COPIABLE.REGLAS)) {
    const yaHay = await prisma.ruleSection.count({
      where: { competitionId: destinoId },
    });
    if (yaHay) {
      return {
        error:
          "Esta edición ya tiene reglas escritas. Bórralas antes de copiar, para no acabar con dos juegos de reglas mezcladas.",
      };
    }
    const reglas = await prisma.ruleSection.findMany({
      where: { competitionId: origenId },
      orderBy: { position: "asc" },
    });
    if (reglas.length) {
      await prisma.ruleSection.createMany({
        data: reglas.map((regla) => ({
          competitionId: destinoId,
          title: regla.title,
          body: regla.body,
          category: regla.category,
          position: regla.position,
        })),
      });
      hecho.push(`${reglas.length} ${reglas.length === 1 ? "regla" : "reglas"}`);
    }
  }

  if (que.includes(COPIABLE.LEVEL_CAPS)) {
    const yaHay = await prisma.levelCap.count({
      where: { competitionId: destinoId },
    });
    if (yaHay) {
      return {
        error:
          "Esta edición ya tiene level caps. Bórralos antes de copiar, para no acabar con dos juegos de gimnasios.",
      };
    }
    const caps = await prisma.levelCap.findMany({
      where: { competitionId: origenId },
      orderBy: { position: "asc" },
      // Las imágenes se piden a propósito: aquí hacen falta para copiarlas, y
      // desde que existe el almacén lo que se copia es la referencia
      select: {
        label: true,
        cap: true,
        kind: true,
        badge: true,
        notes: true,
        images: true,
        image: true,
        position: true,
        // Los checkpoints de jornada son parte de cómo se juega, no de lo que pasó
        jornadaDespues: true,
      },
    });
    if (caps.length) {
      await prisma.levelCap.createMany({
        data: caps.map((cap) => ({ ...cap, competitionId: destinoId })),
      });
      hecho.push(`${caps.length} level caps`);
    }
  }

  if (que.includes(COPIABLE.AJUSTES)) {
    await prisma.competition.update({
      where: { id: destinoId },
      data: {
        startingPoints: origen.startingPoints,
        challengeDiffCounts: origen.challengeDiffCounts,
        jornadasPrevistas: origen.jornadasPrevistas,
      },
    });
    hecho.push("los ajustes");
  }

  revalidatePath("/", "layout");
  if (!hecho.length) {
    return { error: `${origen.name} no tiene nada de eso que copiar.` };
  }

  /**
   * Si los juegos no son el mismo se avisa **después de copiar**, no se impide:
   * el usuario ha marcado lo que quería y a lo mejor lo sabe. Pero unos level
   * caps de otra región tienen los líderes que no son, y eso hay que decirlo.
   */
  const otroJuego =
    que.includes(COPIABLE.LEVEL_CAPS) &&
    origen.gameId !== null &&
    destino.gameId !== null &&
    origen.gameId !== destino.gameId;

  // "las reglas, 4 level caps y los ajustes", no "a y b y c"
  const enumerado =
    hecho.length > 1
      ? `${hecho.slice(0, -1).join(", ")} y ${hecho[hecho.length - 1]}`
      : hecho[0];

  return {
    success:
      `Copiado de ${origen.name}: ${enumerado}.` +
      (otroJuego
        ? " Ojo: son de otro juego, así que los líderes y los topes no son los de esta región. Revísalos o tráelos del juego desde Level caps."
        : ""),
  };
}
