import type { StandingRow } from "@/lib/competition";
import type { FinalFourState } from "@/lib/final-four";
import type { CampeonDelLocke } from "@/lib/campeon";

/**
 * Cómo acabó el locke: el orden del hall de la fama y su podio.
 *
 * Vive aquí y no en la página porque lo usan dos: el hall y la imagen del
 * resumen para compartir (`api/resumen`), y tienen que decir exactamente lo
 * mismo.
 */

export type EnElPodio = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  /** 1, 2 o 3 */
  puesto: number;
  /** "Campeón", "Subcampeón", "Tercero" */
  titulo: string;
  /** De qué sale ese puesto: de la final o de la clasificación */
  comoLoGano: string;
};

type FinalTerminada = Extract<FinalFourState, { status: "EN_JUEGO" | "TERMINADA" }>;

export function ordenDelHall(
  standings: StandingRow[],
  elFinal: FinalTerminada | null,
  /**
   * Quién ganó el locke (ver lib/campeon.ts). Cuando no salió de la final —por
   * jornadas en el dualocke o por abandono—, manda sobre el cuadro.
   */
  campeon: CampeonDelLocke | null = null,
) {
  const sinFinal = campeon && campeon.como !== "final" ? campeon : null;
  /**
   * **El orden del hall no es la clasificación: es cómo acabó el locke.**
   *
   * Antes era la tabla con el campeón y el subcampeón puestos a mano encima, y
   * eso dejaba a quien perdió el locke a media carrera por delante de quien
   * jugó la final, solo porque le habían dado tiempo a sumar puntos. Tres
   * grupos, en este orden:
   *
   *  1. **Los que jugaron el cuadro**, por lo lejos que llegaron.
   *  2. **Los que seguían jugando** pero no se clasificaron, por la tabla.
   *  3. **Los que se fueron**, por quién aguantó más: el último en irse arriba.
   */
  const siembra = new Map(
    (elFinal?.seeds ?? []).map((jugador) => [jugador.participantId, jugador.seed]),
  );

  /**
   * Hasta dónde llegó cada uno. La ronda se mide por el orden en que aparece
   * en el cuadro (cruces, semifinales, final) y no por la llave, que si no el
   * que cae en la segunda semifinal quedaría por encima del de la primera sin
   * haber hecho nada distinto. Ganar la última suma medio punto: es el campeón.
   */
  const rondas: string[] = [];
  for (const llave of elFinal?.llaves ?? []) {
    if (!rondas.includes(llave.round)) rondas.push(llave.round);
  }
  const hastaDonde = new Map<string, number>();
  for (const llave of elFinal?.llaves ?? []) {
    const nivel = rondas.indexOf(llave.round);
    for (const lado of [llave.a, llave.b]) {
      if (!lado) continue;
      const suyo = nivel + (llave.winnerId === lado.participantId ? 0.5 : 0);
      hastaDonde.set(
        lado.participantId,
        Math.max(hastaDonde.get(lado.participantId) ?? -1, suyo),
      );
    }
  }

  const grupoDe = (row: (typeof standings)[number]) =>
    siembra.has(row.participantId) ? 0 : row.retirado ? 2 : 1;

  const jugadores = [...standings].sort((a, b) => {
    const grupoA = grupoDe(a);
    const grupoB = grupoDe(b);
    if (grupoA !== grupoB) return grupoA - grupoB;

    if (grupoA === 0) {
      const llegoA = hastaDonde.get(a.participantId) ?? -1;
      const llegoB = hastaDonde.get(b.participantId) ?? -1;
      // A igualdad de ronda manda la siembra, que es la tabla con la que
      // entraron: es lo único que los separa sin inventarse nada
      return llegoB - llegoA || (siembra.get(a.participantId) ?? 99) - (siembra.get(b.participantId) ?? 99);
    }

    if (grupoA === 1) return a.position - b.position;

    // Los que se fueron: primero el que más tarde lo dejó
    return (b.retiredAt?.getTime() ?? 0) - (a.retiredAt?.getTime() ?? 0);
  });

  /**
   * Cómo se ganó el locke, con nombres: "Draka ganó la final a Pablo por 2-1".
   * Todas las llaves del cuadro son al mejor de tres, así que el marcador de la
   * serie ya está contado en la propia llave (ver `lib/formatos-finales.ts`).
   */
  /** Cómo fue la final, si se jugó: "Draka ganó la final a Pablo por 2-1" */
  const laFinalFue = (() => {
    if (!elFinal?.champion) return "";
    const campeon = elFinal.champion.displayName;
    const rival = elFinal.runnerUp?.displayName;
    const laFinal = elFinal.llaves.find(
      (llave) => llave.key === elFinal.formato.campeon,
    );
    if (!laFinal || !rival) return `${campeon} ganó la final.`;

    const [ganadas, perdidas] =
      laFinal.a?.participantId === elFinal.champion.participantId
        ? [laFinal.ganadasA, laFinal.ganadasB]
        : [laFinal.ganadasB, laFinal.ganadasA];
    return `${campeon} ganó la final a ${rival} por ${ganadas}-${perdidas}.`;
  })();

  const comoLoGano = (() => {
    if (sinFinal?.como === "abandono") {
      return `${sinFinal.champion.displayName} fue el único que siguió en pie hasta el final.`;
    }
    if (sinFinal?.como === "jornadas") {
      const { ganadas, perdidas } = sinFinal.jornadas ?? { ganadas: 0, perdidas: 0 };
      // La final se juega igual aunque no cuente: si se jugó, se dice
      const yLaFinal = elFinal?.champion
        ? elFinal.champion.participantId === sinFinal.champion.participantId
          ? " Y remató ganando también la final."
          : ` La final, por el honor, fue para ${elFinal.champion.displayName}.`
        : "";
      return `${sinFinal.champion.displayName} ganó el locke por ${ganadas}-${perdidas} en jornadas.${yLaFinal}`;
    }
    return laFinalFue;
  })();

  /**
   * El podio, **solo con quien llegó a la final**. El 1º y el 2º salen de la
   * final; el 3º sale de la tabla, que no es lo mismo y por eso se dice: en el
   * cuadro no se juega un combate por el tercer puesto.
   *
   * Lo de mirar la siembra no sobra: sin ella, en un locke de dos se colaba de
   * tercero el siguiente de la clasificación, que era alguien que estaba fuera
   * del locke y no jugó la final.
   */
  const sembrados = new Set(
    elFinal?.seeds.map((jugador) => jugador.participantId) ?? [],
  );
  /**
   * Sin campeón de la final, el podio es el campeón y, si lo hay, el otro del
   * dualocke. Por abandono queda solo: los demás se fueron, y ponerlos de
   * segundo y tercero por la tabla sería inventarse un orden que no se jugó.
   */
  if (sinFinal) {
    const arriba = [sinFinal.champion, sinFinal.runnerUp]
      .map((quien) => standings.find((row) => row.participantId === quien?.participantId))
      .filter((row): row is StandingRow => Boolean(row));
    return {
      jugadores: [...arriba, ...jugadores.filter((row) => !arriba.includes(row))],
      podio: arriba.map((row, index) => ({
        participantId: row.participantId,
        displayName: row.displayName,
        color: row.color,
        avatarImage: row.avatarImage,
        puesto: index + 1,
        titulo: ["Campeón", "Subcampeón"][index],
        comoLoGano,
      })) satisfies EnElPodio[],
      comoLoGano,
    };
  }

  const podio: EnElPodio[] = elFinal?.champion
    ? jugadores
        .filter((row) => sembrados.has(row.participantId))
        .slice(0, 3)
        .map((row, index) => ({
          participantId: row.participantId,
          displayName: row.displayName,
          color: row.color,
          avatarImage: row.avatarImage,
          puesto: index + 1,
          // El tercero sale del cuadro, no de la tabla: es el que más lejos
          // llegó de los que no jugaron la final. No hay combate por el
          // tercer puesto, así que a igualdad de ronda decide la siembra.
          titulo: ["Campeón", "Subcampeón", "Tercero"][index],
          comoLoGano,
        }))
    : [];

  return { jugadores, podio, comoLoGano };
}
