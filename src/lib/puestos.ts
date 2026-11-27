/**
 * **La clasificación por puestos**: cada jornada (la «liguilla») tiene su
 * tabla, y cada puesto se lleva sus puntos y sus premios. Así lo pidió el
 * grupo del Hexalocke 3:
 *
 * - **Puntos por puesto**, sumados a los iniciales: 2 al 1º, 2º y 3º, 1 al 4º y
 *   nada al 5º y 6º (configurable por locke). Las victorias ya no dan puntos
 *   sueltas.
 * - **El orden de la tabla**: primero ganar el combate; luego la diferencia de
 *   pokémon (los salvados para el ganador y los debilitados para el perdedor);
 *   luego los críticos hechos menos los recibidos (de las repeticiones), y por
 *   último la clasificación general.
 * - **Premios por puesto** (objetos de la Bolsa y tiradas de ruleta), en cada
 *   jornada y otra vez en la clasificación final.
 * - **Un reto por jornada** como mínimo: quien no lo juega sale avisado (se
 *   castiga jugando con el equipo a la vista).
 *
 * Sin base de datos: lo prueban los tests. Lo que la toca, en
 * `puestos-servidor.ts`.
 */

export type CombateDeLaJornada = {
  participantAId: string;
  participantBId: string;
  winnerId: string | null;
  /** Lo que ganó el ganador: los que le quedaron en pie (sin signo) */
  pokemonDiff: number | null;
};

export type FilaDePuesto = {
  participantId: string;
  victorias: number;
  /**
   * Para el ganador, los pokémon que salvó; para el perdedor, en negativo, los
   * que le faltaron por debilitar. Dentro de una jornada todos juegan con los
   * mismos que el rival, así que ordenar por «más debilitados» es lo mismo que
   * por «perder por menos».
   */
  diferencia: number;
  /** Críticos hechos menos recibidos en sus combates de la jornada */
  criticos: number;
  /** Su sitio en la clasificación general antes de esta jornada (1 el primero) */
  general: number;
  puesto: number;
  puntos: number;
};

export function tablaDeLaJornada({
  combates,
  criticos,
  ordenGeneral,
  puntosPorPuesto,
  fuera = new Set(),
}: {
  combates: CombateDeLaJornada[];
  /** participantId → críticos hechos y recibidos en la jornada */
  criticos: Map<string, { hechos: number; recibidos: number }>;
  /** Los jugadores en el orden de la clasificación general (sin esta jornada) */
  ordenGeneral: string[];
  puntosPorPuesto: number[];
  /** Los que están fuera del locke: ni puesto ni puntos */
  fuera?: ReadonlySet<string>;
}): FilaDePuesto[] {
  const filas = new Map<string, Omit<FilaDePuesto, "puesto" | "puntos" | "general" | "criticos">>();
  const fila = (id: string) => {
    let f = filas.get(id);
    if (!f) filas.set(id, (f = { participantId: id, victorias: 0, diferencia: 0 }));
    return f;
  };
  for (const c of combates) {
    const a = fila(c.participantAId);
    const b = fila(c.participantBId);
    if (!c.winnerId) continue;
    const d = Math.abs(c.pokemonDiff ?? 0);
    const [ganador, perdedor] = c.winnerId === c.participantAId ? [a, b] : [b, a];
    ganador.victorias += 1;
    ganador.diferencia += d;
    perdedor.diferencia -= d;
  }
  const sitio = new Map(ordenGeneral.map((id, i) => [id, i + 1]));
  const ordenadas = [...filas.values()]
    .filter((f) => !fuera.has(f.participantId))
    .map((f) => {
      const k = criticos.get(f.participantId);
      return {
        ...f,
        criticos: k ? k.hechos - k.recibidos : 0,
        general: sitio.get(f.participantId) ?? ordenGeneral.length + 1,
      };
    })
    .sort(
      (x, y) =>
        y.victorias - x.victorias || y.diferencia - x.diferencia || y.criticos - x.criticos || x.general - y.general,
    );
  return ordenadas.map((f, i) => ({ ...f, puesto: i + 1, puntos: puntosPorPuesto[i] ?? 0 }));
}

/** Lo que se da a un puesto: objetos de la Bolsa (por id) y tiradas de una ruleta */
export type PremioDeUnPuesto = { objetos: string[]; ruleta: string | null };

/** Lo guardado en el locke, comprobado: una lista de números (o null si no se usa) */
export function leerPuntosPorPuesto(valor: unknown): number[] | null {
  if (!Array.isArray(valor)) return null;
  const lista = valor.map((n) => Math.trunc(Number(n))).filter((n) => Number.isFinite(n) && n >= -99 && n <= 99);
  return lista.length ? lista : null;
}

export function leerPremiosPorPuesto(valor: unknown): PremioDeUnPuesto[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((p) => {
    const q = (p ?? {}) as { objetos?: unknown; ruleta?: unknown };
    return {
      objetos: Array.isArray(q.objetos) ? q.objetos.filter((o): o is string => typeof o === "string" && o.length > 0) : [],
      ruleta: typeof q.ruleta === "string" && q.ruleta ? q.ruleta : null,
    };
  });
}

/** «2, 2, 2, 1, 0, 0» → [2, 2, 2, 1, 0, 0]; vacío o mal escrito, null */
export function puntosDelTexto(texto: string): number[] | null {
  const partes = texto
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!partes.length || partes.some((x) => !/^-?\d{1,2}$/.test(x))) return null;
  return partes.map(Number);
}
