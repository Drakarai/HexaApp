import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
// Solo el tipo: la chapa es la que decide qué necesita para pintarse, y así
// este fichero (que es server-only) no se cuela en el paquete del navegador
import type { TituloPuesto } from "@/components/title-badge";

export type { TituloPuesto };

export type TituloView = {
  /** El id de la concesión, no el del título: es lo que se equipa y se quita */
  awardId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  note: string | null;
  awardedAt: string;
  awardedBy: string | null;
  equipped: boolean;
};

/**
 * Los títulos de alguien, el que lleva puesto primero.
 *
 * Van en el usuario y no en el participante a propósito: un título es de la
 * persona y la sigue de una edición a la siguiente, como el mote con el que se
 * le conoce. Son **solo estéticos**: no dan puntos ni cuentan para nada.
 */
export async function getTitulosDeUsuario(
  userId: string,
): Promise<TituloView[]> {
  const concesiones = await prisma.titleAward.findMany({
    where: { userId },
    orderBy: [{ equipped: "desc" }, { awardedAt: "desc" }],
    include: {
      title: true,
      awardedBy: { select: { displayName: true } },
    },
  });

  return concesiones.map((concesion) => ({
    awardId: concesion.id,
    name: concesion.title.name,
    description: concesion.title.description,
    icon: concesion.title.icon,
    color: concesion.title.color,
    note: concesion.note,
    awardedAt: concesion.awardedAt.toISOString(),
    awardedBy: concesion.awardedBy?.displayName ?? null,
    equipped: concesion.equipped,
  }));
}

/** Solo el que lleva puesto, para pintarlo debajo del nombre. */
export async function getTituloEquipado(userId: string) {
  const puesto = await prisma.titleAward.findFirst({
    where: { userId, equipped: true },
    include: { title: true },
  });
  if (!puesto) return null;
  return {
    name: puesto.title.name,
    description: puesto.title.description,
    icon: puesto.title.icon,
    color: puesto.title.color,
  };
}

/**
 * Los títulos que llevan puestos varias personas de una vez, para la
 * clasificación.
 *
 * Va en SQL directo y con un `join` a propósito: con `include` de Prisma serían
 * dos consultas, y la portada ya cuenta cada viaje a la base de datos (ver el
 * apartado de por qué la aplicación iba lenta).
 */
export async function getTitulosEquipados(
  userIds: string[],
): Promise<Map<string, TituloPuesto>> {
  if (!userIds.length) return new Map();

  const filas = await prisma.$queryRaw<
    ({ userId: string } & TituloPuesto)[]
  >`
    select a."userId", t."name", t."description", t."icon", t."color"
    from "TitleAward" a
    join "Title" t on t."id" = a."titleId"
    where a."equipped" = true
      and a."userId" in (${Prisma.join(userIds)})
  `;

  return new Map(
    filas.map(({ userId, ...titulo }) => [userId, titulo]),
  );
}
