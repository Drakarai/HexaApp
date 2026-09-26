/**
 * Las coronas de los gimnasios: quién se pasó cada hito **antes que nadie**.
 *
 * Sale de la fecha de cada marca (`GymClear.clearedAt`), que ya se guardaba, así
 * que no hay nada que apuntar aparte. Cuenta aunque luego se retirara: fue el
 * primero igual.
 *
 * Si se desmarca y se vuelve a marcar, la fecha es la nueva. Es a propósito: la
 * marca dice cuándo se lo pasó, y si se marcó por error no se lo había pasado.
 */

type Marca = { participantId: string; levelCapId: string; clearedAt: Date };

/** De cada hito, quién o quiénes lo pasaron primero (a la vez, si empatan). */
export function primerosEnPasar(marcas: Marca[]): Map<string, Set<string>> {
  const antes = new Map<string, number>();
  for (const marca of marcas) {
    const cuando = marca.clearedAt.getTime();
    const actual = antes.get(marca.levelCapId);
    if (actual === undefined || cuando < actual) antes.set(marca.levelCapId, cuando);
  }

  const primeros = new Map<string, Set<string>>();
  for (const marca of marcas) {
    if (marca.clearedAt.getTime() !== antes.get(marca.levelCapId)) continue;
    const quienes = primeros.get(marca.levelCapId) ?? new Set<string>();
    quienes.add(marca.participantId);
    primeros.set(marca.levelCapId, quienes);
  }
  return primeros;
}

/** Cuántas coronas lleva alguien. */
export function coronasDe(participantId: string, marcas: Marca[]): number {
  let cuantas = 0;
  for (const quienes of primerosEnPasar(marcas).values()) {
    if (quienes.has(participantId)) cuantas += 1;
  }
  return cuantas;
}
