"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { borrarPuntosHuerfanos } from "@/lib/puntos-huerfanos";
import {
  hashPassword,
  esCreador,
  requireCreador,
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
 * - El **Creador** hace lo que quiera con cualquier cuenta.
 * - Un **organizador** da de alta a la gente que juega con él y puede
 *   arreglarles la contraseña o borrar una cuenta que creó mal. Solo las
 *   **suyas** (`creadoPorId`), y siempre como jugadores: repartir el papel de
 *   Creador no es cosa suya.
 */

/** ¿Puede este usuario tocar esa cuenta? El Creador sí; un organizador, la suya. */
async function puedeTocarLaCuenta(quien: CurrentUser, userId: string) {
  if (esCreador(quien)) return true;
  const cuenta = await prisma.user.findUnique({
    where: { id: userId },
    select: { creadoPorId: true, role: true },
  });
  if (!cuenta) return false;
  // La cuenta del Creador no la toca un organizador ni habiéndola creado
  return !esCreador(cuenta) && cuenta.creadoPorId === quien.id;
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const quien = await requireOrganizador();
  const mandaEnTodo = esCreador(quien);

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Un organizador da de alta jugadores, y nada más
  const role =
    mandaEnTodo &&
    String(formData.get("role") ?? ROLES.PLAYER) === ROLES.CREADOR
      ? ROLES.CREADOR
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
      creadoPorId: mandaEnTodo ? null : quien.id,
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

/** Hace o deshace un Creador. Solo otro Creador. */
export async function updateUserRoleAction(formData: FormData) {
  const quien = await requireCreador();
  const userId = String(formData.get("userId") ?? "");
  const role =
    String(formData.get("role") ?? ROLES.PLAYER) === ROLES.CREADOR
      ? ROLES.CREADOR
      : ROLES.PLAYER;

  /**
   * Nadie puede dejar la aplicación sin Creador, ni siquiera quitándose el
   * papel a sí mismo: no quedaría nadie que pudiera devolvérselo a nadie.
   */
  if (role !== ROLES.CREADOR) {
    const otros = await prisma.user.count({
      where: {
        id: { not: userId },
        role: { in: [ROLES.CREADOR, ROLES.ADMIN_ANTIGUO] },
      },
    });
    if (otros === 0) return;
  }
  // Y tampoco se puede quitar a otro si quien lo intenta no manda en todo
  if (!esCreador(quien)) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}

/**
 * Dar o quitar el permiso de organizador. **Solo el Creador**: es justo la
 * puerta que decide quién puede montar lockes, así que no puede abrirla quien
 * ya la ha cruzado.
 */
export async function cambiarPermisoDeLockesAction(formData: FormData) {
  await requireCreador();
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

  // Los lockes en los que jugaba, para limpiar después los puntos de sus combates
  const suyos = await prisma.participant.findMany({
    where: { userId },
    select: { competitionId: true },
  });
  await prisma.user.delete({ where: { id: userId } });
  for (const { competitionId } of suyos) await borrarPuntosHuerfanos(competitionId);
  revalidatePath("/admin");
}
