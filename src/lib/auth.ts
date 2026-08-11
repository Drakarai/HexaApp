import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { urlDeImagen } from "@/lib/imagen-url";
import { ROLES } from "@/lib/constants";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarColor: string;
  /** Dirección de la foto de perfil, no la foto: ver lib/imagen-url.ts */
  avatarImage: string | null;
  theme: string;
};

/**
 * Usuario de la petición actual, o null si no hay sesión válida.
 *
 * Va en SQL directo por la foto: se pide su resumen en vez de la foto entera,
 * que son 15 KB que antes se leían en cada página solo para pintar el avatar
 * de la cabecera.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const filas = await prisma.$queryRaw<
    (Omit<CurrentUser, "avatarImage"> & { firma: string | null })[]
  >`
    select "id", "username", "displayName", "role", "avatarColor", "theme",
           substr(md5("avatarImage"), 1, 10) as firma
    from "User"
    where "id" = ${session.userId}
  `;

  const user = filas[0];
  if (!user) return null;

  const { firma, ...resto } = user;
  return { ...resto, avatarImage: urlDeImagen("avatar", user.id, firma) };
});

/** Igual que getCurrentUser pero redirige al login si no hay sesión. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Para las **acciones**: lanza, y quien la llama enseña el mensaje en su
 * formulario. En una página no vale, porque un error a medio pintar sale como
 * pantalla de fallo: para eso está `requireAdminPage`.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) {
    throw new Error("Necesitas permisos de administrador para hacer esto.");
  }
  return user;
}

/**
 * Para las **páginas** de solo administradores: al que no lo sea se le devuelve
 * al resumen. Antes esto lanzaba un error y Next lo convertía en una pantalla
 * de fallo, en inglés y sin la barra de navegación, en vez de llevarte a un
 * sitio con sentido.
 */
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) redirect("/");
  return user;
}

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === ROLES.ADMIN;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
