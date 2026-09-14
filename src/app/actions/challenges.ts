"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { formatoDeCombate } from "@/lib/formatos-de-combate";
import { requireCompetitionManager } from "@/lib/competition";
import { devolverPremio, sincronizarPremios } from "@/lib/premios";
import { enlaceSeguro } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

/**
 * Combates de reto: piques sueltos entre dos jugadores, con premio y castigo.
 * Cuentan para el historial de victorias y derrotas pero **no dan puntos**; su
 * diferencia de pokémon solo entra en el desempate si la edición lo permite.
 */
export async function createChallengeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  try {
    await requireCompetitionManager(competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const participantAId = String(formData.get("participantAId") ?? "");
  const participantBId = String(formData.get("participantBId") ?? "");
  if (!participantAId || !participantBId) {
    return { error: "Elige a los dos jugadores del reto." };
  }
  if (participantAId === participantBId) {
    return { error: "Un jugador no puede retarse a sí mismo." };
  }

  const ambos = await prisma.participant.count({
    where: { id: { in: [participantAId, participantBId] }, competitionId },
  });
  if (ambos !== 2) return { error: "Esos jugadores no son de esta edición." };

  await prisma.challengeMatch.create({
    data: {
      competitionId,
      participantAId,
      participantBId,
      formato: formatoDeCombate(String(formData.get("formato") ?? "")).id,
      prize: String(formData.get("prize") ?? "").trim() || null,
      punishment: String(formData.get("punishment") ?? "").trim() || null,
    },
  });

  revalidatePath("/retos");
  return { success: "Reto creado." };
}

/** Resultado, premio, castigo y diferencia de un reto. */
export async function setChallengeResultAction(formData: FormData) {
  const id = String(formData.get("challengeId") ?? "");
  const reto = await prisma.challengeMatch.findUnique({ where: { id } });
  if (!reto) return;
  await requireCompetitionManager(reto.competitionId);

  const ganadorBruto = String(formData.get("winnerId") ?? "").trim();
  const winnerId =
    ganadorBruto === reto.participantAId || ganadorBruto === reto.participantBId
      ? ganadorBruto
      : null;

  const difBruta = String(formData.get("pokemonDiff") ?? "").trim();
  const dif = difBruta ? Number(difBruta) : null;
  const fechaBruta = String(formData.get("playedAt") ?? "").trim();

  await prisma.challengeMatch.update({
    where: { id },
    data: {
      winnerId,
      pokemonDiff:
        dif !== null && Number.isFinite(dif) ? Math.abs(Math.trunc(dif)) : null,
      formato: formatoDeCombate(String(formData.get("formato") ?? "")).id,
      prize: String(formData.get("prize") ?? "").trim() || null,
      punishment: String(formData.get("punishment") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      // Saneado antes de guardarlo: acaba en un href de la pantalla de todos
      replayUrl: enlaceSeguro(String(formData.get("replayUrl") ?? "")),
      playedAt: fechaBruta ? new Date(fechaBruta) : winnerId ? new Date() : null,
    },
  });

  // Los objetos del premio caen solos en la bolsa del que ha ganado, y se
  // corrigen si el ganador cambia: ver lib/premios.ts
  await sincronizarPremios(id);

  revalidatePath("/retos");
  revalidatePath("/puntos");
  revalidatePath("/bolsa");
  revalidatePath("/");
  revalidatePath("/jugador", "layout");
}

/** Añade un objeto del catálogo a lo que se lleva quien gane el reto. */
export async function anadirPremioAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const challengeMatchId = String(formData.get("challengeId") ?? "");
  const reto = await prisma.challengeMatch.findUnique({
    where: { id: challengeMatchId },
  });
  if (!reto) return { error: "Ese reto ya no está." };
  try {
    await requireCompetitionManager(reto.competitionId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { error: "Elige el objeto." };
  const objeto = await prisma.item.findUnique({
    where: { id: itemId },
    select: { name: true },
  });
  if (!objeto) return { error: "Ese objeto ya no está en el catálogo." };

  const cantidad = Number(String(formData.get("quantity") ?? "1"));
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
    return { error: "La cantidad tiene que ser un número del 1 al 99." };
  }

  await prisma.challengePrize.upsert({
    where: { challengeMatchId_itemId: { challengeMatchId, itemId } },
    create: { challengeMatchId, itemId, quantity: cantidad },
    update: { quantity: cantidad },
  });

  // Si el reto ya tiene ganador, el objeto se le da en el momento
  await sincronizarPremios(challengeMatchId);

  revalidatePath("/retos");
  revalidatePath("/bolsa");
  return { success: `${objeto.name} añadido al premio.` };
}

/** Quita un objeto del premio, devolviéndolo si ya se había entregado. */
export async function quitarPremioAction(formData: FormData) {
  const premioId = String(formData.get("premioId") ?? "");
  const premio = await prisma.challengePrize.findUnique({
    where: { id: premioId },
    include: { challenge: { select: { competitionId: true } } },
  });
  if (!premio) return;
  await requireCompetitionManager(premio.challenge.competitionId);

  // Primero se devuelve y luego se borra: después ya no se sabría a quién
  await devolverPremio(premioId);
  await prisma.challengePrize.delete({ where: { id: premioId } });

  revalidatePath("/retos");
  revalidatePath("/bolsa");
}

/**
 * Deja de anunciar un castigo en la portada. No lo borra: sigue en su reto,
 * simplemente ya no se le recuerda a nadie.
 */
export async function ocultarCastigoAction(formData: FormData) {
  const id = String(formData.get("challengeId") ?? "");
  const reto = await prisma.challengeMatch.findUnique({ where: { id } });
  if (!reto) return;
  await requireCompetitionManager(reto.competitionId);

  await prisma.challengeMatch.update({
    where: { id },
    data: { castigoVisible: !reto.castigoVisible },
  });

  revalidatePath("/retos");
  revalidatePath("/");
}

export async function deleteChallengeAction(formData: FormData) {
  const id = String(formData.get("challengeId") ?? "");
  const reto = await prisma.challengeMatch.findUnique({ where: { id } });
  if (!reto) return;
  await requireCompetitionManager(reto.competitionId);

  // Los objetos ya entregados se devuelven: el reto deja de existir
  for (const premio of await prisma.challengePrize.findMany({
    where: { challengeMatchId: id },
    select: { id: true },
  })) {
    await devolverPremio(premio.id);
  }

  await prisma.challengeMatch.delete({ where: { id } });

  revalidatePath("/retos");
  revalidatePath("/bolsa");
  revalidatePath("/puntos");
  revalidatePath("/jugador", "layout");
}

/**
 * Si la diferencia de pokémon de los retos cuenta para el desempate de la
 * clasificación. Los puntos nunca salen de un reto; esto es solo el tercer
 * criterio, cuando dos van empatados a puntos y a caídos.
 */
export async function setChallengeDiffCountsAction(formData: FormData) {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  await prisma.competition.update({
    where: { id: competitionId },
    data: { challengeDiffCounts: formData.get("cuenta") === "on" },
  });

  // Vive en Competiciones desde que dejó de ser cosa del Creador
  revalidatePath("/competiciones");
  revalidatePath("/puntos");
  revalidatePath("/");
}
