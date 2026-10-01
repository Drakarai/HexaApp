"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreador } from "@/lib/auth";

/** Dar por arreglado un fallo: se borran todas sus apariciones */
export async function resolverErrorAction(formData: FormData) {
  await requireCreador();
  const huella = String(formData.get("huella") ?? "");
  if (!huella) return;
  await prisma.errorDeApp.deleteMany({ where: { huella } });
  revalidatePath("/diagnostico");
}

/** Vaciar el registro entero */
export async function vaciarErroresAction() {
  await requireCreador();
  await prisma.errorDeApp.deleteMany({});
  revalidatePath("/diagnostico");
}
