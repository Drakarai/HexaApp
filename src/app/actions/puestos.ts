"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireCompetitionManager } from "@/lib/competition";
import { conPermiso, mensajeDeError } from "@/lib/permiso";
import { registrar } from "@/lib/registro";
import { leerPuntosPorPuesto, puntosDelTexto, type PremioDeUnPuesto } from "@/lib/puestos";
import { getTablaDeLaJornada, jornadaDelReto, recalcularPuestosDeLaJornada, repartirPremiosFinales } from "@/lib/puestos-servidor";
import type { FormState } from "@/app/actions/auth";

/**
 * La configuración de la **clasificación por puestos** (ver lib/puestos.ts) y
 * los premios de la clasificación final. Solo quien administra el locke.
 */

function refrescar() {
  revalidatePath("/puntos");
  revalidatePath("/jornadas");
  revalidatePath("/bolsa");
  revalidatePath("/ruleta");
  revalidatePath("/");
}

export async function guardarPuestosAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  const [, sinPermiso] = await conPermiso(requireCompetitionManager(competitionId));
  if (sinPermiso) return sinPermiso;
  try {
    const antes = await prisma.competition.findUniqueOrThrow({
      where: { id: competitionId },
      select: { puntosPorPuesto: true, retoPorJornada: true },
    });
    const estaba = Boolean(leerPuntosPorPuesto(antes.puntosPorPuesto));
    const activo = formData.get("activo") === "on";
    const puntos = activo ? puntosDelTexto(String(formData.get("puntos") ?? "")) : null;
    if (activo && !puntos) return { error: "Escribe los puntos de cada puesto separados por comas, como «2, 2, 2, 1, 0, 0»." };

    const premios: PremioDeUnPuesto[] = (puntos ?? []).map((_, i) => ({
      objetos: [formData.get(`objeto1-${i}`), formData.get(`objeto2-${i}`)]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean),
      ruleta: String(formData.get(`ruleta-${i}`) ?? "").trim() || null,
    }));
    await prisma.competition.update({
      where: { id: competitionId },
      data: {
        puntosPorPuesto: puntos ?? Prisma.DbNull,
        premiosPorPuesto: activo ? (premios as unknown as Prisma.InputJsonValue) : undefined,
        retoPorJornada: activo && formData.get("retoPorJornada") === "on",
        // Al encenderlo, desde la jornada en curso: las ya jugadas no llevaban reto obligatorio
        ...(activo && formData.get("retoPorJornada") === "on" && !antes.retoPorJornada
          ? { retoDesde: await jornadaDelReto(competitionId) }
          : {}),
      },
    });

    const jornadas = await prisma.matchday.findMany({
      where: { competitionId },
      orderBy: { position: "asc" },
      select: { id: true, pointsForWin: true, label: true, matches: { select: { id: true, winnerId: true, participantB: { select: { displayName: true } }, participantA: { select: { displayName: true } }, participantAId: true } } },
    });

    if (activo && !estaba) {
      // Las victorias dejan de dar puntos sueltos…
      await prisma.pointEntry.deleteMany({ where: { competitionId, sourceMatchId: { not: null } } });
      // …y los premios de las jornadas ya jugadas no se dan otra vez, salvo que se pida
      if (formData.get("premiosDeAntes") !== "on") {
        for (const j of jornadas) {
          const tabla = await getTablaDeLaJornada(j.id);
          if (!tabla?.jugada) continue;
          await prisma.premioDePuesto.createMany({
            data: tabla.filas.map((f) => ({
              competitionId,
              matchdayId: j.id,
              participantId: f.participantId,
              puesto: f.puesto,
              entregado: [],
            })),
          });
        }
      }
    }
    if (!activo && estaba) {
      // Vuelta a lo de siempre: fuera los puntos por puesto, y cada victoria con su punto
      await prisma.pointEntry.deleteMany({ where: { competitionId, sourceMatchdayId: { not: null } } });
      for (const j of jornadas) {
        for (const m of j.matches) {
          if (!m.winnerId) continue;
          const ganador = m.winnerId === m.participantAId ? m.participantA : m.participantB;
          await prisma.pointEntry.upsert({
            where: { sourceMatchId: m.id },
            create: {
              competitionId,
              participantId: m.winnerId,
              delta: j.pointsForWin,
              reason: `${j.label}: victoria de ${ganador.displayName}`,
              sourceMatchId: m.id,
            },
            update: {},
          });
        }
      }
    }
    // Los puntos (y los premios que toquen) de cada jornada, con la tabla de ahora
    if (activo) for (const j of jornadas) await recalcularPuestosDeLaJornada(j.id);

    await registrar(
      competitionId,
      "puntos",
      activo
        ? `Pone la clasificación por puestos: ${puntos!.join(", ")}`
        : "Quita la clasificación por puestos: vuelven los puntos por victoria",
    );
    refrescar();
    return { success: activo ? "Guardado. Cada jornada se puntúa por puestos." : "Quitado: vuelven los puntos por victoria." };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}

/** Los premios de la clasificación final, con la general de ahora. Se puede repetir: rehace lo que cambie */
export async function repartirPremiosFinalesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  const [, sinPermiso] = await conPermiso(requireCompetitionManager(competitionId));
  if (sinPermiso) return sinPermiso;
  try {
    await repartirPremiosFinales(competitionId);
    await registrar(competitionId, "puntos", "Reparte los premios de la clasificación final");
    refrescar();
    return { success: "Premios de la clasificación final repartidos." };
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}
