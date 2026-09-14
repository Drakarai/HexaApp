"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCanActForParticipant } from "@/lib/competition";
import { imagenEditada } from "@/lib/image";
import { guardarPorContenido } from "@/lib/almacen-de-imagenes";
import { zonaValidaParaCompeticion } from "@/lib/mapas";
import { spritesDelFormulario } from "@/lib/sprites-servidor";
import type { FormState } from "@/app/actions/auth";

/**
 * El sitio del formulario: o una zona del mapa, o texto libre, nunca las dos.
 *
 * La zona se comprueba contra la región de esa edición: el desplegable solo
 * ofrece las que tocan, pero el formulario se puede mandar a mano.
 */
async function sitioDelFormulario(
  formData: FormData,
  participantId: string,
): Promise<{ zoneId: string | null; location: string | null }> {
  const zoneId = String(formData.get("zoneId") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  if (!zoneId) return { zoneId: null, location };

  const participante = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { competition: { select: { gameId: true } } },
  });
  const vale = await zonaValidaParaCompeticion(
    zoneId,
    participante?.competition.gameId ?? null,
  );
  // Si la zona no es de esta región se descarta, pero no se tira la baja: lo
  // que importa es el pokémon, no dónde cayó.
  return vale ? { zoneId, location: null } : { zoneId: null, location };
}

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

  // Las imágenes las baja el servidor: el navegador solo manda qué pokémon es
  const [sprites, sitio] = await Promise.all([
    spritesDelFormulario(formData),
    sitioDelFormulario(formData, participantId),
  ]);

  await prisma.death.create({
    data: {
      participantId,
      species,
      nickname: nickname || null,
      cause: String(formData.get("cause") ?? "").trim() || null,
      zoneId: sitio.zoneId,
      location: sitio.location,
      boxImage: sprites?.boxImage ?? null,
      detailImage: sprites?.detailImage ?? null,
    },
  });

  revalidatePath("/muertes");
  revalidatePath("/mapa");
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

  // Dos vías que conviven: el buscador manda qué pokémon es y las imágenes las
  // baja el servidor; el modo manual las manda él. Si no llega ninguna de las
  // dos cosas, se quedan las que ya tuviera.
  const sprites = await spritesDelFormulario(formData);
  const boxImage =
    sprites?.boxImage ??
    (await guardarPorContenido(imagenEditada(formData.get("boxImage"))));
  const detailImage =
    sprites?.detailImage ??
    (await guardarPorContenido(imagenEditada(formData.get("detailImage"))));
  const sitio = await sitioDelFormulario(formData, death.participantId);

  await prisma.death.update({
    where: { id },
    data: {
      species,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      cause: String(formData.get("cause") ?? "").trim() || null,
      level: level !== null && Number.isFinite(level) ? Math.trunc(level) : null,
      zoneId: sitio.zoneId,
      location: sitio.location,
      notes: String(formData.get("notes") ?? "").trim() || null,
      boxImage,
      detailImage,
      ...(diedAtRaw ? { diedAt: new Date(diedAtRaw) } : {}),
    },
  });

  revalidatePath("/muertes");
  revalidatePath("/mapa");
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
  revalidatePath("/mapa");
  revalidatePath("/");
}
