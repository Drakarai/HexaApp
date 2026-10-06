import datos from "./evoluciones.json";
import { POKEDEX_CON_ANIL, findSpecies, type PokedexSpecies } from "./pokedex";
import { ESPECIES_DE_ANIL, esPokemonDeAnil } from "./anil";

/**
 * A qué puede evolucionar un pokémon.
 *
 * Los datos salen de `scripts/generate-evoluciones.ts` (PokéAPI) y dicen solo
 * "esta especie viene de aquella". Con eso basta: las ramas —Eevee, Tyrogue,
 * Gloom— salen solas.
 *
 * **Sin límite por juego ni por generación**, a propósito. Se probó a quitar lo
 * que no existía en el juego, y la generación salía de la región: HeartGold
 * contaba como Johto (2ª) y se quedaba sin Roselia, Magnezone o Togekiss, Rojo
 * Fuego sin Crobat ni Steelix… y entre randoms, fangames e intercambios, lo que
 * se sale de la pokédex del juego es lo normal. Se ofrece todo y elige quien
 * juega.
 *
 * Las **formas** van aparte porque PokéAPI las cuelga de la misma especie:
 * Pikachu evoluciona a Raichu, que puede ser el de Alola; Rockruff, a las tres
 * Lycanroc. Salen todas menos las que no se consiguen evolucionando (megas,
 * Gigamax, tótems, formas de combate), y si el que evoluciona ya es regional,
 * su forma sale la primera (un Vulpix de Alola da un Ninetales de Alola).
 *
 * Sin `server-only`: lo usa la ficha del pokémon en el navegador.
 */

type Datos = { de: Record<string, number> };
const D = datos as Datos;

/** Las evoluciones de cada especie, al revés de como vienen guardadas */
const HACIA = new Map<number, number[]>();
for (const [destino, origen] of Object.entries(D.de)) {
  HACIA.set(origen, [...(HACIA.get(origen) ?? []), Number(destino)]);
}

/**
 * Las de Pokémon Añil (Eevee → Royaleon, Cefireon) van aparte: solo se ofrecen
 * en sus lockes (`conAnil`). Saber **qué es** un Royaleon, en cambio, vale
 * siempre: no estorba y así su historia encuentra a su familia.
 */
const HACIA_EN_ANIL = new Map<number, number[]>();
const DE_EN_ANIL = new Map<number, number>();
for (const especie of ESPECIES_DE_ANIL) {
  HACIA_EN_ANIL.set(especie.de, [...(HACIA_EN_ANIL.get(especie.de) ?? []), especie.dex]);
  DE_EN_ANIL.set(especie.dex, especie.de);
}

const POR_DEX = new Map(POKEDEX_CON_ANIL.map((especie) => [especie.dex, especie]));
/** De qué especie es cada forma: 10103 → Vulpix (y las de Añil, que saber qué son no estorba) */
const POR_FORMA = new Map<number, { especie: PokedexSpecies; etiqueta: string }>();
for (const especie of POKEDEX_CON_ANIL) {
  for (const forma of especie.forms) {
    POR_FORMA.set(forma.id, { especie, etiqueta: forma.label });
  }
}

/** Las formas regionales, para poner delante la de la misma región */
const REGIONALES = [/alola/i, /galar/i, /hisui/i, /paldea/i];

/** Qué región es una forma ("de Alola" → "alola"), para emparejarlas */
function regionDeLaForma(etiqueta: string): string | null {
  return REGIONALES.find((patron) => patron.test(etiqueta))?.source ?? null;
}

/**
 * Las formas que no salen de evolucionar: megas y Gigamax, tótems, las de
 * combate (Aegislash Filo, Darmanitan Daruma, Palafin Héroe), los disfraces de
 * Pikachu y las de otra historia (Ursaluna Luna Carmesí, Floette Eterna).
 */
