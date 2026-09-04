"use server";

import { requireUser } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { marcarVista } from "@/lib/novedades";

/**
 * "Ya he mirado esta pestaña". La llama el navegador al entrar en cualquier
 * página del grupo.
 *
 * **No revalida nada a propósito**: el punto de la pestaña donde estás ya no
 * se dibuja —estás dentro, no hace falta que te avisen de ella—, así que
 * refrescar el layout entero solo serviría para volver a montar el componente
 * que llama a esto y entrar en bucle.
 */
export async function marcarVistaAction(tab: string) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return;
  await marcarVista(user.id, competition.id, tab);
}
