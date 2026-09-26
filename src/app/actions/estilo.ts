"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  COOKIE_DE_ESTILO,
  ESTILO_POR_DEFECTO,
  ESTILOS,
  type Estilo,
} from "@/lib/estilo";

/** Cambia el aspecto de la aplicación en este dispositivo. */
export async function cambiarEstiloAction(formData: FormData) {
  const pedido = String(formData.get("estilo") ?? "");
  const estilo: Estilo = ESTILOS.includes(pedido as Estilo)
    ? (pedido as Estilo)
    : ESTILO_POR_DEFECTO;
  (await cookies()).set(COOKIE_DE_ESTILO, estilo, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Lo lleva el <html>: hay que repintar desde la raíz
  revalidatePath("/", "layout");
}
