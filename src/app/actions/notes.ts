"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeError } from "@/lib/permiso";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertPuedeTocarLocke } from "@/lib/acceso";
import type { FormState } from "@/app/actions/auth";

/**
 * Las notas son estrictamente privadas: todas las consultas filtran por
 * authorId, así que nadie (ni los admin) puede leer las de otro.
 */
export async function createNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const competitionId = String(formData.get("competitionId") ?? "");
  // Escribir es de los que juegan: un espectador mira el locke y no deja nada
  // dentro, ni siquiera en su propio cuaderno
  try {
    await assertPuedeTocarLocke(competitionId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Ponle un título a la nota." };

  const subjectIdRaw = String(formData.get("subjectId") ?? "").trim();
  let subjectId: string | null = null;
  if (subjectIdRaw && subjectIdRaw !== "general") {
    const subject = await prisma.participant.findFirst({
      where: { id: subjectIdRaw, competitionId },
      select: { id: true },
    });
    if (!subject) return { error: "Ese jugador no está en la competición." };
    subjectId = subject.id;
  }

  await prisma.note.create({
    data: {
      competitionId,
      authorId: me.id,
      subjectId,
      title,
      body: String(formData.get("body") ?? ""),
      pinned: formData.get("pinned") === "on",
    },
  });

  revalidatePath("/notas");
  return { success: "Nota guardada." };
}

export async function updateNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const id = String(formData.get("noteId") ?? "");

  const note = await prisma.note.findFirst({
    where: { id, authorId: me.id },
  });
  if (!note) return { error: "Nota no encontrada." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "El título no puede estar vacío." };

  await prisma.note.update({
    where: { id },
    data: {
      title,
      body: String(formData.get("body") ?? ""),
      pinned: formData.get("pinned") === "on",
    },
  });

  revalidatePath("/notas");
  return { success: "Nota actualizada." };
}

export async function deleteNoteAction(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("noteId") ?? "");

  // deleteMany con authorId evita borrar notas ajenas aunque se falsee el id
  await prisma.note.deleteMany({ where: { id, authorId: me.id } });
  revalidatePath("/notas");
}

export async function toggleNotePinAction(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("noteId") ?? "");
  const note = await prisma.note.findFirst({ where: { id, authorId: me.id } });
  if (!note) return;

  await prisma.note.update({
    where: { id },
    data: { pinned: !note.pinned },
  });
  revalidatePath("/notas");
}
