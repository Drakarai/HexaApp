/**
 * **Quién gana un dualocke cuando manda el juego**, no las jornadas: con el
 * interruptor `jornadasDanTitulo` apagado en Ajustes. Lo pidió el grupo para
 * que no se lleve el título quien gana las jornadas pero pierde la partida.
 *
 * - Si uno **pierde el locke o se retira** y el otro sigue, gana el otro.
 * - Si **los dos se pasan la Liga**, gana quien tenga **menos wipeos**; con los
 *   mismos, deciden las jornadas (la mayoría, o quien lleve más), y si también
 *   van igualadas, la Jornada Final, como siempre.
 * - Si **solo se la ha pasado uno** y lleva menos wipeos de los que ya tiene el
 *   otro, ya ha ganado: los wipeos del otro solo pueden subir.
 * - Si no, todavía no hay campeón, lleve quien lleve la mayoría de jornadas.
 *
 * Suelta, sin base de datos, para que la usen igual la portada (por
 * `getCampeonDelLocke`) y el palmarés, y para poder probarla.
 */

export type JugadorDelDual = {
  id: string;
  /** Fuera del locke: lo perdió o se retiró */
  fuera: boolean;
  /** Ha marcado el level cap de tipo Campeón */
  ligaPasada: boolean;
  wipeos: number;
  /** Jornadas que lleva ganadas */
  jornadas: number;
};

export type ResultadoPorElJuego =
  /** Ganó porque el otro se fue */
  | { tipo: "abandono"; campeonId: string; otroId: string }
  /** Ganó pasándose el juego */
  | { tipo: "juego"; campeonId: string; otroId: string; desempate: "wipeos" | "jornadas" }
  /** Los dos con la Liga, los mismos wipeos y las mismas jornadas: decide la final */
  | { tipo: "final" }
  | null;

export function campeonPorElJuego(
  jugadores: JugadorDelDual[],
  /** Quien llegó a la mayoría de jornadas, si alguien llegó */
  campeonPorJornadasId: string | null,
): ResultadoPorElJuego {
  if (jugadores.length !== 2) return null;
  const dentro = jugadores.filter((j) => !j.fuera);
  if (dentro.length === 1) {
    const otro = jugadores.find((j) => j !== dentro[0])!;
    return { tipo: "abandono", campeonId: dentro[0].id, otroId: otro.id };
  }
  if (dentro.length === 0) return null;

  const [a, b] = jugadores;
  const gana = (campeon: JugadorDelDual, desempate: "wipeos" | "jornadas") => ({
    tipo: "juego" as const,
    campeonId: campeon.id,
    otroId: campeon === a ? b.id : a.id,
    desempate,
  });

  if (a.ligaPasada && b.ligaPasada) {
    if (a.wipeos !== b.wipeos) return gana(a.wipeos < b.wipeos ? a : b, "wipeos");
    const porMayoria = jugadores.find((j) => j.id === campeonPorJornadasId);
    if (porMayoria) return gana(porMayoria, "jornadas");
    if (a.jornadas !== b.jornadas) return gana(a.jornadas > b.jornadas ? a : b, "jornadas");
    return { tipo: "final" };
  }

  const pasado = a.ligaPasada ? a : b.ligaPasada ? b : null;
  if (pasado) {
    const otro = pasado === a ? b : a;
    // El otro aún puede pasársela, pero sus wipeos ya no bajan
    if (pasado.wipeos < otro.wipeos) return gana(pasado, "wipeos");
  }
  return null;
}
