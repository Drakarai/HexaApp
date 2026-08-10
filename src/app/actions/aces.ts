"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCanActForParticipant } from "@/lib/competition";
import { sanitizeImageValue } from "@/lib/image";
import type { FormState } from "@/app/actions/auth";

/**
 * El pokémon as de un jugador en la competición actual. Lo pone cada uno para
 * sí mismo; los administradores pueden echar una mano igual que con las bajas.
 */
export async function updateAceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");
  try {
    await assertCanActForParticipant(participantId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "Elige la especie de tu as." };

  await prisma.participant.update({
    where: { id: participantId },
    data: {
      aceSpecies: species,
      aceNickname: String(formData.get("nickname") ?? "").trim() || null,
      aceReason: String(formData.get("reason") ?? "").trim() || null,
      aceImage: sanitizeImageValue(formData.get("boxImage")),
      aceDetailImage: sanitizeImageValue(formData.get("detailImage")),
    },
  });

  revalidatePath("/", "layout");
  return { success: "As actualizado." };
}

export async function clearAceAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  await assertCanActForParticipant(participantId);

  await prisma.participant.update({
    where: { id: participantId },
    data: {
      aceSpecies: null,
      aceNickname: null,
      aceReason: null,
      aceImage: null,
      aceDetailImage: null,
    },
  });

  revalidatePath("/", "layout");
}

/** La ilustración grande solo se pide al abrir la ficha del as. */
export async function getAceDetailImageAction(participantId: string) {
  await requireUser();
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { aceDetailImage: true },
  });
  return participant?.aceDetailImage ?? null;
}
