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
  /** Permiso de organizador: puede montar sus propios lockes */
  puedeCrearLockes: boolean;
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
           "puedeCrearLockes",
           case
             when nullif("avatarImage", '') is null then null
             when "avatarImage" like 'ref:%' then "avatarImage"
             else substr(md5("avatarImage"), 1, 10)
           end as firma
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
 * Para las **acciones** que son de la aplicación entera: lanza, y quien la
 * llama enseña el mensaje en su formulario. En una página no vale, porque un
 * error a medio pintar sale como pantalla de fallo: para eso está
 * `requireCreadorPage`.
 */
export async function requireCreador(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!esCreador(user)) {
    throw new Error("Esto solo lo puede hacer quien lleva la aplicación.");
  }
  return user;
}

/**
 * Para las **páginas** que son solo del Creador: al que no lo sea se le
 * devuelve al resumen. Antes esto lanzaba un error y Next lo convertía en una
 * pantalla de fallo, en inglés y sin la barra de navegación, en vez de llevarte
 * a un sitio con sentido.
 */
export async function requireCreadorPage(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!esCreador(user)) redirect("/");
  return user;
}

/**
 * Quien lleva la aplicación: lo ve y lo toca todo.
 *
 * **No confundir con ser administrador de un locke**, que es otra cosa y vive
 * en `Participant.isAdmin`: manda dentro de su edición y en nada más. Para eso
 * está `canManageCompetition`.
 *
 * Se acepta también el `"ADMIN"` de antes, que es como estaba escrito el papel
 * cuando el Creador se llamaba administrador global. Sin esto, el cambio de
 * nombre dejaría a quien lleva la aplicación fuera de su propia aplicación.
 */
export function esCreador(user: { role: string } | null | undefined) {
  return user?.role === ROLES.CREADOR || user?.role === ROLES.ADMIN_ANTIGUO;
}

/**
 * ¿Puede montar lockes? Los administradores globales siempre; los demás, si un
 * administrador les ha dado el permiso de organizador.
 *
 * Un organizador **no es medio administrador**: con esto solo puede crear sus
 * lockes y dar de alta a la gente que juega con él. Los mapas, el catálogo de
 * objetos, las plantillas y las copias de seguridad siguen siendo de los
 * administradores globales, y los lockes de los demás no los ve, porque eso lo
 * decide `filtroDeLockesVisibles` y no este permiso.
 */
export function puedeCrearLockes(
  user: { role: string; puedeCrearLockes?: boolean } | null | undefined,
) {
  if (!user) return false;
  return esCreador(user) || user.puedeCrearLockes === true;
}

/** Para las acciones que montan un locke o dan de alta a quien lo juega. */
export async function requireOrganizador(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!puedeCrearLockes(user)) {
    throw new Error("No tienes permiso para crear lockes.");
  }
  return user;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
