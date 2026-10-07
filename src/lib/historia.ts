import { raizDeLaFamilia } from "@/lib/evoluciones";

/**
 * La historia de un pokémon: las cuentas, sin base de datos.
 *
 * Un pokémon no lleva un número que lo siga por toda la aplicación: la
 * captura del Equipo y PC, el equipo de una jornada, la baja del cementerio y
 * el equipo del hall se apuntan cada uno por su lado. Lo que los une es **el
 * mote y la familia**: si Chispas era un Cyndaquil en la Jornada 1 y es un
 * Typhlosion en el hall, es el mismo. Sin mote no hay forma de distinguir dos
 * Zubat del mismo jugador, así que un pokémon sin mote solo se reconoce en
 * los equipos que tampoco le pusieron mote y son de su familia.
 *
 * Sin `server-only`: lo prueban los tests. Las consultas van en
 * `historia-servidor.ts`.
 */

/** Lo que se guarda en `Capture.historia` */
export type SucesoGuardado =
  | { tipo: "evoluciona"; de: string; a: string; fecha: string }
  // Vuelto shiny después de capturarlo (un premio)
  | { tipo: "shiny"; fecha: string }
  // Cambiado a un entrenador del juego: se fue `de` y llegó `a`, en su hueco
  | { tipo: "intercambio"; de: string; a: string; fecha: string }
  // Revivido (un premio): de qué baja, que se queda en el cementerio y ya no la apunta
  | { tipo: "revive"; deathId: string; fecha: string };

export function leerHistoria(valor: unknown): SucesoGuardado[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((s): s is SucesoGuardado => {
    if (!s || typeof s !== "object" || typeof (s as { fecha?: unknown }).fecha !== "string") return false;
    const suceso = s as { tipo?: unknown; de?: unknown; a?: unknown; deathId?: unknown };
    if (suceso.tipo === "shiny") return true;
    if (suceso.tipo === "revive") return typeof suceso.deathId === "string";
    return (
      (suceso.tipo === "evoluciona" || suceso.tipo === "intercambio") &&
      typeof suceso.de === "string" &&
      typeof suceso.a === "string"
    );
  });
}

/** Sin acentos, mayúsculas ni espacios de más: "  Chíspas " es "chispas" */
export function normalizarMote(mote: string | null | undefined) {
  return (mote ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

type Identificable = { species: string; nickname: string | null; pokemonId?: number | null };

/**
 * ¿Es el mismo pokémon? Del mismo dueño se da por hecho: quien llama ya ha
 * filtrado por jugador.
 *
 * - Con mote: el mismo mote, y la misma familia si se sabe de las dos.
 *   Que no se sepa la familia (una especie inventada de un fangame) no lo
 *   descarta: el mote ya es bastante.
 * - Sin mote: la misma familia y que el otro tampoco tenga mote.
 */
export function esElMismo(a: Identificable, b: Identificable) {
  const moteA = normalizarMote(a.nickname);
  const moteB = normalizarMote(b.nickname);
  const raizA = raizDeLaFamilia(a.pokemonId, a.species);
  const raizB = raizDeLaFamilia(b.pokemonId, b.species);
  const mismaFamilia = raizA !== null && raizB !== null ? raizA === raizB : null;

  if (moteA || moteB) return moteA === moteB && mismaFamilia !== false;
  return mismaFamilia ?? normalizarMote(a.species) === normalizarMote(b.species);
}

export type TipoDeSuceso =
  | "captura"
  | "evoluciona"
  | "shiny"
  | "intercambio"
  | "gimnasio"
  | "jornada"
  | "royale"
  | "reto"
  | "mvp"
  | "final"
  | "hall"
  | "caida"
  | "revive"
  // Nombrado as de su entrenador, y cuándo dejó de serlo (ver lib/as.ts)
  | "as"
  | "deja-as";

export type Suceso = {
  tipo: TipoDeSuceso;
  texto: string;
  detalle?: string | null;
  /** ISO. Sin fecha, va donde le toca por su tipo */
  fecha: string | null;
  /** En un combate, si lo ganó su dueño */
  gano?: boolean | null;
};

/**
 * Dónde va lo que no tiene fecha, y el orden entre dos del mismo día: la
 * captura lo primero, la caída y el hall lo último.
 */
const ORDEN: Record<TipoDeSuceso, number> = {
  captura: 0,
  evoluciona: 1,
  shiny: 1,
  intercambio: 1,
  gimnasio: 2,
  jornada: 3,
  royale: 3,
  reto: 3,
  mvp: 4,
  final: 5,
  hall: 6,
  caida: 7,
  revive: 8,
  as: 2,
  "deja-as": 8,
};

export function ordenarSucesos(sucesos: Suceso[]) {
  const conFecha = sucesos.filter((s) => s.fecha);
  const sinFecha = sucesos.filter((s) => !s.fecha);
  conFecha.sort(
    (a, b) => a.fecha!.localeCompare(b.fecha!) || ORDEN[a.tipo] - ORDEN[b.tipo],
  );
  // Cada uno sin fecha, justo antes del primero con fecha que vaya detrás de él
  const resultado = [...conFecha];
  for (const suelto of sinFecha.sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo])) {
    const donde = resultado.findIndex((s) => ORDEN[s.tipo] > ORDEN[suelto.tipo]);
    resultado.splice(donde === -1 ? resultado.length : donde, 0, suelto);
  }
  return resultado;
}

/** Los números de arriba de la historia */
export function cifrasDeLaHistoria(sucesos: Suceso[], desde: string | null, hasta: string | null) {
  const combates = sucesos.filter((s) => s.gano !== undefined && s.gano !== null);
  const dias =
    desde && hasta
      ? Math.max(0, Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000))
      : null;
  return {
    combates: combates.length,
    victorias: combates.filter((s) => s.gano).length,
    mvps: sucesos.filter((s) => s.tipo === "mvp").length,
    dias,
  };
}
