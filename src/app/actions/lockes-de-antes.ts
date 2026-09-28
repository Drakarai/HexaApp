"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { esCreador, puedeCrearLockes, requireUser } from "@/lib/auth";
import type { FormState } from "@/app/actions/auth";
import {
  cuentasQuePuedeApuntar,
  leerEleccion,
  leerNombres,
  montarJugadores,
} from "@/lib/lockes-de-antes";

/**
 * Los lockes que se jugaron antes de que existiera la aplicación.
 *
 * Se apuntan a mano porque de aquello no quedó nada: solo quién ganó, a quién y
 * cuándo. Lo demás —bajas, combates, puntos— no se inventa, así que en el
 * palmarés esas líneas salen con sus cifras en blanco.
 *
 * Lo apunta **quien puede montar lockes**: el Creador o un organizador. Y cada
 * uno edita y borra lo que apuntó; el Creador, lo que sea. Puede haber
 * jugadores sin cuenta (ver lib/lockes-de-antes.ts).
 */

async function quienPuedeApuntar() {
  const user = await requireUser();
  if (!esCreador(user) && !puedeCrearLockes(user)) {
    throw new Error("Solo quien puede montar lockes apunta los de antes.");
  }
  return user;
}

/**
 * Apunta un locke de antes o, si llega `id`, lo edita. Es la misma pantalla y
 * las mismas reglas; editar solo añade comprobar que es suyo.
 */
export async function guardarLockeDeAntesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await quienPuedeApuntar();
  } catch (error) {
    return { error: (error as Error).message };
  }

  const id = String(formData.get("id") ?? "").trim();
  const antes = id
    ? await prisma.lockeDeAntes.findUnique({
        where: { id },
        select: { createdById: true, jugadoresIds: true },
      })
    : null;
  if (id) {
    if (!antes) return { error: "Ese locke ya no está apuntado." };
    // Cada uno lo suyo; el Creador, lo que sea
    if (!esCreador(user) && antes.createdById !== user.id) {
      return { error: "Solo puede cambiarlo quien lo apuntó." };
    }
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Ponle nombre al locke." };

  const cuandoRaw = String(formData.get("cuando") ?? "").trim();
  const cuando = cuandoRaw ? new Date(cuandoRaw) : new Date();
  if (Number.isNaN(cuando.getTime())) return { error: "Esa fecha no vale." };

  /**
   * "Este nombre sin cuenta ya es esta cuenta": llegan como `vincular:<nombre>`
   * con el identificador de la cuenta, solo al editar.
   */
  const vinculos = new Map<string, string>();
  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("vincular:") && String(valor)) {
      vinculos.set(clave.slice("vincular:".length), String(valor));
    }
  }

  const montado = montarJugadores({
    cuentas: formData.getAll("jugadoresIds").map(String),
    nombres: leerNombres(String(formData.get("sinCuenta") ?? "")),
    ganador: leerEleccion(String(formData.get("ganador") ?? "")),
    subcampeon: leerEleccion(String(formData.get("subcampeon") ?? "")),
    vinculos,
  });
  if ("error" in montado) return montado;

  /**
   * Las cuentas, comprobadas: los identificadores los manda el navegador. Que
   * existan, y que un organizador no cuele a nadie que no pueda ver; las que ya
   * estaban en el locke se respetan, que si no editarlo las quitaría.
   */
  const existentes = await prisma.user.count({ where: { id: { in: montado.jugadoresIds } } });
  if (existentes !== montado.jugadoresIds.length) {
    return { error: "Alguna de esas cuentas ya no existe." };
  }
  if (!esCreador(user)) {
    const permitidas = new Set([
      ...(await cuentasQuePuedeApuntar(user)).map((c) => c.id),
      ...(antes?.jugadoresIds ?? []),
    ]);
    if (montado.jugadoresIds.some((cuenta) => !permitidas.has(cuenta))) {
      return { error: "Alguna de esas cuentas no la puedes apuntar." };
    }
  }

  const datos = {
    nombre,
    juego: String(formData.get("juego") ?? "").trim() || null,
    cuando,
    notas: String(formData.get("notas") ?? "").trim() || null,
    ...montado,
  };
  if (id) {
    await prisma.lockeDeAntes.update({ where: { id }, data: datos });
  } else {
    await prisma.lockeDeAntes.create({ data: { ...datos, createdById: user.id } });
  }

  revalidatePath("/palmares");
  return { success: id ? `${nombre} actualizado.` : `${nombre} apuntado en el palmarés.` };
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
