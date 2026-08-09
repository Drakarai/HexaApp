"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanActForParticipant } from "@/lib/competition";
import type { FormState } from "@/app/actions/auth";

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
  if (!species) return { error: "Dinos qué pokémon ha caído." };

  const levelRaw = String(formData.get("level") ?? "").trim();
  const level = levelRaw ? Number(levelRaw) : null;
  const diedAtRaw = String(formData.get("diedAt") ?? "").trim();

  await prisma.death.create({
    data: {
      participantId,
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      level: level !== null && Number.isFinite(level) ? Math.trunc(level) : null,
      location: String(formData.get("location") ?? "").trim() || null,
      cause: String(formData.get("cause") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      diedAt: diedAtRaw ? new Date(diedAtRaw) : new Date(),
    },
  });

  revalidatePath("/muertes");
  revalidatePath("/");
  return { success: `F por ${species}.` };
}

export async function updateDeathAction(formData: FormData) {
  const id = String(formData.get("deathId") ?? "");
  const death = await prisma.death.findUnique({ where: { id } });
  if (!death) return;
  await assertCanActForParticipant(death.participantId);

  const levelRaw = String(formData.get("level") ?? "").trim();
  const level = levelRaw ? Number(levelRaw) : null;
  const diedAtRaw = String(formData.get("diedAt") ?? "").trim();

  await prisma.death.update({
    where: { id },
    data: {
      species: String(formData.get("species") ?? "").trim() || death.species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      level: level !== null && Number.isFinite(level) ? Math.trunc(level) : null,
      location: String(formData.get("location") ?? "").trim() || null,
      cause: String(formData.get("cause") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      ...(diedAtRaw ? { diedAt: new Date(diedAtRaw) } : {}),
    },
  });

  revalidatePath("/muertes");
  revalidatePath("/");
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
