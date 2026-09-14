"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  isAdmin,
  requireAdmin,
  requireOrganizador,
  type CurrentUser,
} from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { FormState } from "@/app/actions/auth";

/**
 * Las cuentas.
 *
 * Hay dos niveles y conviene no mezclarlos:
 *
 * - Un **administrador global** hace lo que quiera con cualquier cuenta.
 * - Un **organizador** da de alta a la gente que juega con él y puede
 *   arreglarles la contraseña o borrar una cuenta que creó mal. Solo las
 *   **suyas** (`creadoPorId`), y siempre como jugadores: repartir permisos de
 *   administrador no es cosa suya.
 */

/** ¿Puede este usuario tocar esa cuenta? Un admin sí; un organizador, la suya. */
async function puedeTocarLaCuenta(quien: CurrentUser, userId: string) {
  if (isAdmin(quien)) return true;
  const cuenta = await prisma.user.findUnique({
    where: { id: userId },
    select: { creadoPorId: true, role: true },
  });
  if (!cuenta) return false;
  // Una cuenta de administrador no la toca un organizador ni habiéndola creado
  return cuenta.role !== ROLES.ADMIN && cuenta.creadoPorId === quien.id;
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const quien = await requireOrganizador();
  const esAdminGlobal = isAdmin(quien);

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Un organizador da de alta jugadores, no administradores
  const role =
    esAdminGlobal && String(formData.get("role") ?? ROLES.PLAYER) === ROLES.ADMIN
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
      // Queda apuntado para que su organizador pueda arreglarle la contraseña
      creadoPorId: esAdminGlobal ? null : quien.id,
    },
  });

  revalidatePath("/admin");
  return { success: `Usuario ${username} creado.` };
}

export async function resetUserPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const quien = await requireOrganizador();

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (!(await puedeTocarLaCuenta(quien, userId))) {
    return { error: "Esa cuenta no es tuya." };
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

/**
 * Dar o quitar el permiso de organizador. **Solo un administrador global**: es
 * justo la puerta que decide quién puede montar lockes, así que no puede
 * abrirla quien ya la ha cruzado.
 */
export async function cambiarPermisoDeLockesAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { puedeCrearLockes: true },
  });
  if (!usuario) return;

  await prisma.user.update({
    where: { id: userId },
    data: { puedeCrearLockes: !usuario.puedeCrearLockes },
  });
  revalidatePath("/admin");
}

export async function deleteUserAction(formData: FormData) {
  const quien = await requireOrganizador();
  const userId = String(formData.get("userId") ?? "");
  if (userId === quien.id) return;
  if (!(await puedeTocarLaCuenta(quien, userId))) return;

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}
