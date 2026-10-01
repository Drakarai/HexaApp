"use server";

import { getFichaRapida, type FichaRapida } from "@/lib/ficha-rapida";

/** La ficha rápida de un jugador de la clasificación. Los permisos, dentro. */
export async function fichaRapidaAction(
  participantId: string,
): Promise<{ ficha?: FichaRapida; error?: string }> {
  if (typeof participantId !== "string" || !participantId) return { error: "¿De quién?" };
  try {
    return { ficha: await getFichaRapida(participantId) };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
