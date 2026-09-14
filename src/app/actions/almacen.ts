"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  deduplicarImagenes,
  tirarImagenesHuerfanas,
} from "@/lib/deduplicar-imagenes";
import { aligerarUnaCopia } from "@/lib/copias";
import { pesar } from "@/lib/ocupacion";
import type { FormState } from "@/app/actions/auth";

/**
 * El mantenimiento del almacén de imágenes.
 *
 * Son botones y no algo automático a propósito: mueven todas las imágenes de la
 * base de datos de una vez, y eso es algo que uno quiere lanzar a sabiendas y
 * ver lo que ha hecho, no que pase solo un martes por la noche.
 */

export async function deduplicarAction(): Promise<FormState> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: (error as Error).message };
  }

  const hecho = await deduplicarImagenes();
  revalidatePath("/diagnostico");

  if (!hecho.filas) {
    return {
      success: `Ya estaba todo repartido: ${hecho.imagenes} imágenes guardadas, ${pesar(hecho.ahora)}.`,
    };
  }
  const ahorro = hecho.antes - hecho.ahora;
  return {
    success:
      `${hecho.filas} filas ahora apuntan al almacén. ` +
      `Ocupaban ${pesar(hecho.antes)} y las imágenes distintas son ${pesar(hecho.ahora)}: ` +
      `${ahorro > 0 ? `${pesar(ahorro)} menos` : "sin repetidas que quitar"}.`,
  };
}

/**
 * Aligera una copia guardada, de una en una: las de antes llevan las imágenes
 * pegadas dentro y son lo que más ocupa de toda la base de datos.
 */
export async function aligerarCopiasAction(): Promise<FormState> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: (error as Error).message };
  }

  const hecho = await aligerarUnaCopia();
  revalidatePath("/diagnostico");
  revalidatePath("/admin");

  if (!hecho) return { success: "Ya no queda ninguna copia con imágenes dentro." };
  const ahorro = hecho.antes - hecho.despues;
  return {
    success:
      `Una copia aligerada: de ${pesar(hecho.antes)} a ${pesar(hecho.despues)} ` +
      `(${pesar(ahorro)} menos). ` +
      (hecho.quedan
        ? `Quedan ${hecho.quedan}: vuelve a pulsar.`
        : "Ya están todas."),
  };
}

export async function limpiarHuerfanasAction(): Promise<FormState> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: (error as Error).message };
  }

  const tiradas = await tirarImagenesHuerfanas();
  revalidatePath("/diagnostico");
  return {
    success: tiradas
      ? `${tiradas} ${tiradas === 1 ? "imagen tirada" : "imágenes tiradas"}: ya no las usaba nadie.`
      : "No sobraba ninguna imagen.",
  };
}
