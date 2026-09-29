import datos from "./evoluciones.json";
import { POKEDEX, findSpecies, type PokedexSpecies } from "./pokedex";

/**
 * A qué puede evolucionar un pokémon.
 *
 * Los datos salen de `scripts/generate-evoluciones.ts` (PokéAPI) y dicen solo
 * "esta especie viene de aquella" y en qué generación salió cada una. Con eso
 * basta: las ramas —Eevee, Tyrogue, Gloom— salen solas, y la generación deja
 * fuera lo que no existía en el juego (en un locke de Johto, Eevee no evoluciona
 * a Sylveon).
 *
 * Las **formas regionales** van aparte porque PokéAPI las cuelga de la misma
 * especie: Pikachu evoluciona a Raichu, y según el juego ese Raichu puede ser
 * el de Alola. Se ofrecen las dos, y si el que evoluciona ya es regional, su
 * forma sale la primera (un Vulpix de Alola da un Ninetales de Alola).
 *
 * Sin `server-only`: lo usa la ficha del pokémon en el navegador.
 */

type Datos = { generacion: Record<string, number>; de: Record<string, number> };
const D = datos as Datos;

/** Las evoluciones de cada especie, al revés de como vienen guardadas */
const HACIA = new Map<number, number[]>();
for (const [destino, origen] of Object.entries(D.de)) {
  HACIA.set(origen, [...(HACIA.get(origen) ?? []), Number(destino)]);
}

const POR_DEX = new Map(POKEDEX.map((especie) => [especie.dex, especie]));
/** De qué especie es cada forma: 10103 → Vulpix */
const POR_FORMA = new Map<number, { especie: PokedexSpecies; etiqueta: string }>();
for (const especie of POKEDEX) {
  for (const forma of especie.forms) {
    POR_FORMA.set(forma.id, { especie, etiqueta: forma.label });
  }
}

/** Las formas regionales y la generación en la que salieron */
const REGIONALES: [RegExp, number][] = [
  [/alola/i, 7],
  [/galar/i, 8],
  [/hisui/i, 8],
  [/paldea/i, 9],
];

function generacionDeLaForma(etiqueta: string): number | null {
  for (const [patron, generacion] of REGIONALES) {
    if (patron.test(etiqueta)) return generacion;
  }
  return null;
}

/** Qué región es una forma ("de Alola" → "alola"), para emparejarlas */
function regionDeLaForma(etiqueta: string): string | null {
  for (const [patron] of REGIONALES) {
    if (patron.test(etiqueta)) return patron.source;
  }
  return null;
}

export function generacionDeEspecie(dex: number): number | null {
  return D.generacion[String(dex)] ?? null;
}

/**
 * Qué pokémon es: por su número si lo tiene, y si no por el nombre (las
 * capturas de antes solo guardaban el nombre).
 */
export function queEs(pokemonId: number | null | undefined, especie: string) {
  if (pokemonId) {
    const forma = POR_FORMA.get(pokemonId);
    if (forma) return { especie: forma.especie, pokemonId, etiqueta: forma.etiqueta };
  }
  const porNombre = findSpecies(especie);
  return porNombre
    ? { especie: porNombre, pokemonId: porNombre.forms[0].id, etiqueta: porNombre.forms[0].label }
    : null;
}

export type OpcionDeEvolucion = {
  pokemonId: number;
  /** El nombre que se guarda: "Raichu" */
  especie: string;
  /** Lo que se enseña: "Raichu de Alola" */
  rotulo: string;
};

/**
 * Las evoluciones posibles. `generacion` es la del juego; `null` es que no se
 * sabe o que da igual (un fangame, que mete pokémon de cualquier época), y
 * entonces se ofrece todo.
 */
export function evolucionesDe(
  pokemonId: number | null | undefined,
  especie: string,
  generacion: number | null,
): OpcionDeEvolucion[] {
  const actual = queEs(pokemonId, especie);
  if (!actual) return [];
  const cabe = (salio: number | null) =>
    generacion === null || salio === null || salio <= generacion;
  const miRegion = regionDeLaForma(actual.etiqueta);

  const opciones: (OpcionDeEvolucion & { primero: boolean })[] = [];
  for (const dex of HACIA.get(actual.especie.dex) ?? []) {
    const destino = POR_DEX.get(dex);
    if (!destino || !cabe(generacionDeEspecie(dex))) continue;
    for (const forma of destino.forms) {
      const regional = generacionDeLaForma(forma.label);
      const normal = forma.label === "Normal" || forma.id === destino.dex;
      // Megas, Gigamax, tótems y demás no salen de evolucionar
      if (!normal && regional === null) continue;
      if (regional !== null && !cabe(regional)) continue;
      opciones.push({
        pokemonId: forma.id,
        especie: destino.name,
        rotulo: normal ? destino.name : `${destino.name} ${forma.label}`,
        primero: miRegion !== null && regionDeLaForma(forma.label) === miRegion,
      });
    }
  }
  // Lo de su misma región delante; el resto, en el orden de la pokédex
  return opciones
    .sort((a, b) => Number(b.primero) - Number(a.primero))
    .map(({ primero: _primero, ...opcion }) => opcion);
}
