"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import { sanitizeImageValue } from "@/lib/image";
import type { FormState } from "@/app/actions/auth";

/**
 * Alta de una baja. El formulario del cementerio pide lo mínimo: jugador,
 * mote, especie y, si se quiere, la causa y el sprite de la caja. El resto de
 * datos se pueden rellenar luego desde el panel de detalle.
 */
export async function createDeathAction(
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
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!species) return { error: "Dinos qué pokémon ha caído." };

  await prisma.death.create({
    data: {
      participantId,
      species,
      nickname: nickname || null,
      cause: String(formData.get("cause") ?? "").trim() || null,
      boxImage: sanitizeImageValue(formData.get("boxImage")),
    },
  });

  revalidatePath("/muertes");
  revalidatePath("/");
  return { success: `F por ${nickname || species}.` };
}

/** Edición desde el panel de detalle, incluidas las dos imágenes. */
export async function updateDeathAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("deathId") ?? "");
  const death = await prisma.death.findUnique({ where: { id } });
  if (!death) return { error: "Esa baja ya no existe." };

  try {
    await assertCanActForParticipant(death.participantId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const species = String(formData.get("species") ?? "").trim();
  if (!species) return { error: "La especie no puede quedarse vacía." };

  const levelRaw = String(formData.get("level") ?? "").trim();
  const level = levelRaw ? Number(levelRaw) : null;
  const diedAtRaw = String(formData.get("diedAt") ?? "").trim();

  await prisma.death.update({
    where: { id },
    data: {
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      cause: String(formData.get("cause") ?? "").trim() || null,
      level: level !== null && Number.isFinite(level) ? Math.trunc(level) : null,
      location: String(formData.get("location") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      boxImage: sanitizeImageValue(formData.get("boxImage")),
      detailImage: sanitizeImageValue(formData.get("detailImage")),
      ...(diedAtRaw ? { diedAt: new Date(diedAtRaw) } : {}),
    },
  });

  revalidatePath("/muertes");
  revalidatePath("/");
  return { success: "Ficha actualizada." };
}

export async function deleteDeathAction(formData: FormData) {
  const id = String(formData.get("deathId") ?? "");
  const death = await prisma.death.findUnique({ where: { id } });
  if (!death) return;
  await assertCanActForParticipant(death.participantId);

  await prisma.death.delete({ where: { id } });
  revalidatePath("/muertes");
  revalidatePath("/");
}
