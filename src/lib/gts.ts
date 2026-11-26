/**
 * **La GTS del locke**: intercambios entre jugadores, sin base de datos (las
 * consultas van en `gts-servidor.ts`). Así se decidió con el grupo:
 *
 * - Va en lockes de **tres o más** y nunca en un Soul Link, y la enciende quien
 *   administra el locke.
 * - Se abre **por checkpoints de jornada**: para cada jugador, desde que pasa el
 *   level cap del checkpoint hasta que se acaba su jornada. Es el único rato en
 *   que nadie toca sus pokémon (está parado esperando la jornada), así que lo
 *   que se cambia es exactamente lo que hay en la partida. Lo que siga abierto
 *   al acabarse la jornada caduca y vuelve a su dueño.
 * - **Boletos**: dos al empezar y uno más por cada jornada acabada, sin tope.
 *   Cada intercambio hecho gasta uno **a cada uno de los dos** (si solo pagara
 *   quien pide, quien deposita podría cambiar sin límite). Lo rechazado o
 *   retirado no gasta nada.
 * - Se deposita un pokémon, los demás mandan **ofertas** con otro, y quien
 *   depositó elige cuál acepta. Un pokémon solo puede estar en un sitio de la
 *   GTS a la vez; al aceptar, lo demás de esos dos pokémon se cancela.
 * - **Dos modos**: a la vista (se ve la ficha entera) u oculto, como la GTS de
 *   los juegos, donde solo se ve especie, mote, nivel y sexo hasta recibirlo.
 * - **Veto** opcional: la organización aprueba cada intercambio antes de que se
 *   haga, y mientras tanto los boletos quedan gastados.
 * - El que llega se puede usar ya en la jornada (se pide que se cambie antes de
 *   jugar los combates) y vale aunque sea de una especie que ya tienes.
 */

export const BOLETOS_INICIALES = 2;
export const JUGADORES_MINIMOS_DE_LA_GTS = 3;

/** Lo que se sabe del pokémon puesto en la GTS: la copia que se guarda al ponerlo */
export type FichaDeGts = {
  especie: string;
  pokemonId: number | null;
  mote: string | null;
  shiny: boolean;
  /** La de la caja (una referencia del almacén) para su sprite */
  imagen: string | null;
  nivel: number | null;
  sexo: "M" | "F" | null;
  naturaleza: string | null;
  habilidad: string | null;
  objeto: string | null;
  movimientos: string[];
  /** PS, Ataque, Defensa, Ataque especial, Defensa especial y Velocidad */
  ivs: number[] | null;
  evs: number[] | null;
  entrenador: { nombre: string; id: number } | null;
  ball: string | null;
  /** Si sale de la partida (y entonces todo lo de arriba es lo de verdad) o de la ficha de la app */
  dePartida: boolean;
};

/** Lo que se ve de un pokémon en la GTS oculta: lo que salía en la de los juegos */
export type FichaOculta = Pick<FichaDeGts, "especie" | "pokemonId" | "mote" | "shiny" | "imagen" | "nivel" | "sexo"> & {
  oculta: true;
};

export function sePuedeTenerGts(locke: { estilo: string; maxPlayers: number }) {
  return locke.estilo !== "soullink" && locke.maxPlayers >= JUGADORES_MINIMOS_DE_LA_GTS;
}

/**
 * Lo que puede ver quien mira de una ficha. Su dueño la ve siempre entera, y
 * todos en cuanto el intercambio está hecho (el que lo recibe lo tiene en su
 * caja, y ya no hay sorpresa que guardar).
 */
export function fichaParaVer(
  ficha: FichaDeGts,
  { aVista, esSuyo, hecho }: { aVista: boolean; esSuyo: boolean; hecho: boolean },
): FichaDeGts | FichaOculta {
  if (aVista || esSuyo || hecho) return ficha;
  const { especie, pokemonId, mote, shiny, imagen, nivel, sexo } = ficha;
  return { especie, pokemonId, mote, shiny, imagen, nivel, sexo, oculta: true };
}

export const esOculta = (f: FichaDeGts | FichaOculta): f is FichaOculta => "oculta" in f;

/** Los estados en los que una oferta ya es un intercambio, y gasta boleto */
export const OFERTA_QUE_GASTA = ["porAprobar", "aceptada"] as const;

/**
 * Los boletos que le quedan a alguien: dos, más uno por jornada acabada, menos
 * los intercambios en los que ha estado (hechos o esperando aprobación).
 */
export function boletosQueQuedan(jornadasAcabadas: number, intercambios: number) {
  return Math.max(0, BOLETOS_INICIALES + jornadasAcabadas - intercambios);
}

export type VentanaDeLaGts =
  | { estado: "abierta"; checkpoint: number; hito: string; jornada: string | null }
  /** Hay checkpoint por jugar, pero este jugador aún no ha pasado su level cap */
  | { estado: "falta-el-hito"; checkpoint: number; hito: string; jornada: string | null }
  /** No queda ninguna jornada con checkpoint por jugar (o no se ha marcado ninguno) */
  | { estado: "cerrada" };

/**
 * La ventana de un jugador: la del **primer checkpoint cuya jornada no se ha
 * acabado**, abierta si ha pasado su level cap. El primero y no el último,
 * como en la portada: una jornada que se dejó sin jugar se sigue debiendo.
 */
export function ventanaDeLaGts(
  checkpoints: { numero: number; jugada: boolean; hito: { id: string; label: string }; jornada: { label: string } | null }[],
  hitosPasados: ReadonlySet<string>,
): VentanaDeLaGts {
  const actual = checkpoints.find((c) => !c.jugada);
  if (!actual) return { estado: "cerrada" };
  const datos = { checkpoint: actual.numero, hito: actual.hito.label, jornada: actual.jornada?.label ?? null };
  return hitosPasados.has(actual.hito.id) ? { estado: "abierta", ...datos } : { estado: "falta-el-hito", ...datos };
}

/** Lo que alguien escribe en «Busco»: corto y en una línea */
export function leerBusco(valor: unknown): string | null {
  const texto = String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return texto || null;
}

export const NOMBRE_DE_ESTADISTICA = ["PS", "Ataque", "Defensa", "At. Esp.", "Def. Esp.", "Velocidad"] as const;
