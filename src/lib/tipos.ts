import datos from "./tipos.json";

/**
 * Los tipos, la tabla de efectividad y qué es cada pokémon.
 *
 * Todo sale de `scripts/generate-tipos.ts`, que baja los datos de PokéAPI y
 * calcula **una tabla por generación**. Eso importa: en un locke de 2ª
 * generación el Acero resiste al Fantasma y el tipo Hada no existe, así que
 * decir lo de hoy sería engañar a quien está preparando un combate.
 *
 * Aquí no hay nada escrito a mano, ni la tabla ni los tipos de nadie. Este
 * fichero solo sabe consultar.
 */

export type Tipo = {
  id: number;
  slug: string;
  nombre: string;
  /** Desde qué generación existe */
  desde: number;
};

type Datos = {
  tipos: Tipo[];
  /** Por generación, la matriz [atacante-1][defensor-1] con 0, 50, 100 o 200 */
  tabla: Record<string, number[][]>;
  porPokemon: Record<string, number[]>;
  pasado: Record<string, Record<string, number[]>>;
};

const D = datos as Datos;

export const TIPOS: Tipo[] = D.tipos;

/** La última generación de la que hay datos, y la que se usa si no se sabe. */
export const GENERACION_POR_DEFECTO = Math.max(
  ...Object.keys(D.tabla).map(Number),
);

const POR_ID = new Map(TIPOS.map((tipo) => [tipo.id, tipo]));

export function tipoPorId(id: number): Tipo | undefined {
  return POR_ID.get(id);
}

/** Los tipos que existían en esa generación: sin Hada antes de la 6ª. */
export function tiposDeGeneracion(generacion: number): Tipo[] {
  return TIPOS.filter((tipo) => tipo.desde <= generacion);
}

/**
 * Los tipos de un pokémon **en esa generación**.
 *
 * Los que cambiaron traen una lista de "hasta la generación tal era esto";
 * manda la entrada más antigua que llegue hasta la generación que se pide, y si
 * no hay ninguna, lo de hoy. Así Clefairy sale Normal en un locke de Johto y
 * Hada en uno de Kalos.
 */
export function tiposDePokemon(
  pokemonId: number,
  generacion: number,
): number[] {
  const cambios = D.pasado[String(pokemonId)];
  if (cambios) {
    const cual = Object.keys(cambios)
      .map(Number)
      .filter((hasta) => hasta >= generacion)
      .sort((a, b) => a - b)[0];
    if (cual !== undefined) return cambios[String(cual)];
  }
  return D.porPokemon[String(pokemonId)] ?? [];
}

/** Cuánto le entra a un tipo un ataque de otro: 0, 0.5, 1 o 2. */
export function factor(
  atacante: number,
  defensor: number,
  generacion: number,
): number {
  const matriz = D.tabla[String(generacion)] ?? D.tabla[String(GENERACION_POR_DEFECTO)];
  const valor = matriz?.[atacante - 1]?.[defensor - 1];
  return (valor ?? 100) / 100;
}

/**
 * Cuánto le entra a un pokémon un ataque de un tipo: el producto de lo que le
 * hace a cada uno de sus tipos. Un Durant (Bicho/Acero) contra Fuego son 2 × 2.
 */
export function multiplicador(
  atacante: number,
  defensores: number[],
  generacion: number,
): number {
  return defensores.reduce(
    (total, defensor) => total * factor(atacante, defensor, generacion),
    1,
  );
}

/** "×½", "×2", "×0"… Con fracciones de verdad, que se leen mejor que 0.25. */
export function comoSeLee(multiplicador: number): string {
  if (multiplicador === 0) return "×0";
  if (multiplicador === 0.25) return "×¼";
  if (multiplicador === 0.5) return "×½";
  if (multiplicador === 1) return "×1";
  return `×${multiplicador}`;
}

/**
 * El color de cada tipo, el de toda la vida. Van aquí y no en `globals.css`
 * porque hay que poder pintarlos desde JavaScript (la tabla se arma sola) y
 * porque son datos, no estilo de la aplicación.
 */
export const COLOR_DE_TIPO: Record<string, string> = {
  normal: "#9fa19f",
  fighting: "#ff8000",
  flying: "#81b9ef",
  poison: "#9141cb",
  ground: "#915121",
  rock: "#afa981",
  bug: "#91a119",
  ghost: "#704170",
  steel: "#60a1b8",
  fire: "#e62829",
  water: "#2980ef",
  grass: "#3fa129",
  electric: "#fac000",
  psychic: "#ef4179",
  ice: "#3dcef3",
  dragon: "#5060e1",
  dark: "#624d4e",
  fairy: "#ef70ef",
};

export function colorDeTipo(slug: string) {
  return COLOR_DE_TIPO[slug] ?? "#64748b";
}
