"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Más que suficiente para cualquier grupo; es solo un tope contra abusos. */
const MAXIMO_DE_OCULTOS = 500;

/**
 * Guarda a quién ha quitado alguien de **su propio** palmarés. Solo toca la
 * fila de quien lo pide: no hay nada que comprobar sobre los demás, porque
 * quitar a alguien de tu lista no le afecta a él.
 */
export async function guardarOcultosDelPalmaresAction(ocultos: string[]) {
  const yo = await requireUser();
  const limpios = [
    ...new Set(
      (Array.isArray(ocultos) ? ocultos : [])
        .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 64)
        // A uno mismo no se le quita: el palmarés es suyo
        .filter((id) => id !== yo.id),
    ),
  ].slice(0, MAXIMO_DE_OCULTOS);

  await prisma.user.update({
    where: { id: yo.id },
    data: { palmaresOcultos: limpios },
  });
  revalidatePath("/palmares");
}
