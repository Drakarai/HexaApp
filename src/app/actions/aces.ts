"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
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

  const sprites = await spritesDelFormulario(formData);

  await prisma.participant.update({
    where: { id: participantId },
    data: {
      aceSpecies: species,
      aceNickname: String(formData.get("nickname") ?? "").trim() || null,
      aceReason: String(formData.get("reason") ?? "").trim() || null,
      // Vacío = no se eligió especie nueva, así que se dejan las de antes
      // Sin especie nueva no se toca nada de lo que ya tuviera guardado
      aceImage: sprites?.boxImage,
      aceDetailImage: sprites?.detailImage,
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

