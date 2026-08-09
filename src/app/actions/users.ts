"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { FormState } from "@/app/actions/auth";

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role =
    String(formData.get("role") ?? ROLES.PLAYER) === ROLES.ADMIN
      ? ROLES.ADMIN
      : ROLES.PLAYER;

  if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
    return {
      error:
        "El usuario debe tener entre 3 y 20 caracteres (letras, números, . _ -).",
    };
  }
  if (!displayName) return { error: "Escribe el nombre visible." };
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { error: "Ese usuario ya existe." };

  await prisma.user.create({
    data: {
      username,
      displayName,
      role,
      passwordHash: await hashPassword(password),
      avatarColor: String(formData.get("avatarColor") ?? "").trim() || "#6366f1",
    },
  });

  revalidatePath("/admin");
  return { success: `Usuario ${username} creado.` };
}

export async function resetUserPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Usuario no encontrado." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin");
  return { success: `Contraseña de ${user.username} restablecida.` };
}

export async function updateUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role =
    String(formData.get("role") ?? ROLES.PLAYER) === ROLES.ADMIN
      ? ROLES.ADMIN
      : ROLES.PLAYER;

  // Evita quedarse sin ningún administrador
  if (userId === admin.id && role !== ROLES.ADMIN) {
    const otherAdmins = await prisma.user.count({
      where: { role: ROLES.ADMIN, id: { not: admin.id } },
    });
    if (otherAdmins === 0) return;
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.id) return;

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}
