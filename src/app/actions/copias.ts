"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreador } from "@/lib/auth";
import {
  crearCopia,
  esVolcadoValido,
  leerCopia,
  restaurarVolcado,
} from "@/lib/copias";
import type { FormState } from "@/app/actions/auth";

/** Lo que hay que escribir para restaurar. Sin esto, un clic sin querer borra. */
const PALABRA = "RESTAURAR";

/** Tope del fichero que se sube, para no comerse la memoria de la función. */
const MAXIMO_FICHERO = 60 * 1024 * 1024;

export async function crearCopiaAction(): Promise<FormState> {
  const admin = await requireCreador();
  const copia = await crearCopia("manual", admin.displayName);
  revalidatePath("/admin");
  if (!copia) return { error: "Justo ahora se estaba haciendo otra copia." };
  return {
    success: `Copia hecha: ${(copia.rawSize / 1024 / 1024).toFixed(1)} MB.`,
  };
}

export async function borrarCopiaAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("copiaId") ?? "");
  if (id) await prisma.backup.delete({ where: { id } });
  revalidatePath("/admin");
}

/**
 * Restaura una copia guardada. Antes de tocar nada se hace otra copia del
 * estado actual: si la restauración era la equivocada, todavía se puede volver.
 */
export async function restaurarCopiaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireCreador();

  if (String(formData.get("confirmacion") ?? "").trim() !== PALABRA) {
    return { error: `Para restaurar hay que escribir ${PALABRA} en la casilla.` };
  }

  const id = String(formData.get("copiaId") ?? "");
  const volcado = await leerCopia(id);
  if (!volcado) return { error: "Esa copia ya no está." };
  if (!esVolcadoValido(volcado)) {
    return { error: "Esa copia está estropeada y no se puede usar." };
  }

  try {
    await crearCopia("previa", admin.displayName);
    const hecho = await restaurarVolcado(volcado);
    revalidatePath("/", "layout");
    return {
      success: `Restaurado: ${hecho.filas} filas en ${hecho.tablas} tablas. Antes se guardó una copia de cómo estaba.`,
    };
  } catch (error) {
    return {
      error: `No se ha restaurado nada: ${(error as Error).message}`,
    };
  }
}

/**
 * Restaura desde un fichero descargado. Es la única salida si la base de datos
 * entera se pierde: la copia de dentro se habría ido con ella.
 */
export async function restaurarFicheroAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireCreador();

  if (String(formData.get("confirmacion") ?? "").trim() !== PALABRA) {
    return { error: `Para restaurar hay que escribir ${PALABRA} en la casilla.` };
  }

  const fichero = formData.get("fichero");
  if (!(fichero instanceof File) || fichero.size === 0) {
    return { error: "Elige el fichero .json de la copia." };
  }
  if (fichero.size > MAXIMO_FICHERO) {
    return { error: "Ese fichero es demasiado grande para restaurarlo aquí." };
  }

  let volcado: unknown;
  try {
    volcado = JSON.parse(await fichero.text());
  } catch {
    return { error: "Ese fichero no es un JSON válido." };
  }
  if (!esVolcadoValido(volcado)) {
    return { error: "Ese fichero no es una copia de HexaApp." };
  }

  try {
    await crearCopia("previa", admin.displayName);
    const hecho = await restaurarVolcado(volcado);
    revalidatePath("/", "layout");
    return {
      success: `Restaurado desde el fichero: ${hecho.filas} filas en ${hecho.tablas} tablas.`,
    };
  } catch (error) {
    return { error: `No se ha restaurado nada: ${(error as Error).message}` };
  }
}
