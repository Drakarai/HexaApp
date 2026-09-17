/**
 * Los dos motivos por los que alguien puede estar fuera de un locke.
 *
 * Para casi todo son lo mismo —deja de emparejarse, no cuenta para el formato
 * del final y sus combates pendientes los gana el rival—, así que los dos se
 * guardan en `Participant.retiredAt`. Esto es **por qué**, que es lo que se
 * enseña y, en una cosa, lo que decide: **votar al MVP** (ver `puedeVotarElMvp`).
 */
export const MOTIVOS_DE_SALIDA = {
  /** Lo dejó él */
  RETIRADA: "retirada",
  /** Perdió el locke: le barrieron el equipo y se acabó */
  WIPEO: "wipeo",
} as const;

export type MotivoDeSalida =
  (typeof MOTIVOS_DE_SALIDA)[keyof typeof MOTIVOS_DE_SALIDA];

/**
 * Cómo se cuenta cada salida. El de retirada es el de siempre; el de wipeo se
 * enseña en rojo porque no es lo mismo dejarlo que perderlo.
 */
export const SALIDAS = {
  [MOTIVOS_DE_SALIDA.RETIRADA]: {
    etiqueta: "retirado",
    icono: "🚪",
    color: "text-slate-500",
    largo: "Se retiró del locke",
  },
  [MOTIVOS_DE_SALIDA.WIPEO]: {
    etiqueta: "locke perdido",
    icono: "💥",
    color: "text-red-400",
    largo: "Perdió el locke por wipeo",
  },
} as const;

/**
 * Cómo está alguien, a partir de sus dos columnas.
 *
 * Los que están fuera de antes de que existiera esto no tienen motivo escrito;
 * se cuentan como retirados, que es lo que eran.
 */
export function comoEstaFuera(participante: {
  retiredAt: Date | null;
  motivoDeSalida?: string | null;
}) {
  if (!participante.retiredAt) return null;
  return participante.motivoDeSalida === MOTIVOS_DE_SALIDA.WIPEO
    ? SALIDAS[MOTIVOS_DE_SALIDA.WIPEO]
    : SALIDAS[MOTIVOS_DE_SALIDA.RETIRADA];
}

/**
 * Quién vota al MVP de la jornada: los que siguen jugando y **los que perdieron
 * el locke**. Al que lo pierde no se le echa del grupo: sigue mirando los
 * combates y opinando, y dejarle sin voto era castigarle dos veces. El que se
 * retira sí deja de votar, porque se ha ido.
 *
 * Es lo único en lo que los dos motivos de salida no dan igual, así que se
 * pregunta aquí y no con un `retiredAt === null` suelto por ahí.
 */
export function puedeVotarElMvp(participante: {
  retiredAt: Date | null;
  motivoDeSalida?: string | null;
}) {
  return (
    !participante.retiredAt ||
    participante.motivoDeSalida === MOTIVOS_DE_SALIDA.WIPEO
  );
}

/** Lo mismo, dicho en una consulta de Prisma */
export const VOTANTES_DEL_MVP = {
  OR: [
    { retiredAt: null },
    { motivoDeSalida: MOTIVOS_DE_SALIDA.WIPEO },
  ],
};
