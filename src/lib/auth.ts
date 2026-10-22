import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { urlDeImagen } from "@/lib/imagen-url";
import { ROLES } from "@/lib/constants";
import { CABECERA_DE_RUTA, destinoSeguro } from "@/lib/volver";

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
  /**
   * Si el Creador está **viendo la app como otro papel** (ver `VER_COMO`):
   * entonces `role` es el de un jugador cualquiera y aquí queda cuál eligió.
   */
  verComo?: VerComo;
};

/**
 * «Ver como»: el Creador se pone en la piel de un jugador o de un espectador
 * para comprobar qué ve la gente. **No es una máscara de la pantalla**: mientras
 * dura, el servidor le trata como ese papel también en las acciones, así que
 * nada de lo que haga sale con permisos de Creador. Sigue pudiendo abrir
 * cualquier locke (ver `filtroDeLockesVisibles`), porque si no, no podría
 * mirar el de otro, pero dentro de él solo hace lo que haría ese papel.
 *
 * Es por papel y no por persona a propósito: «ver como Pablo» enseñaría su caja
 * y sus notas, que son privadas.
 */
export const VER_COMO = "hexaapp-ver-como";
export type VerComo = "jugador" | "espectador";
export function esVerComo(valor: unknown): valor is VerComo {
  return valor === "jugador" || valor === "espectador";
}

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
    (Omit<CurrentUser, "avatarImage"> & { firma: string | null; sesionVersion: number })[]
  >`
    select "id", "username", "displayName", "role", "avatarColor", "theme",
           "puedeCrearLockes", "sesionVersion",
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
  // Una sesión de antes de cambiar la contraseña (o de cerrarlas todas) ya no vale
  if ((session.version ?? 0) !== user.sesionVersion) return null;

  const { firma, sesionVersion: _version, ...resto } = user;
  const deVerdad = { ...resto, avatarImage: urlDeImagen("avatar", user.id, firma) };
  // Solo el Creador puede ponerse otro papel: a cualquier otro la cookie no le hace nada
  const verComo = (await cookies()).get(VER_COMO)?.value;
  if (esCreador(deVerdad) && esVerComo(verComo)) {
    return { ...deVerdad, role: ROLES.PLAYER, puedeCrearLockes: false, verComo };
  }
  return deVerdad;
});

/**
 * Igual que getCurrentUser pero redirige al login si no hay sesión, diciéndole
 * de dónde venía para que después de entrar lleve ahí y no a la portada.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const ruta = destinoSeguro((await headers()).get(CABECERA_DE_RUTA));
    redirect(ruta === "/" ? "/login" : `/login?volver=${encodeURIComponent(ruta)}`);
  }
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
