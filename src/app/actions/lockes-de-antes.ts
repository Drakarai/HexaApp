"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { esCreador, puedeCrearLockes, requireUser } from "@/lib/auth";
import type { FormState } from "@/app/actions/auth";

/**
 * Los lockes que se jugaron antes de que existiera la aplicación.
 *
 * Se apuntan a mano porque de aquello no quedó nada: solo quién ganó, a quién y
 * cuándo. Lo demás —bajas, combates, puntos— no se inventa, así que en el
 * palmarés esas líneas salen con sus cifras en blanco.
 *
 * Lo apunta **quien puede montar lockes**: el Creador o un organizador. Y cada
 * uno borra lo que apuntó; el Creador, lo que sea.
 */

async function quienPuedeApuntar() {
  const user = await requireUser();
  if (!esCreador(user) && !puedeCrearLockes(user)) {
    throw new Error("Solo quien puede montar lockes apunta los de antes.");
  }
  return user;
}

export async function apuntarLockeDeAntesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await quienPuedeApuntar();
  } catch (error) {
    return { error: (error as Error).message };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Ponle nombre al locke." };

  const ganadorId = String(formData.get("ganadorId") ?? "").trim();
  if (!ganadorId) return { error: "Elige quién lo ganó." };

  const subcampeonRaw = String(formData.get("subcampeonId") ?? "").trim();
  const subcampeonId =
    subcampeonRaw && subcampeonRaw !== ganadorId ? subcampeonRaw : null;

  const cuandoRaw = String(formData.get("cuando") ?? "").trim();
  const cuando = cuandoRaw ? new Date(cuandoRaw) : new Date();
  if (Number.isNaN(cuando.getTime())) return { error: "Esa fecha no vale." };

  /**
   * Quiénes lo jugaron decide **quién lo ve**. El ganador y el subcampeón
   * entran siempre: no tendría sentido apuntar que alguien ganó un locke y que
   * él no lo viera en su palmarés.
   */
  const marcados = formData.getAll("jugadoresIds").map(String).filter(Boolean);
  const jugadoresIds = [
    ...new Set([...marcados, ganadorId, ...(subcampeonId ? [subcampeonId] : [])]),
  ];

  // Que existan de verdad: los identificadores los manda el navegador
  const cuantos = await prisma.user.count({ where: { id: { in: jugadoresIds } } });
  if (cuantos !== jugadoresIds.length) {
    return { error: "Alguna de esas cuentas ya no existe." };
  }

  await prisma.lockeDeAntes.create({
    data: {
      nombre,
      juego: String(formData.get("juego") ?? "").trim() || null,
      cuando,
      ganadorId,
      subcampeonId,
      jugadoresIds,
      notas: String(formData.get("notas") ?? "").trim() || null,
      createdById: user.id,
    },
  });

  revalidatePath("/palmares");
  return { success: `${nombre} apuntado en el palmarés.` };
}

export async function borrarLockeDeAntesAction(formData: FormData) {
  const user = await quienPuedeApuntar();
  const id = String(formData.get("id") ?? "");

  const apuntado = await prisma.lockeDeAntes.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!apuntado) return;
  // Cada uno lo suyo; el Creador, lo que sea
  if (!esCreador(user) && apuntado.createdById !== user.id) return;

  await prisma.lockeDeAntes.delete({ where: { id } });
  revalidatePath("/palmares");
}
