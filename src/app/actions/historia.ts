"use server";

import { getHistoria, type DeQuienEsLaHistoria, type Historia } from "@/lib/historia-servidor";

/**
 * La historia de un pokémon, para la ficha que se acaba de abrir. Va aparte y
 * se pide al abrir, no con la página: son varias consultas que solo interesan
 * del pokémon que se mira. Los permisos, dentro de `getHistoria`.
 */
export async function historiaAction(
  de: DeQuienEsLaHistoria,
): Promise<{ historia?: Historia; error?: string }> {
  // Lo que llega del navegador se puede falsear: solo lo que se espera
  if (!de || !["captura", "baja", "hall"].includes(de.tipo) || typeof de.id !== "string" || !de.id) {
    return { error: "No se sabe de qué pokémon." };
  }
  try {
    return { historia: await getHistoria({ tipo: de.tipo, id: de.id }) };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
