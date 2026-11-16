import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
// Solo el tipo: la chapa es la que decide qué necesita para pintarse, y así
// este fichero (que es server-only) no se cuela en el paquete del navegador
import type { TituloPuesto } from "@/components/title-badge";
import type { TituloAdmin } from "@/app/(app)/admin/titles";

export type { TituloPuesto };

/**
 * **Los títulos**, que son adorno y nada más. Hay dos clases de concesión:
 *
 * - **Generales**: se llevan en cualquier sitio y los ve todo el mundo. Pueden
 *   venir de un locke (`competitionId`, «ganado en…») o de ninguno.
 * - **De un locke** (`soloEnElLocke`): solo se pueden **llevar puestos** dentro
 *   de ese locke. En el perfil de cada uno se ven igual que los demás, en su
 *   grupo.
 *
 * Qué se lleva puesto: uno general (`TitleAward.equipped`), que sale fuera de
 * los lockes y en los lockes donde no se ha elegido otro; y en cada locke, el
 * elegido para él (`Participant.tituloPuestoId`), que puede ser uno general o
 * uno de ese locke.
 *
 * El catálogo es común (lo crea el Creador), y cada locke puede tener además
 * sus **extras** (`Title.competitionId`), que solo se dan dentro de él.
 */

export type TituloView = {
  /** El id de la concesión, no el del título: es lo que se pone y se quita */
  awardId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  note: string | null;
  awardedAt: string;
  awardedBy: string | null;
  /** Solo se lleva dentro de su locke */
  soloEnElLocke: boolean;
  /** El locke en el que se ganó, si fue en uno */
  locke: { id: string; name: string; startedAt: string } | null;
  /** El general que lleva puesto */
  puestoGeneral: boolean;
  /** El que lleva puesto en el locke que se está mirando */
  puestoAqui: boolean;
  /** Se puede llevar en el locke que se está mirando */
  valeAqui: boolean;
};

/**
 * Todos los títulos de alguien, para su perfil. `lockeActual` es el locke que
 * se está mirando: decide cuál sale como puesto ahí y cuáles se pueden poner.
 * Una concesión «de un locke» cuyo locke ya no existe no sale: era solo de él.
 */
export async function getTitulosDeUsuario(
  userId: string,
  lockeActual: string | null = null,
): Promise<TituloView[]> {
  const [concesiones, participante] = await Promise.all([
    prisma.titleAward.findMany({
      where: { userId, NOT: { soloEnElLocke: true, competitionId: null } },
      orderBy: { awardedAt: "desc" },
      include: {
        title: true,
        awardedBy: { select: { displayName: true } },
        competition: { select: { id: true, name: true, startedAt: true } },
      },
    }),
    lockeActual
      ? prisma.participant.findFirst({
          where: { userId, competitionId: lockeActual },
          select: { tituloPuestoId: true },
        })
      : null,
  ]);

  const valeAqui = (c: (typeof concesiones)[number]) =>
    Boolean(lockeActual) && (!c.soloEnElLocke || c.competitionId === lockeActual);
  // En el locke: el elegido para él si sigue valiendo; si no, el general
  const elegido = concesiones.find((c) => c.id === participante?.tituloPuestoId && valeAqui(c));
  const puestoAqui = lockeActual
    ? (elegido ?? concesiones.find((c) => c.equipped && !c.soloEnElLocke) ?? null)
    : null;

  return concesiones.map((c) => ({
    awardId: c.id,
    name: c.title.name,
    description: c.title.description,
    icon: c.title.icon,
    color: c.title.color,
    note: c.note,
    awardedAt: c.awardedAt.toISOString(),
    awardedBy: c.awardedBy?.displayName ?? null,
    soloEnElLocke: c.soloEnElLocke,
    locke: c.competition
      ? { id: c.competition.id, name: c.competition.name, startedAt: c.competition.startedAt.toISOString() }
      : null,
    puestoGeneral: c.equipped && !c.soloEnElLocke,
    puestoAqui: puestoAqui?.id === c.id,
    valeAqui: valeAqui(c),
  }));
}

/** El que sale debajo del nombre: en un locke, el de ese locke; fuera, el general */
export function tituloQueSeVe(titulos: TituloView[], enUnLocke: boolean) {
  return (enUnLocke ? titulos.find((t) => t.puestoAqui) : titulos.find((t) => t.puestoGeneral)) ?? null;
}

/**
 * Los títulos que llevan puestos quienes juegan un locke, para la
 * clasificación: el elegido para ese locke y, si no hay (o ya no vale), el
 * general. Va en SQL directo y en una sola consulta (cada viaje a la base de
 * datos cuenta: ver el apartado de por qué la aplicación iba lenta).
 */
export async function getTitulosEquipadosDelLocke(
  competitionId: string,
): Promise<Map<string, TituloPuesto>> {
  return titulosPuestosEnElLocke(Prisma.sql`p."competitionId" = ${competitionId}`);
}

async function titulosPuestosEnElLocke(donde: Prisma.Sql) {
  const filas = await prisma.$queryRaw<({ userId: string } & TituloPuesto)[]>`
    select p."userId", t."name", t."description", t."icon", t."color"
    from "Participant" p
    join lateral (
      select a."titleId"
      from "TitleAward" a
      where a."userId" = p."userId"
        and (
          (a."id" = p."tituloPuestoId"
            and (a."soloEnElLocke" = false or a."competitionId" = p."competitionId"))
          or (a."equipped" = true and a."soloEnElLocke" = false)
        )
      -- El elegido para el locke manda sobre el general
      order by (a."id" = p."tituloPuestoId") desc nulls last
      limit 1
    ) a on true
    join "Title" t on t."id" = a."titleId"
    where ${donde}
  `;

  return new Map(filas.map(({ userId, ...titulo }) => [userId, titulo]));
}

/**
 * Los títulos para repartir, con a quién se han dado. Sin locke, para
 * Administración: el catálogo común con todas sus concesiones. Con locke, para
 * sus ajustes: el común y los extras de ese locke, con lo dado **en ese locke**
 * (lo de otros sitios no es cosa de quien lo administra).
 */
export async function getTitulosParaRepartir(competitionId: string | null): Promise<TituloAdmin[]> {
  const titulos = await prisma.title.findMany({
    where: competitionId ? { OR: [{ competitionId: null }, { competitionId }] } : { competitionId: null },
    orderBy: [{ competitionId: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
    include: {
      awards: {
        where: competitionId ? { competitionId } : {},
        orderBy: { awardedAt: "desc" },
        include: {
          user: { select: { id: true, displayName: true } },
          competition: { select: { name: true } },
        },
      },
    },
  });
  return titulos.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    // En Administración, el común; en un locke, solo sus extras
    editable: competitionId ? t.competitionId === competitionId : true,
    extra: Boolean(t.competitionId),
    concedidos: t.awards
      // Los «solo de un locke» de un locke que ya no existe no se cuentan
      .filter((a) => !(a.soloEnElLocke && !a.competition))
      .map((a) => ({
        awardId: a.id,
        userId: a.user.id,
        displayName: a.user.displayName,
        note: a.note,
        awardedAt: a.awardedAt.toISOString(),
        equipped: a.equipped,
        // Como lo manda el desplegable de «Dónde» (ver `leerAlcance`)
        alcance: a.soloEnElLocke
          ? `locke:${a.competitionId}`
          : a.competitionId
            ? `general:${a.competitionId}`
            : "general",
        donde: a.soloEnElLocke
          ? `Solo en ${a.competition!.name}`
          : a.competition
            ? `General · ${a.competition.name}`
            : "General",
      })),
  }));
}
