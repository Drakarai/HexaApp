"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { esCreador, esVerComo, getCurrentUser, VER_COMO } from "@/lib/auth";

/**
 * Ponerse otro papel (ver `VER_COMO` en lib/auth.ts). Solo el Creador: se
 * mira **antes** de ponérselo, que después ya no lo parece.
 */
export async function verComoAction(formData: FormData) {
  const modo = String(formData.get("modo") ?? "");
  const user = await getCurrentUser();
  if (!user || !esCreador(user) || !esVerComo(modo)) return;
  (await cookies()).set(VER_COMO, modo, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    // Unas horas: que no se quede uno de jugador para siempre sin darse cuenta
    maxAge: 60 * 60 * 6,
  });
  revalidatePath("/", "layout");
  redirect("/");
}

/** Volver a ser Creador. Lo puede pulsar cualquiera: quitar la cookie no da nada */
export async function dejarDeVerComoAction() {
  (await cookies()).delete(VER_COMO);
  revalidatePath("/", "layout");
  redirect("/diagnostico?ver=ver-como");
}
