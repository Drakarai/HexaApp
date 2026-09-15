/**
 * Los dos motivos por los que alguien puede estar fuera de un locke.
 *
 * Para la competición son lo mismo —deja de emparejarse, no cuenta para el MVP
 * ni para el formato del final, y sus combates pendientes los gana el rival—,
 * así que los dos se guardan en `Participant.retiredAt`. Esto es solo **por
 * qué**, que es lo que se enseña y lo único que los distingue.
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
