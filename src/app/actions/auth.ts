"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, requireUser } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { imagenEditada } from "@/lib/image";
import { guardarPorContenido } from "@/lib/almacen-de-imagenes";
import { getTheme, isThemeId } from "@/lib/themes";
import { destinoSeguro } from "@/lib/volver";
import { apuntarFallo, esperaParaEntrar, olvidarFallos } from "@/lib/intentos-de-entrada";
import { problemaDeContrasena } from "@/lib/seguridad";

/**
 * Con qué se compara cuando el usuario no existe: así tarda lo mismo que con
 * uno que sí, y por el tiempo de respuesta no se puede saber qué cuentas hay.
 * Es el hash de una contraseña al azar, del mismo coste que los de verdad.
 */
const HASH_DE_RELLENO = "$2b$10$MG8SBu30wnZ8Cbomc5eZ9uSxJ1fbpkx0BZXOi4pg6tqAbFbVUsCU2";

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

  // Quien lleva demasiados fallos seguidos espera, aunque ahora acierte
  const espera = await esperaParaEntrar(username);
  if (espera > 0) {
    return {
      error: `Demasiados intentos fallidos. Espera ${espera} ${espera === 1 ? "minuto" : "minutos"} y vuelve a probar.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  // Se compara siempre, también sin usuario: si no, contestaría antes y se notaría
  const valida = await verifyPassword(password, user?.passwordHash ?? HASH_DE_RELLENO);
  // Mismo mensaje en ambos casos para no revelar qué usuarios existen
  if (!user || !valida) {
    await apuntarFallo(username);
    return { error: "Usuario o contraseña incorrectos." };
  }

  await olvidarFallos(username);
  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
    version: user.sesionVersion,
  });
  redirect(destinoSeguro(formData.get("volver")));
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

  const problema = problemaDeContrasena(next, me.username);
  if (problema) return { error: problema };

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  /**
   * Cambiar la contraseña **echa a los demás dispositivos**: si se cambia
   * porque alguien la sabía, que no siga dentro con la sesión que ya tenía.
   * Este sigue dentro con una sesión nueva.
   */
  const actualizado = await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), sesionVersion: { increment: 1 } },
  });
  await createSession({
    userId: actualizado.id,
    username: actualizado.username,
    role: actualizado.role,
    version: actualizado.sesionVersion,
  });

  return { success: "Contraseña cambiada. Los demás dispositivos tendrán que volver a entrar." };
}

/**
 * Para el móvil perdido o la sesión abierta en el ordenador de otro: todas las
 * sesiones de la cuenta dejan de valer menos esta.
 */
export async function cerrarOtrasSesionesAction(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const actualizado = await prisma.user.update({
    where: { id: me.id },
    data: { sesionVersion: { increment: 1 } },
  });
  await createSession({
    userId: actualizado.id,
    username: actualizado.username,
    role: actualizado.role,
    version: actualizado.sesionVersion,
  });
  return { success: "Hecho: en los demás dispositivos tendrás que volver a entrar." };
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
