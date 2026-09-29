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
import { capturaQuePuedoTocar, darPorMuerto } from "@/lib/caja-servidor";

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
 * Todo lo que cambia cuando cambia una baja.
 *
 * Una baja no sale solo en el cementerio: **cuenta para la clasificación** —es
 * el primer desempate— y sale en el perfil de cada jugador, en el hall de la
 * fama y en el muro. Estaba puesto a mano en cada acción y se habían quedado
 * fuera la clasificación y los perfiles, así que al borrar una baja el
 * cementerio se ponía al día y la tabla seguía enseñando el número de antes.
 *
 * Va en una lista y no suelto por cada acción justo por eso: si mañana el
 * número aparece en otra pantalla, se añade aquí una vez y valen las tres.
 */
function refrescarBajas() {
  revalidatePath("/muertes");
  revalidatePath("/mapa");
  revalidatePath("/puntos");
  revalidatePath("/hall-de-la-fama");
  revalidatePath("/actividad");
  // Los perfiles son una ruta con identificador: hay que refrescarlos todos
  revalidatePath("/jugador", "layout");
  revalidatePath("/");
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

  /**
   * Si se eligió **de la caja**, la baja sale de esa captura: su especie, su
   * mote y su ruta, y en un Soul Link se lleva a su pareja. Es la misma caída
   * que la de Equipo y PC (y se deshace desde allí); antes, apuntada aquí, la
   * pareja seguía viva.
   */
  const captureId = String(formData.get("captureId") ?? "").trim();
  if (captureId) {
    try {
      const captura = await capturaQuePuedoTocar(captureId);
      if (captura.participantId !== participantId) {
        return { error: "Ese pokémon no es de la caja de ese jugador." };
      }
      const aviso = await darPorMuerto(captura, String(formData.get("cause") ?? ""));
      refrescarBajas();
      return { success: aviso };
    } catch (error) {
      return { error: (error as Error).message };
    }
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

  refrescarBajas();
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

  refrescarBajas();
  return { success: "Ficha actualizada." };
}


export async function deleteDeathAction(formData: FormData) {
  const id = String(formData.get("deathId") ?? "");
  const death = await prisma.death.findUnique({ where: { id } });
  if (!death) return;
  await assertCanActForParticipant(death.participantId);

  await prisma.death.delete({ where: { id } });
  refrescarBajas();
}
