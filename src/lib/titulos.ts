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

/**
 * Los títulos que llevan puestos quienes juegan un locke, para la
 * clasificación. Se piden por el locke y no por la lista de personas para que
 * vayan a la vez que los participantes y no después.
 *
 * Va en SQL directo y con un `join` a propósito: con `include` de Prisma serían
 * dos consultas, y cada viaje a la base de datos cuenta (ver el apartado de por
 * qué la aplicación iba lenta).
 */
export async function getTitulosEquipadosDelLocke(
  competitionId: string,
): Promise<Map<string, TituloPuesto>> {
  return titulosEquipadosDonde(
    Prisma.sql`a."userId" in (select "userId" from "Participant" where "competitionId" = ${competitionId})`,
  );
}

async function titulosEquipadosDonde(donde: Prisma.Sql) {
  const filas = await prisma.$queryRaw<
    ({ userId: string } & TituloPuesto)[]
  >`
    select a."userId", t."name", t."description", t."icon", t."color"
    from "TitleAward" a
    join "Title" t on t."id" = a."titleId"
    where a."equipped" = true
      and ${donde}
  `;

  return new Map(
    filas.map(({ userId, ...titulo }) => [userId, titulo]),
  );
}
