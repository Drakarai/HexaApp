"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import { requireCompetitionManager } from "@/lib/competition";
import { LEVEL_CAP_KINDS } from "@/lib/constants";
import {
  IMAGEN_SIN_CAMBIOS,
  effectiveImages,
  sanitizeImageValue,
} from "@/lib/image";

import type { FormState } from "@/app/actions/auth";

/**
 * Lista de imágenes válidas que llega del formulario, sin huecos ni basura.
 *
 * Las que ya estaban guardadas no vuelven a viajar enteras: llegan como
 * "__igual__:N", donde N es el sitio que ocupaban al abrir el formulario, y
 * aquí se cambian por la imagen de verdad. Así se pueden reordenar o quitar
 * sin mandar megas de base64 de ida y vuelta.
 */
function readImages(formData: FormData, anteriores: string[] = []) {
  return formData
    .getAll("images")
    .map((value) => {
      const texto = String(value ?? "").trim();
      if (texto.startsWith(`${IMAGEN_SIN_CAMBIOS}:`)) {
        return anteriores[Number(texto.split(":")[1])] ?? null;
      }
      return sanitizeImageValue(texto);
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);
}

/** Imágenes efectivas que tiene ahora un level cap, para resolver las marcas. */
async function imagenesActuales(id: string) {
  const cap = await prisma.levelCap.findUnique({
    where: { id },
    select: { images: true, image: true },
  });
  return cap ? effectiveImages(cap) : [];
}

export async function createLevelCapAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const competitionId = String(formData.get("competitionId") ?? "");
  await requireCompetitionManager(competitionId);

  const label = String(formData.get("label") ?? "").trim();
  const cap = Number(formData.get("cap") ?? 0);
  if (!label) return { error: "Escribe el nombre del líder o hito." };
  if (!Number.isFinite(cap) || cap <= 0) {
    return { error: "El level cap tiene que ser un número mayor que 0." };
  }

  const kindRaw = String(formData.get("kind") ?? LEVEL_CAP_KINDS.GYM);
  const kind = kindRaw in LEVEL_CAP_KINDS ? kindRaw : LEVEL_CAP_KINDS.GYM;

  const last = await prisma.levelCap.findFirst({
    where: { competitionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.levelCap.create({
    data: {
      competitionId,
      label,
      cap: Math.trunc(cap),
      kind,
      badge: String(formData.get("badge") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      images: readImages(formData),
      position: (last?.position ?? 0) + 1,
    },
  });

  revalidatePath("/level-caps");
  return { success: "Level cap añadido." };
}

export async function updateLevelCapAction(formData: FormData) {
  const id = String(formData.get("levelCapId") ?? "");
  const levelCap = await prisma.levelCap.findUnique({ where: { id } });
  if (!levelCap) return;
  await requireCompetitionManager(levelCap.competitionId);

  const cap = Number(formData.get("cap") ?? levelCap.cap);

  await prisma.levelCap.update({
    where: { id },
    data: {
      label: String(formData.get("label") ?? "").trim() || levelCap.label,
      cap: Number.isFinite(cap) && cap > 0 ? Math.trunc(cap) : levelCap.cap,
      kind: String(formData.get("kind") ?? levelCap.kind),
      badge: String(formData.get("badge") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      images: readImages(formData, await imagenesActuales(id)),
      // El formulario ya trae la imagen antigua dentro de la lista
      image: null,
    },
  });

  revalidatePath("/level-caps");
}

export async function deleteLevelCapAction(formData: FormData) {
  const id = String(formData.get("levelCapId") ?? "");
  const levelCap = await prisma.levelCap.findUnique({ where: { id } });
  if (!levelCap) return;
  await requireCompetitionManager(levelCap.competitionId);

  await prisma.levelCap.delete({ where: { id } });
  revalidatePath("/level-caps");
}

/**
 * Marca/desmarca un gimnasio como superado. Cada jugador gestiona el suyo;
 * los administradores pueden tocar el de cualquiera.
 */
export async function toggleGymClearAction(formData: FormData) {
  const me = await requireUser();
  const levelCapId = String(formData.get("levelCapId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant) return;

  if (participant.userId !== me.id && !isAdmin(me)) {
    const myParticipant = await prisma.participant.findUnique({
      where: {
        competitionId_userId: {
          competitionId: participant.competitionId,
          userId: me.id,
        },
      },
    });
    if (!myParticipant?.isAdmin) {
      throw new Error("Solo puedes marcar tus propios gimnasios.");
    }
  }

  const existing = await prisma.gymClear.findUnique({
    where: { participantId_levelCapId: { participantId, levelCapId } },
  });

  if (existing) {
    await prisma.gymClear.delete({ where: { id: existing.id } });
  } else {
    await prisma.gymClear.create({ data: { participantId, levelCapId } });
  }

  revalidatePath("/level-caps");
  revalidatePath("/");
}
