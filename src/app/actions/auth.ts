"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, requireUser } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { imagenEditada } from "@/lib/image";
import { guardarPorContenido } from "@/lib/almacen-de-imagenes";
import { getTheme, isThemeId } from "@/lib/themes";

export type FormState = { error?: string; success?: string } | null;

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Escribe usuario y contraseña." };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  // Mismo mensaje en ambos casos para no revelar qué usuarios existen
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  });
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changeMyPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");

  if (next.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next) },
  });

  return { success: "Contraseña actualizada." };
}

export async function updateMyThemeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const theme = String(formData.get("theme") ?? "");

  if (!isThemeId(theme)) return { error: "Ese tema no existe." };

  await prisma.user.update({ where: { id: me.id }, data: { theme } });
  return { success: `Tema cambiado a ${getTheme(theme).name}.` };
}

export async function updateMyProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const avatarColor = String(formData.get("avatarColor") ?? "").trim();

  if (!displayName) return { error: "El nombre no puede estar vacío." };

  await prisma.user.update({
    where: { id: me.id },
    data: {
      displayName,
      // Al almacén como todo lo demás: una foto repetida se guarda una vez
      avatarImage: await guardarPorContenido(
        imagenEditada(formData.get("avatarImage")),
      ),
      ...(/^#[0-9a-fA-F]{6}$/.test(avatarColor) ? { avatarColor } : {}),
    },
  });

  return { success: "Perfil actualizado." };
}
