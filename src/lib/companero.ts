import "server-only";
import { prisma } from "@/lib/db";
import { findSpecies } from "@/lib/pokedex";

/**
 * El **compañero**: el pokémon as de cada uno, con su icono de caja al lado de
 * su avatar en la cabecera, como el pokémon que te sigue en HeartGold y
 * SoulSilver. No es otra cosa que elegir: es el as, que ya tiene todo el
 * mundo, así que sale solo.
 *
 * Reacciona a lo que le pasa a su entrenador: salta si acaba de ganar un
 * combate, se pone triste si acaba de caer uno de los suyos y, si el que cae
 * es él, se queda gris y con un lazo negro. Lo que ya ha visto en ese
 * dispositivo no lo repite (ver `components/companero.tsx`).
 */

/** Ocultarlo es de cada dispositivo, como los sprites: en una cookie, para que no salga y desaparezca */
export const COOKIE_DEL_COMPANERO = "hexaapp-companero";

export type Companero = {
  participantId: string;
  pokemonId: number;
  shiny: boolean;
  /** El mote, o la especie si no tiene */
  nombre: string;
  /** Si el as está en el cementerio (y no lo han revivido) */
  caido: boolean;
  /** El último combate ganado, para saltar una vez */
  victoria: { id: string; fecha: string } | null;
  /** La última baja que no es él, para ponerse triste una vez */
  baja: { id: string; fecha: string; nombre: string } | null;
};

const plano = (texto: string | null | undefined) =>
  (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/**
 * Lo que necesita el compañero de quien mira, en un locke. Va en el layout, en
 * **la misma tanda** que el resto de lo de la cabecera: por eso no espera a la
 * ficha del jugador, sino que busca por locke y cuenta. Son tres consultas a
 * la vez: el as, sus bajas (pocas, y de ahí sale también si el as ha caído) y
 * su última victoria, que puede estar en una jornada, en la final o en un reto.
 */
export async function companeroDe(
  competitionId: string,
  userId: string,
  conAnil: boolean,
): Promise<Companero | null> {
  const delJugador = { competitionId, userId };
  const [[yo], bajas, [victoria]] = await Promise.all([
    /**
     * De la imagen del as, solo el principio: si es del almacén es una
     * referencia corta que dice qué pokémon es («ref:pkm-6-box»); si es de las
     * de antes, incrustada, serían decenas de KB en cada pantalla para nada.
     */
    prisma.$queryRaw<
      {
        id: string;
        aceSpecies: string | null;
        aceNickname: string | null;
        imagen: string | null;
        aceCaptureId: string | null;
        bajaDelAs: string | null;
      }[]
    >`
      SELECT p.id, p."aceSpecies", p."aceNickname", left(p."aceImage", 64) AS imagen,
             p."aceCaptureId", c."deathId" AS "bajaDelAs"
      FROM "Participant" p LEFT JOIN "Capture" c ON c.id = p."aceCaptureId"
      WHERE p."competitionId" = ${competitionId} AND p."userId" = ${userId}
    `,
    prisma.death.findMany({
      where: { participant: delJugador, revividoEl: null },
      select: { id: true, species: true, nickname: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    /**
     * Una sola consulta para las tres tablas de combates. `playedAt` es la
     * fecha que se apunta con el resultado (o la del momento, si no se pone).
     */
    prisma.$queryRaw<{ id: string; fecha: Date }[]>`
      WITH yo AS (
        SELECT id FROM "Participant" WHERE "competitionId" = ${competitionId} AND "userId" = ${userId}
      )
      SELECT id, fecha FROM (
        SELECT id, "playedAt" AS fecha FROM "Match" WHERE "winnerId" IN (SELECT id FROM yo)
        UNION ALL
        SELECT id, "playedAt" FROM "FinalMatch" WHERE "winnerId" IN (SELECT id FROM yo)
        UNION ALL
        SELECT id, "playedAt" FROM "ChallengeMatch" WHERE "winnerId" IN (SELECT id FROM yo)
      ) AS ganados
      WHERE fecha IS NOT NULL
      ORDER BY fecha DESC
      LIMIT 1
    `,
  ]);
  if (!yo?.aceSpecies) return null;
  // La imagen guardada dice el número exacto (la forma, el shiny); si no, por el nombre
  const deLaImagen = /^ref:pkm-(\d+)-[a-z]+(-shiny)?$/.exec(yo.imagen ?? "");
  const shiny = Boolean(deLaImagen?.[2]);
  const pokemonId = (deLaImagen ? Number(deLaImagen[1]) : null) ?? findSpecies(yo.aceSpecies, conAnil)?.dex;
  if (!pokemonId) return null;

  /**
   * El as de la caja ha caído si su captura tiene baja. Los de antes eran una
   * especie y un mote, sin captura: esos, si hay una baja suya con esa especie
   * y ese mote (o sin mote, si el as no lo lleva).
   */
  const esElAs = (baja: { id: string; species: string; nickname: string | null }) =>
    yo.aceCaptureId
      ? baja.id === yo.bajaDelAs
      : plano(baja.species) === plano(yo.aceSpecies) && plano(baja.nickname) === plano(yo.aceNickname);
  const caido = bajas.some(esElAs);
  const otra = bajas.find((baja) => !esElAs(baja));

  return {
    participantId: yo.id,
    pokemonId,
    shiny,
    nombre: yo.aceNickname || yo.aceSpecies,
    caido,
    victoria: victoria ? { id: victoria.id, fecha: new Date(victoria.fecha).toISOString() } : null,
    baja: otra
      ? { id: otra.id, fecha: otra.createdAt.toISOString(), nombre: otra.nickname || otra.species }
      : null,
  };
}
