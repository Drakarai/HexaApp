"use server";

import { revalidatePath } from "next/cache";
import { urlDeYouTube, videoDeYouTube } from "@/lib/youtube";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
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
 * Comprueba que quien mira puede tocar lo de ese participante: o es suyo, o es
 * administrador. Lo usan la casilla de "superado" y el vídeo del gimnasio.
 */
async function puedoTocarLoDe(participantId: string) {
  const me = await requireUser();
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant) return null;

  if (participant.userId !== me.id && !esCreador(me)) {
    const myParticipant = await prisma.participant.findUnique({
      where: {
        competitionId_userId: {
          competitionId: participant.competitionId,
          userId: me.id,
        },
      },
    });
    if (!myParticipant?.isAdmin) return null;
  }
  return participant;
}

/**
 * Marca/desmarca un gimnasio como superado. Cada jugador gestiona el suyo;
 * los administradores pueden tocar el de cualquiera.
 */
export async function toggleGymClearAction(formData: FormData) {
  const levelCapId = String(formData.get("levelCapId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");

  const participant = await puedoTocarLoDe(participantId);
  if (!participant) return;

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


/**
 * Guarda (o quita) el enlace del vídeo de cómo alguien se pasó un gimnasio.
 *
 * Solo se admite YouTube: es lo que se puede incrustar y reproducir dentro de
 * la aplicación, y de paso deja fuera cualquier `javascript:` disfrazado. Se
 * guarda la dirección ya limpia —sin listas de reproducción ni parámetros de
 * seguimiento— pero conservando el minuto de inicio si lo traía.
 */
export async function setGymVideoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const levelCapId = String(formData.get("levelCapId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");

  const participant = await puedoTocarLoDe(participantId);
  if (!participant) {
    return { error: "Solo puedes poner el vídeo de tus propios gimnasios." };
  }

  const bruto = String(formData.get("url") ?? "").trim();

  if (!bruto) {
    await prisma.gymVideo.deleteMany({ where: { participantId, levelCapId } });
    revalidatePath("/level-caps");
    return { success: "Vídeo quitado." };
  }

  const video = videoDeYouTube(bruto);
  if (!video) {
    return { error: "Eso no parece un enlace de YouTube. Pega el de compartir." };
  }

  const url = urlDeYouTube(video);
  await prisma.gymVideo.upsert({
    where: { participantId_levelCapId: { participantId, levelCapId } },
    create: { participantId, levelCapId, url },
    update: { url },
  });

  revalidatePath("/level-caps");
  return { success: "Vídeo guardado." };
}
