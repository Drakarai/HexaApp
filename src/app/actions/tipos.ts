"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";

/**
 * El equipo de la calculadora de tipos y con qué tabla se cuenta.
 *
 * **Siempre lo propio**: el participante se resuelve desde la sesión y no llega
 * en el formulario, así que no hay forma de escribir en el de otro aunque se
 * mande la petición a mano. Es la misma regla que las notas.
 */

/** Cuántos caben. Seis, como el equipo de verdad. */
const HUECOS = 6;

/** Con qué tabla se cuenta: la de la generación del locke o la de hoy. */
export type QueTabla = "juego" | "ahora";

export type MiembroDelEquipo = {
  /** El id de la forma en la pokédex, que es con lo que se buscan sus tipos */
  id: number;
  nombre: string;
};

export async function guardarEquipoDeTiposAction(
  miembros: MiembroDelEquipo[],
  tabla: QueTabla,
) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return;

  const participant = await getMyParticipant(competition.id, user.id);
  if (!participant) return;

  // Se limpia aquí y no en el navegador: lo que llega de fuera no vale
  const limpios = miembros
    .filter(
      (miembro) =>
        Number.isInteger(miembro?.id) &&
        miembro.id > 0 &&
        typeof miembro?.nombre === "string",
    )
    .slice(0, HUECOS)
    .map((miembro) => ({ id: miembro.id, nombre: miembro.nombre.slice(0, 40) }));

  const datos = {
    members: JSON.stringify(limpios),
    tabla: tabla === "ahora" ? "ahora" : "juego",
  };
  await prisma.typeTeam.upsert({
    where: { participantId: participant.id },
    create: { participantId: participant.id, ...datos },
    update: datos,
  });

  revalidatePath("/notas");
}
