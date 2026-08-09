import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { ROLES } from "@/lib/constants";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarColor: string;
  avatarImage: string | null;
};

/** Usuario de la petición actual, o null si no hay sesión válida. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      avatarColor: true,
      avatarImage: true,
    },
  });
  return user;
});

/** Igual que getCurrentUser pero redirige al login si no hay sesión. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) {
    throw new Error("Necesitas permisos de administrador para hacer esto.");
  }
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
