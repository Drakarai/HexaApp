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

/** Lo mismo, ya listo para pintar sus chapas: slug para la imagen y nombre */
export function tiposParaVer(
  pokemonId: number | null | undefined,
  generacion: number,
): { slug: string; nombre: string }[] {
  if (!pokemonId) return [];
  return tiposDePokemon(pokemonId, generacion)
    .map((id) => tipoPorId(id))
    .filter((t) => t !== undefined)
    .map((t) => ({ slug: t.slug, nombre: t.nombre }));
}

/**
 * Lo que le entra a un pokémon de cada tipo, **sin los neutros**: de lo que
 * más le duele a lo que no le hace nada. Con sus tipos y la tabla **de la
 * generación del locke**: hasta la 5ª el Acero resiste al Fantasma y Clefairy
 * es Normal. Es lo que se mira antes de sacarlo a combatir.
 */
export function debilidadesDe(
  pokemonId: number | null | undefined,
  generacion: number,
): { slug: string; nombre: string; x: number }[] {
  if (!pokemonId) return [];
  const suyos = tiposDePokemon(pokemonId, generacion);
  if (!suyos.length) return [];
  return tiposDeGeneracion(generacion)
    .map((atacante) => ({
      slug: atacante.slug,
      nombre: atacante.nombre,
      x: multiplicador(atacante.id, suyos, generacion),
    }))
    .filter((d) => d.x !== 1)
    .sort((a, b) => b.x - a.x);
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
 * La cobertura **de ataque** de un equipo: para cada tipo rival, lo más fuerte
 * que le pega alguien del equipo **con sus propios tipos**. No sabe qué
 * movimientos lleva cada uno —eso no se apunta—, pero los del propio tipo son
 * los que más pegan (llevan el bonus), así que es la cuenta que se hace de
 * cabeza al montar un equipo. Contra un tipo solo: lo que se mira es "¿tengo
 * con qué darle a un Acero?".
 */
export function coberturaOfensiva(
  equipo: { nombre: string; tipos: number[] }[],
  generacion: number,
) {
  return tiposDeGeneracion(generacion).map((defensor) => {
    let mejor = equipo.length ? 0 : 1;
    const quienes: string[] = [];
    for (const miembro of equipo) {
      const suyo = Math.max(0, ...miembro.tipos.map((t) => factor(t, defensor.id, generacion)));
      if (suyo > mejor) mejor = suyo;
      if (suyo > 1) quienes.push(miembro.nombre);
    }
    return { tipo: defensor, mejor, quienes };
  });
}
