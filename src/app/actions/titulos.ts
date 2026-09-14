"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { esCreador, getCurrentUser, requireCreador } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { FormState } from "@/app/actions/auth";

/**
 * Títulos: los inventa un administrador y los reparte a quien quiera. Son
 * **solo estéticos** —ni puntos, ni ventajas, ni cuentan para la
 * clasificación—, así que aquí no hay más regla que quién puede tocarlos.
 */

/** Refresca todo lo que enseña un título: los perfiles y la administración. */
function refrescar() {
  revalidatePath("/admin");
  revalidatePath("/perfil");
  revalidatePath("/jugador", "layout");
}

export async function crearTituloAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCreador();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El título necesita un nombre." };
  if (name.length > 60) return { error: "Ese nombre es demasiado largo." };

  await prisma.title.create({
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      // Un emoji o dos como mucho: la chapa es pequeña
      icon: String(formData.get("icon") ?? "").trim().slice(0, 4) || null,
      color: String(formData.get("color") ?? "").trim() || "#a78bfa",
    },
  });

  refrescar();
  return { success: `Título "${name}" creado.` };
}

export async function editarTituloAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("titleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  await prisma.title.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      icon: String(formData.get("icon") ?? "").trim().slice(0, 4) || null,
      color: String(formData.get("color") ?? "").trim() || "#a78bfa",
    },
  });
  refrescar();
}

/** Borra el título y, en cascada, todas sus concesiones. */
export async function borrarTituloAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("titleId") ?? "");
  if (id) await prisma.title.delete({ where: { id } });
  refrescar();
}

export async function concederTituloAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireCreador();

  const titleId = String(formData.get("titleId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!titleId || !userId) return { error: "Elige el título y a quién se lo das." };

  const [titulo, usuario] = await Promise.all([
    prisma.title.findUnique({ where: { id: titleId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
  ]);
  if (!titulo || !usuario) return { error: "Ese título o ese usuario ya no está." };

  const yaLoTiene = await prisma.titleAward.findUnique({
    where: { titleId_userId: { titleId, userId } },
  });
  if (yaLoTiene) {
    return { error: `${usuario.displayName} ya tiene "${titulo.name}".` };
  }

  await prisma.titleAward.create({
    data: {
      titleId,
      userId,
      note: String(formData.get("note") ?? "").trim() || null,
      awardedById: admin.id,
    },
  });

  refrescar();
  return { success: `"${titulo.name}" para ${usuario.displayName}.` };
}

export async function revocarTituloAction(formData: FormData) {
  await requireCreador();
  const id = String(formData.get("awardId") ?? "");
  if (id) await prisma.titleAward.delete({ where: { id } });
  refrescar();
}

/**
 * Poner o quitar el título que se lleva debajo del nombre.
 *
 * Lo puede hacer **el dueño o un administrador**: cada uno elige el suyo, pero
 * el admin también puede ponerle uno a alguien. Apagar los demás y encender el
 * elegido va en la misma transacción, que es lo que garantiza que no acabe
 * habiendo dos puestos a la vez.
 */
export async function equiparTituloAction(formData: FormData) {
  const usuario = await getCurrentUser();
  if (!usuario) return;

  const awardId = String(formData.get("awardId") ?? "");
  // Sin concesión = quitarse el que lleve; hace falta saber de quién
  const userId = String(formData.get("userId") ?? "");

  const dueno = awardId
    ? (
        await prisma.titleAward.findUnique({
          where: { id: awardId },
          select: { userId: true },
        })
      )?.userId
    : userId;
  if (!dueno) return;

  const puede = dueno === usuario.id || esCreador(usuario);
  if (!puede) return;

  await prisma.$transaction([
    prisma.titleAward.updateMany({
      where: { userId: dueno, equipped: true },
      data: { equipped: false },
    }),
    ...(awardId
      ? [
          prisma.titleAward.update({
            where: { id: awardId },
            data: { equipped: true },
          }),
        ]
      : []),
  ]);

  refrescar();
}
