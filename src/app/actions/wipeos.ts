"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeError } from "@/lib/permiso";
import { nombresDeJugadores, registrar } from "@/lib/registro";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { assertCanActForParticipant } from "@/lib/competition";
import { MOTIVOS_DE_SALIDA } from "@/lib/wipeos";
import { resolverRetiradas } from "@/lib/retiradas";
import type { FormState } from "@/app/actions/auth";

/**
 * Los wipeos y el locke perdido.
 *
 * Son **dos cosas distintas a propósito**:
 *
 * - Un **wipeo** es una marca que se cuenta y ya. Se ponen las que haga falta y
 *   se quitan si se apuntó mal. Que te barran el equipo en la primera ruta no
 *   tiene por qué costarte el locke.
 * - **Perder el locke** es quedarse fuera de la competición, y eso no lo
 *   decide un contador: se marca a propósito.
 *
 * Quién puede qué: un wipeo lo apunta **el propio jugador o quien administre el
 * locke**, igual que una baja —es su partida y lo sabe él—. Dar el locke por
 * perdido, también: quien wipea y decide no seguir lo dice él mismo («He
 * perdido el locke»), sin esperar a la organización. Retirar a alguien sigue
 * siendo solo de la organización.
 */

/** Un wipeo sale en su perfil, en la clasificación y en el muro. */
function refrescarWipeos() {
  revalidatePath("/jugador/[id]", "page");
  revalidatePath("/puntos");
  revalidatePath("/actividad");
  revalidatePath("/");
}

export async function apuntarWipeoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const participantId = String(formData.get("participantId") ?? "");
  let deQuien;
  try {
    deQuien = await assertCanActForParticipant(participantId);
  } catch (error) {
    return { error: mensajeDeError(error) };
  }

  const cuando = String(formData.get("ocurridoAt") ?? "").trim();
  const fecha = cuando ? new Date(cuando) : new Date();
  if (Number.isNaN(fecha.getTime())) return { error: "Esa fecha no vale." };

  const usuario = await getCurrentUser();
  await prisma.wipeo.create({
    data: {
      participantId,
      ocurridoAt: fecha,
      contra: String(formData.get("contra") ?? "").trim() || null,
      notas: String(formData.get("notas") ?? "").trim() || null,
      autorId: usuario?.id ?? null,
    },
  });

  await registrar(
    deQuien.participant.competitionId,
    "jugadores",
    `Apunta un wipeo a ${deQuien.participant.displayName}${String(formData.get("contra") ?? "").trim() ? ` contra ${String(formData.get("contra")).trim()}` : ""}`,
  );
  refrescarWipeos();
  return { success: "Wipeo apuntado. A seguir." };
}

/** Quitar una marca, para cuando se apuntó por error. */
export async function quitarWipeoAction(formData: FormData) {
  const id = String(formData.get("wipeoId") ?? "");
  const wipeo = await prisma.wipeo.findUnique({
    where: { id },
    select: { participantId: true },
  });
  if (!wipeo) return;

  const { participant } = await assertCanActForParticipant(wipeo.participantId);
  await prisma.wipeo.delete({ where: { id } });
  await registrar(participant.competitionId, "jugadores", `Quita un wipeo de ${participant.displayName}`);
  refrescarWipeos();
}

/**
 * Dejar a alguien fuera del locke, o devolverlo.
 *
 * Por dentro es lo mismo que retirarse —deja de entrar en emparejamientos, no
 * cuenta para el MVP ni para el formato del final, y sus combates pendientes los
 * gana el rival—, y lo único que cambia es **el motivo**, que es lo que se
 * enseña. Ver el comentario de `Participant.motivoDeSalida`.
 */
export async function perderElLockeAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { competitionId: true, retiredAt: true, motivoDeSalida: true, userId: true },
  });
  if (!participant) return;
  // Él mismo o quien administra (y lo suyo, no en una edición archivada)
  const { user: manager } = await assertCanActForParticipant(participantId);

  // Si ya está fuera por esto, el botón lo devuelve al locke
  if (participant.retiredAt && participant.motivoDeSalida === MOTIVOS_DE_SALIDA.WIPEO) {
    await prisma.participant.update({
      where: { id: participantId },
      data: { retiredAt: null, motivoDeSalida: null },
    });
    const nombre = await nombresDeJugadores(participantId);
    await registrar(participant.competitionId, "jugadores", `Devuelve al locke a ${nombre(participantId)} (lo había perdido)`);
    revalidatePath("/", "layout");
    return;
  }
  // Y si está fuera por haberse retirado, esto no lo toca: son cosas distintas
  if (participant.retiredAt) return;

  await prisma.participant.update({
    where: { id: participantId },
    data: { retiredAt: new Date(), motivoDeSalida: MOTIVOS_DE_SALIDA.WIPEO },
  });
  {
    const nombre = await nombresDeJugadores(participantId);
    await registrar(
      participant.competitionId,
      "jugadores",
      manager.id === participant.userId
        ? `${nombre(participantId)} da su locke por perdido`
        : `Da el locke por perdido a ${nombre(participantId)}`,
    );
  }

  /**
   * Los combates que le queden se dan por ganados igual que con una retirada:
   * para el rival es lo mismo, se quedó sin contrincante.
   */
  await resolverRetiradas(participant.competitionId, manager.id);

  revalidatePath("/", "layout");
}
