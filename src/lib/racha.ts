/**
 * La **racha** de la clasificación: los últimos resultados de cada uno, como
 * las bolitas de las tablas de fútbol. Cuentan los mismos combates que las
 * victorias y derrotas de la tabla —los de jornada y los retos— y solo los que
 * tienen ganador. Suelta de `getStandings` para probarla sin base de datos.
 */

export type Resultado = "V" | "D";

export type CombateParaRacha = {
  participantAId: string;
  participantBId: string;
  winnerId: string | null;
  /** Cuándo se jugó: lo que ordena la racha */
  cuando: Date;
  /** Para desempatar los del mismo momento (el orden de la jornada) */
  orden: number;
};

export const LARGO_DE_LA_RACHA = 5;

/** Los últimos resultados de cada uno, del más viejo al más reciente. */
export function rachas(combates: CombateParaRacha[], largo = LARGO_DE_LA_RACHA) {
  const ordenados = combates
    .filter((c) => c.winnerId && (c.winnerId === c.participantAId || c.winnerId === c.participantBId))
    .sort((a, b) => a.cuando.getTime() - b.cuando.getTime() || a.orden - b.orden);
  const porJugador = new Map<string, Resultado[]>();
  for (const combate of ordenados) {
    for (const id of [combate.participantAId, combate.participantBId]) {
      const lista = porJugador.get(id) ?? [];
      lista.push(combate.winnerId === id ? "V" : "D");
      porJugador.set(id, lista);
    }
  }
  for (const [id, lista] of porJugador) porJugador.set(id, lista.slice(-largo));
  return porJugador;
}
