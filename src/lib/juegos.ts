/**
 * Los juegos de la saga principal, de la 1ª a la 7ª generación, con la región
 * en la que se juega cada uno.
 *
 * Es una lista aparte de la de `themes.ts` **a propósito**: allí quedan fuera
 * los remakes (Rubí Omega, HeartGold, Ultrasol…) porque compartirían color con
 * el original, y aquí hacen falta todos, porque cada uno es un locke distinto.
 * Lo que sí comparten es el `tema`, para poder proponerlo al crear la edición.
 *
 * Los remakes van en su propio grupo pero **apuntan a la región del original**:
 * el mapa de Johto vale igual para Oro que para HeartGold, que es la gracia.
 */

export type Region =
  | "kanto"
  | "johto"
  | "hoenn"
  | "sinnoh"
  | "teselia"
  | "kalos"
  | "alola";

export type Juego = {
  id: string;
  name: string;
  /** Cómo se agrupan en el desplegable */
  grupo: string;
  region: Region;
  /** El tema de `themes.ts` que le pega, para proponerlo al crear la edición */
  tema?: string;
};

export const REGIONES: { slug: Region; nombre: string; generacion: number }[] = [
  { slug: "kanto", nombre: "Kanto", generacion: 1 },
  { slug: "johto", nombre: "Johto", generacion: 2 },
  { slug: "hoenn", nombre: "Hoenn", generacion: 3 },
  { slug: "sinnoh", nombre: "Sinnoh", generacion: 4 },
  { slug: "teselia", nombre: "Teselia", generacion: 5 },
  { slug: "kalos", nombre: "Kalos", generacion: 6 },
  { slug: "alola", nombre: "Alola", generacion: 7 },
];

export const JUEGOS: Juego[] = [
  { id: "rojo", name: "Rojo", grupo: "1ª generación", region: "kanto", tema: "rojo" },
  { id: "azul", name: "Azul", grupo: "1ª generación", region: "kanto", tema: "azul" },
  { id: "amarillo", name: "Amarillo", grupo: "1ª generación", region: "kanto", tema: "amarillo" },

  { id: "oro", name: "Oro", grupo: "2ª generación", region: "johto", tema: "oro" },
  { id: "plata", name: "Plata", grupo: "2ª generación", region: "johto", tema: "plata" },
  { id: "cristal", name: "Cristal", grupo: "2ª generación", region: "johto", tema: "cristal" },

  { id: "rubi", name: "Rubí", grupo: "3ª generación", region: "hoenn", tema: "rubi" },
  { id: "zafiro", name: "Zafiro", grupo: "3ª generación", region: "hoenn", tema: "zafiro" },
  { id: "esmeralda", name: "Esmeralda", grupo: "3ª generación", region: "hoenn", tema: "esmeralda" },

  { id: "diamante", name: "Diamante", grupo: "4ª generación", region: "sinnoh", tema: "diamante" },
  { id: "perla", name: "Perla", grupo: "4ª generación", region: "sinnoh", tema: "perla" },
  { id: "platino", name: "Platino", grupo: "4ª generación", region: "sinnoh", tema: "platino" },

  { id: "negro", name: "Negro", grupo: "5ª generación", region: "teselia", tema: "negro" },
  { id: "blanco", name: "Blanco", grupo: "5ª generación", region: "teselia", tema: "blanco" },
  { id: "negro-2", name: "Negro 2", grupo: "5ª generación", region: "teselia", tema: "negro" },
  { id: "blanco-2", name: "Blanco 2", grupo: "5ª generación", region: "teselia", tema: "blanco" },

  { id: "x", name: "X", grupo: "6ª generación", region: "kalos", tema: "x" },
  { id: "y", name: "Y", grupo: "6ª generación", region: "kalos", tema: "y" },

  { id: "sol", name: "Sol", grupo: "7ª generación", region: "alola", tema: "sol" },
  { id: "luna", name: "Luna", grupo: "7ª generación", region: "alola", tema: "luna" },
  { id: "ultrasol", name: "Ultrasol", grupo: "7ª generación", region: "alola", tema: "sol" },
  { id: "ultraluna", name: "Ultraluna", grupo: "7ª generación", region: "alola", tema: "luna" },

  // Los remakes, aparte pero con la región del original
  { id: "rojo-fuego", name: "Rojo Fuego", grupo: "Remakes", region: "kanto", tema: "rojo" },
  { id: "verde-hoja", name: "Verde Hoja", grupo: "Remakes", region: "kanto", tema: "azul" },
  { id: "heartgold", name: "HeartGold", grupo: "Remakes", region: "johto", tema: "oro" },
  { id: "soulsilver", name: "SoulSilver", grupo: "Remakes", region: "johto", tema: "plata" },
  { id: "rubi-omega", name: "Rubí Omega", grupo: "Remakes", region: "hoenn", tema: "rubi" },
  { id: "zafiro-alfa", name: "Zafiro Alfa", grupo: "Remakes", region: "hoenn", tema: "zafiro" },
  { id: "lets-go-pikachu", name: "Let's Go, Pikachu!", grupo: "Remakes", region: "kanto", tema: "amarillo" },
  { id: "lets-go-eevee", name: "Let's Go, Eevee!", grupo: "Remakes", region: "kanto", tema: "amarillo" },
];

const POR_ID = new Map(JUEGOS.map((juego) => [juego.id, juego]));

export function juegoPorId(id: string | null | undefined) {
  return id ? POR_ID.get(id) : undefined;
}

/** La región en la que se juega una edición, si tiene juego elegido. */
export function regionDelJuego(id: string | null | undefined) {
  return juegoPorId(id)?.region ?? null;
}

export function nombreDeRegion(slug: string) {
  return REGIONES.find((region) => region.slug === slug)?.nombre ?? slug;
}

/** Los juegos repartidos por generación, en el orden del desplegable. */
export function juegosPorGrupo() {
  const grupos = new Map<string, Juego[]>();
  for (const juego of JUEGOS) {
    const lista = grupos.get(juego.grupo) ?? [];
    lista.push(juego);
    grupos.set(juego.grupo, lista);
  }
  return [...grupos.entries()];
}

/**
 * El nombre para enseñar de una edición: el del juego elegido si lo tiene, y si
 * no, lo que hubiera escrito a mano. Las ediciones de antes de que existiera la
 * lista siguen enseñando su texto tal cual.
 */
export function nombreDelJuego(gameId: string | null, game: string | null) {
  return juegoPorId(gameId)?.name ?? game ?? null;
}
