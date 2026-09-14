"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  deduplicarImagenes,
  tirarImagenesHuerfanas,
} from "@/lib/deduplicar-imagenes";
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