const NO_SE_EVOLUCIONA_A =
  /mega|gmax|t[oó]tem|battle bond|\bash\b|filo|daruma|hero|eterna|carmes|gorra|starter|rock star|belle|pop star|phd|libre|cosplay|amarillo/i;

/**
 * Qué pokémon es: por su número si lo tiene, y si no por el nombre (las
 * capturas de antes solo guardaban el nombre).
 */
export function queEs(pokemonId: number | null | undefined, especie: string) {
  if (pokemonId) {
    const forma = POR_FORMA.get(pokemonId);
    if (forma) return { especie: forma.especie, pokemonId, etiqueta: forma.etiqueta };
  }
  const porNombre = findSpecies(especie, true);
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
 * La etiqueta de una forma para leerla detrás del nombre. Unas pocas vienen de
 * PokéAPI sin traducir y con el nombre delante ("Basculegion Female"): se le
 * quita el nombre y se traduce lo que hay.
 */
const EN_CASTELLANO: [RegExp, string][] = [
  [/^female$/i, "hembra"],
  [/^three segment$/i, "de tres segmentos"],
  [/^family of three$/i, "familia de tres"],
];
function etiquetaLimpia(especie: string, etiqueta: string) {
  const sinNombre = etiqueta.startsWith(`${especie} `) ? etiqueta.slice(especie.length + 1) : etiqueta;
  return EN_CASTELLANO.find(([patron]) => patron.test(sinNombre))?.[1] ?? sinNombre;
}

/** Las evoluciones posibles, todas: ver arriba por qué sin límite de juego */
export function evolucionesDe(
  pokemonId: number | null | undefined,
  especie: string,
  /** Si el locke es de Pokémon Añil: entonces también sus evoluciones */
  conAnil = false,
): OpcionDeEvolucion[] {
  const actual = queEs(pokemonId, especie);
  if (!actual) return [];
  const miRegion = regionDeLaForma(actual.etiqueta);

  const opciones: (OpcionDeEvolucion & { primero: boolean })[] = [];
  const hacia = [
    ...(HACIA.get(actual.especie.dex) ?? []),
    ...(conAnil ? (HACIA_EN_ANIL.get(actual.especie.dex) ?? []) : []),
  ];
  for (const dex of hacia) {
    const destino = POR_DEX.get(dex);
    if (!destino) continue;
    for (const forma of destino.forms) {
      // Las formas de Añil, solo en sus lockes
      if (!conAnil && esPokemonDeAnil(forma.id)) continue;
      const normal = forma.label === "Normal" || forma.id === destino.dex;
      if (!normal && NO_SE_EVOLUCIONA_A.test(forma.label)) continue;
      opciones.push({
        pokemonId: forma.id,
        especie: destino.name,
        rotulo: normal ? destino.name : `${destino.name} ${etiquetaLimpia(destino.name, forma.label)}`,
        primero: miRegion !== null && regionDeLaForma(forma.label) === miRegion,
      });
    }
  }
  // Lo de su misma región delante; el resto, en el orden de la pokédex
  return opciones
    .sort((a, b) => Number(b.primero) - Number(a.primero))
    .map(({ primero: _primero, ...opcion }) => opcion);
}

/**
 * El primero de su familia: Typhlosion → Cyndaquil, Raichu → Pichu. Dos
 * pokémon con la misma raíz pueden ser **el mismo, evolucionado**, que es lo
 * que hace falta para seguirle la pista por las jornadas (ver lib/historia.ts).
 */
export function raizDeLaFamilia(pokemonId: number | null | undefined, especie: string) {
  const quien = queEs(pokemonId, especie);
  if (!quien) return null;
  let dex = quien.especie.dex;
  // Por si los datos trajeran un ciclo, que no se quede aquí para siempre
  for (let vueltas = 0; (D.de[String(dex)] || DE_EN_ANIL.has(dex)) && vueltas < 5; vueltas++) {
    dex = D.de[String(dex)] ?? DE_EN_ANIL.get(dex)!;
  }
  return dex;
}
