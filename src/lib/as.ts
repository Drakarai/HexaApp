import type { Suceso } from "@/lib/historia";

/**
 * El **historial de ases** de un jugador: quién fue su as, desde cuándo y por
 * qué dejó de serlo. Va en `Participant.historialDeAses` y de aquí salen las
 * líneas de «Nombrado as» y «Dejó de ser el as» en la historia de cada
 * pokémon (ver lib/historia-servidor.ts).
 *
 * Es público, como el as: no dice nada de la caja que no se vea ya en la
 * clasificación. Sin `server-only`: lo prueban los tests.
 */
export type TurnoDeAs = {
  /** La captura del Equipo y PC; null en los de antes, que eran una especie escrita */
  captureId: string | null;
  /** Cómo era al nombrarlo, para reconocerlo donde no se ve la caja */
  species: string;
  nickname: string | null;
  pokemonId: number | null;
  /** ISO. Null en el de antes del historial, que no se sabe */
  desde: string | null;
  /** ISO. Null mientras lo siga siendo */
  hasta: string | null;
  /** Por qué dejó de serlo */
  salida: "cayo" | "relevo" | "quitado" | null;
  /** Quién le relevó */
  relevo: string | null;
  /** A quién relevó él al llegar, y si aquel había caído */
  releva: { nombre: string; cayo: boolean } | null;
};

export type PokemonDelAs = {
  captureId: string | null;
  species: string;
  nickname: string | null;
  pokemonId: number | null;
};

export function leerAses(valor: unknown): TurnoDeAs[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (t): t is TurnoDeAs =>
      Boolean(t) && typeof t === "object" && typeof (t as TurnoDeAs).species === "string",
  );
}

export const nombreDelAs = (p: { species: string; nickname: string | null }) => p.nickname || p.species;

/**
 * Nombrar un as nuevo. El que lo era deja de serlo —«cayó» si está en el
 * cementerio, «relevo» si no— y el nuevo entra diciendo a quién releva.
 * Si el de antes no estaba en el historial (uno de antes de que lo hubiera),
 * se apunta igual, sin fecha de entrada, para que su historia lo cuente.
 */
export function nombrarAs(
  historial: TurnoDeAs[],
  nuevo: PokemonDelAs,
  anterior: (PokemonDelAs & { caido: boolean }) | null,
  ahora: string,
): TurnoDeAs[] {
  const resultado = historial.map((t) => ({ ...t }));
  const abierto = resultado.findLast((t) => t.hasta === null);
  if (anterior) {
    const cierre = {
      hasta: ahora,
      salida: anterior.caido ? ("cayo" as const) : ("relevo" as const),
      relevo: nombreDelAs(nuevo),
    };
    if (abierto) Object.assign(abierto, cierre);
    else resultado.push({ ...anterior, desde: null, releva: null, ...cierre });
  } else if (abierto) {
    // No había as a la vista pero quedó uno abierto (lo quitaron sin cerrar): se cierra
    Object.assign(abierto, { hasta: ahora, salida: "quitado" as const, relevo: null });
  }
  resultado.push({
    ...nuevo,
    desde: ahora,
    hasta: null,
    salida: null,
    relevo: null,
    releva: anterior ? { nombre: nombreDelAs(anterior), cayo: anterior.caido } : null,
  });
  return resultado;
}

/** Quitar el as sin poner otro */
export function quitarAs(historial: TurnoDeAs[], ahora: string): TurnoDeAs[] {
  const resultado = historial.map((t) => ({ ...t }));
  const abierto = resultado.findLast((t) => t.hasta === null);
  if (abierto) Object.assign(abierto, { hasta: ahora, salida: "quitado" as const, relevo: null });
  return resultado;
}

/** Las líneas de su historia de los turnos que son de ese pokémon */
export function sucesosDelAs(historial: TurnoDeAs[], esEste: (turno: TurnoDeAs) => boolean): Suceso[] {
  return historial.filter(esEste).flatMap((turno): Suceso[] => [
    ...(turno.desde
      ? [
          {
            tipo: "as" as const,
            texto: "Nombrado as",
            detalle: turno.releva
              ? turno.releva.cayo
                ? `tras caer ${turno.releva.nombre}`
                : `en lugar de ${turno.releva.nombre}`
              : null,
            fecha: turno.desde,
          },
        ]
      : []),
    ...(turno.hasta
      ? [
          {
            tipo: "deja-as" as const,
            texto: "Dejó de ser el as",
            detalle:
              turno.salida === "quitado" || !turno.relevo
                ? null
                : turno.salida === "cayo"
                  ? `tras caer, le relevó ${turno.relevo}`
                  : `le relevó ${turno.relevo}`,
            fecha: turno.hasta,
          },
        ]
      : []),
  ]);
}
