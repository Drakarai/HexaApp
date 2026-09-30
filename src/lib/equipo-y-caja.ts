/**
 * El equipo y la caja: dónde va cada captura y cómo se vinculan en un Soul Link.
 *
 * Todo lo de aquí son **cuentas sueltas**, sin base de datos, para que las
 * pueda usar tanto el servidor (que es quien guarda) como el navegador (que
 * mueve al momento, sin esperar a que conteste) y para poder probarlas.
 *
 * Una captura lleva `lugar` ("equipo" o "caja") y `hueco`. Los huecos se
 * guardan tal cual, pero **nunca se confía en que no choquen**: dos capturas
 * en el mismo hueco, un séptimo en el equipo o las capturas de antes, que
 * nacieron todas en el hueco 0 de la caja, se recolocan al pintarlas con
 * `colocar`. Así no hay que arreglar nada en la base de datos para que se vea
 * bien, y al primer movimiento se guarda ya ordenado.
 */

export const TAMANO_DEL_EQUIPO = 6;
/** Como en los juegos: seis columnas y cinco filas */
export const HUECOS_POR_CAJA = 30;
/**
 * Las cajas que hay siempre, aunque estén vacías: con una sola no había a
 * dónde mover nada, y en los juegos el PC ya viene con todas desde el principio.
 */
export const MINIMO_DE_CAJAS = 4;

export type Lugar = "equipo" | "caja";

export type Colocable = {
  id: string;
  lugar: string;
  hueco: number;
  /** Para desempatar dos en el mismo sitio: se queda el más antiguo */
  creado: number;
};

export type Colocacion<T> = {
  equipo: (T | null)[];
  /** Siempre cajas enteras, de 30 en 30, y al menos `MINIMO_DE_CAJAS` */
  caja: (T | null)[];
};

const porHuecoYEdad = (a: Colocable, b: Colocable) =>
  a.hueco - b.hueco || a.creado - b.creado || a.id.localeCompare(b.id);

/**
 * Dónde se pinta cada una. Primero el equipo, respetando el hueco de cada uno;
 * lo que no cabe —un hueco repetido o fuera de rango— va al primer hueco libre,
 * y si el equipo está lleno, a la caja.
 */
export function colocar<T extends Colocable>(capturas: T[]): Colocacion<T> {
  const equipo: (T | null)[] = Array(TAMANO_DEL_EQUIPO).fill(null);
  const sobran: T[] = [];

  const delEquipo = capturas.filter((c) => c.lugar === "equipo").sort(porHuecoYEdad);
  const sinSitio: T[] = [];
  for (const captura of delEquipo) {
    const hueco = captura.hueco;
    if (hueco >= 0 && hueco < TAMANO_DEL_EQUIPO && !equipo[hueco]) equipo[hueco] = captura;
    else sinSitio.push(captura);
  }
  for (const captura of sinSitio) {
    const libre = equipo.indexOf(null);
    if (libre >= 0) equipo[libre] = captura;
    else sobran.push(captura);
  }

  const caja: (T | null)[] = [];
  const deLaCaja = capturas.filter((c) => c.lugar !== "equipo").sort(porHuecoYEdad);
  const sinHueco: T[] = [];
  for (const captura of deLaCaja) {
    const hueco = captura.hueco;
    if (hueco >= 0 && hueco < 10_000 && !caja[hueco]) caja[hueco] = captura;
    else sinHueco.push(captura);
  }
  for (const captura of [...sinHueco, ...sobran]) {
    caja[primerHuecoLibre(caja)] = captura;
  }

  // Cajas enteras: las que hagan falta, y nunca menos de las de siempre
  const cajas = Math.max(MINIMO_DE_CAJAS, Math.ceil(caja.length / HUECOS_POR_CAJA));
  const llena: (T | null)[] = Array.from(
    { length: cajas * HUECOS_POR_CAJA },
    (_, i) => caja[i] ?? null,
  );
  return { equipo, caja: llena };
}

function primerHuecoLibre<T>(huecos: (T | null | undefined)[]) {
  for (let i = 0; i < huecos.length; i++) if (!huecos[i]) return i;
  return huecos.length;
}

export type Posicion = { id: string; lugar: Lugar; hueco: number };

/** Las posiciones de todo, sacadas de una colocación: lo que se guarda */
export function posicionesDe<T extends Colocable>(colocacion: Colocacion<T>): Posicion[] {
  const posiciones: Posicion[] = [];
  colocacion.equipo.forEach((c, hueco) => {
    if (c) posiciones.push({ id: c.id, lugar: "equipo", hueco });
  });
  colocacion.caja.forEach((c, hueco) => {
    if (c) posiciones.push({ id: c.id, lugar: "caja", hueco });
  });
  return posiciones;
}

