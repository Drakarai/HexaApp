"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { esCreador, requireCreador, requireUser } from "@/lib/auth";
import { conPermiso } from "@/lib/permiso";
import { guardarPorContenido } from "@/lib/almacen-de-imagenes";
import { MAX_IMAGE_CHARS } from "@/lib/image";
import {
  ESTADOS_DE_SUGERENCIA,
  LIMITES_DEL_BUZON,
  esEstadoDeSugerencia,
  puedeMandarOtra,
  validarSugerencia,
} from "@/lib/buzon";
import type { FormState } from "@/app/actions/auth";

/**
 * Mandar, contestar y retirar lo del Buzón (ver `lib/buzon.ts`).
 *
 * Quién toca qué se comprueba aquí, no en la pantalla: cada uno manda y retira
 * **lo suyo** (por eso todo filtra por `userId`), y contestar o cambiar el
 * estado es solo del Creador.
 */

function refrescar() {
  revalidatePath("/buzon");
  // El punto de aviso del menú vive en el layout
  revalidatePath("/", "layout");
}

export async function enviarSugerenciaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const validada = validarSugerencia({
    tipo: String(formData.get("tipo") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    texto: String(formData.get("texto") ?? ""),
    pantalla: String(formData.get("pantalla") ?? ""),
  });
  if ("error" in validada) return validada;

  const enUnDia = await prisma.sugerencia.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (!puedeMandarOtra(enUnDia)) {
    return {
      error: `Ya has mandado ${LIMITES_DEL_BUZON.alDia} hoy. Si tienes más cosas, júntalas en una o espera a mañana.`,
    };
  }

  /**
   * La captura solo puede ser una imagen subida desde el formulario (un data
   * URL que ha reducido el navegador). Un enlace a una imagen de fuera no: no
   * se sabe qué hay detrás ni cuánto va a durar.
   */
  const crudo = String(formData.get("imagen") ?? "").trim();
  let imagen: string | null = null;
  if (crudo) {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(crudo)) {
      return { error: "La captura tiene que ser una imagen subida desde el móvil o el ordenador." };
    }
    if (crudo.length > MAX_IMAGE_CHARS) return { error: "La captura es demasiado grande." };
    imagen = (await guardarPorContenido(crudo)) ?? null;
  }

  const dispositivo = String(formData.get("dispositivo") ?? "").trim().slice(0, LIMITES_DEL_BUZON.dispositivo);

  await prisma.sugerencia.create({
    data: {
      userId: user.id,
      ...validada.datos,
      imagen,
      dispositivo: dispositivo || null,
    },
  });
  refrescar();
  return { success: "¡Recibido! Aquí abajo verás cuándo la leen y qué te contestan." };
}

/** Retirar una propia, mientras nadie la haya leído todavía */
export async function retirarSugerenciaAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.sugerencia.deleteMany({
    where: { id, userId: user.id, estado: ESTADOS_DE_SUGERENCIA.NUEVA },
  });
  refrescar();
}

/** El Creador cambia el estado y, si quiere, contesta */
export async function contestarSugerenciaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const [creador, sinPermiso] = await conPermiso(requireCreador());
  if (sinPermiso) return sinPermiso;

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!esEstadoDeSugerencia(estado) || estado === ESTADOS_DE_SUGERENCIA.NUEVA) {
    return { error: "Ese estado no existe." };
  }
  const respuesta = String(formData.get("respuesta") ?? "").trim();
  if (respuesta.length > LIMITES_DEL_BUZON.respuesta) {
    return { error: `La respuesta es muy larga: hasta ${LIMITES_DEL_BUZON.respuesta} letras.` };
  }

  const antes = await prisma.sugerencia.findUnique({
    where: { id },
    select: { estado: true, respuesta: true, userId: true },
  });
  if (!antes) return { error: "Esa ya no está: la habrán retirado." };
  const nueva = respuesta || null;
  const cambia = antes.estado !== estado || (antes.respuesta ?? null) !== nueva;
  if (!cambia) return { success: "No había nada que cambiar." };

  await prisma.sugerencia.update({
    where: { id },
    data: {
      estado,
      respuesta: nueva,
      // Que se entere quien la mandó, salvo que sea la suya
      vistaPorAutor: antes.userId === creador.id,
    },
  });
  refrescar();
  return { success: "Guardado." };
}

/**
 * Al abrir el Buzón el Creador, las que acaban de llegar pasan a **Leídas**.
 * Así quien la mandó sabe que alguien la ha visto, sin que el Creador tenga
 * que tocar una a una. No enciende el aviso de nadie: es un acuse de recibo,
 * no una respuesta.
 */
export async function marcarSugerenciasLeidasAction() {
  const user = await requireUser();
  if (!esCreador(user)) return;
  await prisma.sugerencia.updateMany({
    where: { estado: ESTADOS_DE_SUGERENCIA.NUEVA },
    data: { estado: ESTADOS_DE_SUGERENCIA.LEIDA },
  });
}

/**
 * Quien entra en el Buzón ya ha visto lo que le han contestado.
 *
 * Ni esta ni la de arriba revalidan, como `marcarVistaAction`: estando dentro
 * el punto del menú ya no se pinta, y refrescar la página le quitaría al
 * Creador las marcas de «Nueva» de lo que está leyendo.
 */
export async function marcarRespuestasVistasAction() {
  const user = await requireUser();
  await prisma.sugerencia.updateMany({
    where: { userId: user.id, vistaPorAutor: false },
    data: { vistaPorAutor: true },
  });
}

/** El Creador puede tirar las que no sirven (spam, repetidas…) */
export async function borrarSugerenciaAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("id") ?? "");
  await prisma.sugerencia.deleteMany({ where: { id } });
  refrescar();
}