/**
 * Mover una captura a un hueco. Si está ocupado, **se cambian**: el que estaba
 * ahí se va al sitio de donde salió el otro, que es lo que hace el PC de los
 * juegos. Sin hueco, al primero libre de ese sitio; y con `caja` (contando
 * desde 0), al primero libre de esa caja, que es el «Mover a la caja…» de la
 * ficha.
 *
 * Devuelve las posiciones nuevas de todas, o un error si no se puede (meter un
 * séptimo en el equipo sin decir por cuál se cambia).
 */
export function mover<T extends Colocable>(
  capturas: T[],
  id: string,
  destino: { lugar: Lugar; hueco?: number | null; caja?: number | null },
): { posiciones: Posicion[] } | { error: string } {
  const colocacion = colocar(capturas);
  const origen = buscar(colocacion, id);
  if (!origen) return { error: "Ese pokémon no está en tu equipo ni en tu caja." };

  const fila = destino.lugar === "equipo" ? colocacion.equipo : colocacion.caja;
  let hueco = destino.hueco ?? null;
  if (hueco === null && destino.lugar === "caja" && destino.caja != null) {
    const caja = destino.caja;
    const cajas = colocacion.caja.length / HUECOS_POR_CAJA;
    if (!Number.isInteger(caja) || caja < 0 || caja >= cajas) return { error: "Esa caja no existe." };
    const desde = caja * HUECOS_POR_CAJA;
    // Si ya está en esa caja, no se mueve
    if (origen.lugar === "caja" && origen.hueco >= desde && origen.hueco < desde + HUECOS_POR_CAJA) {
      return { posiciones: posicionesDe(colocacion) };
    }
    const libre = colocacion.caja.slice(desde, desde + HUECOS_POR_CAJA).indexOf(null);
    if (libre < 0) return { error: `La caja ${caja + 1} está llena.` };
    hueco = desde + libre;
  }
  if (hueco === null) {
    if (origen.lugar === destino.lugar) return { posiciones: posicionesDe(colocacion) };
    hueco = primerHuecoLibre(fila);
    if (destino.lugar === "equipo" && hueco >= TAMANO_DEL_EQUIPO) {
      return { error: "El equipo ya lleva seis. Arrástralo encima de uno para cambiarlos." };
    }
  }
  if (
    hueco < 0 ||
    (destino.lugar === "equipo" && hueco >= TAMANO_DEL_EQUIPO) ||
    hueco >= HUECOS_POR_CAJA * 50
  ) {
    return { error: "Ese hueco no existe." };
  }

  const quien = (origen.lugar === "equipo" ? colocacion.equipo : colocacion.caja)[origen.hueco];
  const ocupante = fila[hueco] ?? null;
  // El de destino se va al hueco que deja libre el que llega
  (origen.lugar === "equipo" ? colocacion.equipo : colocacion.caja)[origen.hueco] = ocupante;
  fila[hueco] = quien;
  return { posiciones: posicionesDe(colocacion) };
}

function buscar<T extends Colocable>(colocacion: Colocacion<T>, id: string) {
  const enEquipo = colocacion.equipo.findIndex((c) => c?.id === id);
  if (enEquipo >= 0) return { lugar: "equipo" as const, hueco: enEquipo };
  const enCaja = colocacion.caja.findIndex((c) => c?.id === id);
  if (enCaja >= 0) return { lugar: "caja" as const, hueco: enCaja };
  return null;
}

/**
 * Dónde entra una captura nueva: al equipo si hay sitio, como en los juegos,
 * y si no al primer hueco libre de la caja.
 */
export function sitioParaUnaNueva<T extends Colocable>(
  capturas: T[],
): { lugar: Lugar; hueco: number } {
  const colocacion = colocar(capturas);
  const enEquipo = colocacion.equipo.indexOf(null);
  if (enEquipo >= 0) return { lugar: "equipo", hueco: enEquipo };
  return { lugar: "caja", hueco: primerHuecoLibre(colocacion.caja) };
}

// ---------------------------------------------------------------------------
// Vínculos del Soul Link
// ---------------------------------------------------------------------------

export type Vinculable = {
  id: string;
  participantId: string;
  vinculo: string | null;
  zoneId: string | null;
  sitio: string | null;
  muerta: boolean;
  creado: number;
};

/**
 * Los vínculos de verdad: las capturas que comparten `vinculo` y son de
 * **al menos dos jugadores**. Un vínculo del que solo queda uno —porque se
 * borró la captura del otro— es como ir suelto, y no hace falta limpiarlo.
 */
export function vinculosDe<T extends Vinculable>(capturas: T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const captura of capturas) {
    if (!captura.vinculo) continue;
    grupos.set(captura.vinculo, [...(grupos.get(captura.vinculo) ?? []), captura]);
  }
  for (const [clave, miembros] of grupos) {
    if (new Set(miembros.map((m) => m.participantId)).size < 2) grupos.delete(clave);
  }
  return grupos;
}

/** Las compañeras de una captura en su vínculo (sin ella) */
export function companerasDe<T extends Vinculable>(capturas: T[], id: string): T[] {
  const yo = capturas.find((c) => c.id === id);
  if (!yo?.vinculo) return [];
  const grupo = vinculosDe(capturas).get(yo.vinculo) ?? [];
  return grupo.filter((c) => c.id !== id);
}

/** "Ruta 29", "ruta29" y "RUTA 29 " son el mismo sitio */
export function mismoSitio(a: string | null, b: string | null) {
  const limpio = (texto: string | null) =>
    (texto ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const x = limpio(a);
  return x !== "" && x === limpio(b);
}

function delMismoSitio(a: Vinculable, b: Vinculable) {
  if (a.zoneId || b.zoneId) return a.zoneId === b.zoneId;
  return mismoSitio(a.sitio, b.sitio);
}

/**
 * Con quién se vincula una captura nueva, **por la ruta**: la del mapa o, sin
 * mapa, el sitio escrito a mano.
 *
 * - Si en esa ruta ya hay un vínculo al que le falta este jugador (un Soul Link
 *   de tres en el que dos ya han capturado), entra en ese.
 * - Si no, se junta con las capturas **sueltas** de los demás en esa ruta: la
 *   primera de cada uno.
 * - Si no hay nadie, va suelta; se vinculará sola cuando otro capture ahí, o a
 *   mano desde su ficha.
 *
 * Las caídas no cuentan: un vínculo con un pokémon muerto nacería muerto.
 */
export function vinculoAlCapturar<T extends Vinculable>(
  nueva: Pick<T, "participantId" | "zoneId" | "sitio">,
  otras: T[],
): { unirseA: string } | { juntarCon: string[] } | null {
  const aqui = otras.filter(
    (c) =>
      c.participantId !== nueva.participantId &&
      !c.muerta &&
      delMismoSitio(c, { ...c, zoneId: nueva.zoneId, sitio: nueva.sitio }),
  );
  if (!aqui.length) return null;

  const grupos = vinculosDe(otras);
  const abiertos = [...grupos.entries()]
    .filter(
      ([, miembros]) =>
        miembros.some((m) => aqui.includes(m)) &&
        !miembros.some((m) => m.participantId === nueva.participantId) &&
        !miembros.some((m) => m.muerta),
    )
    .sort(
      (a, b) =>
        Math.min(...a[1].map((m) => m.creado)) - Math.min(...b[1].map((m) => m.creado)),
    );
  if (abiertos.length) return { unirseA: abiertos[0][0] };

  const sueltas = aqui
    .filter((c) => !c.vinculo || !grupos.has(c.vinculo))
    .sort((a, b) => a.creado - b.creado);
  const primeraDeCada = new Map<string, T>();
  for (const captura of sueltas) {
    if (!primeraDeCada.has(captura.participantId)) primeraDeCada.set(captura.participantId, captura);
  }
  return primeraDeCada.size ? { juntarCon: [...primeraDeCada.values()].map((c) => c.id) } : null;
}

/**
 * Si dos capturas se pueden vincular a mano: de jugadores distintos, vivas, y
 * sin que el vínculo resultante lleve dos del mismo jugador.
 */
export function sePuedenVincular<T extends Vinculable>(
  capturas: T[],
  unaId: string,
  otraId: string,
): string | null {
  const una = capturas.find((c) => c.id === unaId);
  const otra = capturas.find((c) => c.id === otraId);
  if (!una || !otra) return "No se encuentra alguno de los dos.";
  if (una.participantId === otra.participantId) return "Tienen que ser de jugadores distintos.";
  if (una.muerta || otra.muerta) return "Con un pokémon caído ya no se vincula nada.";
  const grupos = vinculosDe(capturas);
  const deUna = una.vinculo ? (grupos.get(una.vinculo) ?? [una]) : [una];
  const deOtra = otra.vinculo ? (grupos.get(otra.vinculo) ?? [otra]) : [otra];
  if (deUna.some((c) => c.id === otra.id)) return "Ya van vinculados.";
  const jugadores = [...deUna, ...deOtra].map((c) => c.participantId);
  if (new Set(jugadores).size !== jugadores.length) {
    return "Así quedaría un vínculo con dos pokémon del mismo jugador. Desvincula antes uno.";
  }
  return null;
}
