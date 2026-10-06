import { esPokemonAnil, GENERACION_ANIL } from "./anil";

/**
 * Los juegos de la saga principal, de la 1ª a la 7ª generación, con la región
 * en la que se juega cada uno. De la 8ª para arriba no hay nada a propósito:
 * el grupo no juega esos lockes de momento.
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
  | "alola"
  | "melemele"
  | "akala"
  | "ula-ula"
  | "poni";

export type Juego = {
  id: string;
  name: string;
  /** Cómo se agrupan en el desplegable */
  grupo: string;
  /** La región principal: donde empieza el juego y la que sale por defecto */
  region: Region;
  /**
   * Otras regiones jugables del mismo juego. De momento solo la 2ª generación
   * y sus remakes, que traen **Kanto entero** después de la Liga de Johto.
   */
  extra?: Region[];
  /**
   * Las **láminas de mapa** del juego, cuando no coinciden con su región.
   *
   * Alola es una región de cuatro islas, y las cuatro juntas en un lienzo dejan
   * cada ruta del tamaño de un sello: en el móvil sería imposible acertarle.
   * Así que la 7ª generación se juega en la región "alola" —de ahí salen la
   * generación y las plantillas de level caps— pero se dibuja en cuatro mapas,
   * uno por isla, con las mismas pestañas que usan Oro y Plata para Kanto.
   */
  mapas?: Region[];
  /** El tema de `themes.ts` que le pega, para proponerlo al crear la edición */
  tema?: string;
  /**
   * La generación del juego cuando **no es la de su región**: los remakes.
   * Rubí Omega es de la 6ª aunque se juegue en Hoenn, y ahí Clefairy ya es Hada.
   */
  generacion?: number;
  /**
   * Si es una **pareja** (Rojo y Azul, Rubí Omega y Zafiro Alfa…), las dos
   * versiones que la forman. Se juega a la vez en las dos: cada jugador lleva
   * la suya, que es como se reparte el grupo normalmente.
   */
  versiones?: string[];
};

export const REGIONES: {
  slug: Region;
  nombre: string;
  generacion: number;
  /**
   * Que la región no se dibuja: existe para decir de qué generación es un juego
   * y a qué level caps mira, pero sus mapas son otros. Solo le pasa a Alola.
   */
  sinMapa?: true;
}[] = [
  { slug: "kanto", nombre: "Kanto", generacion: 1 },
  { slug: "johto", nombre: "Johto", generacion: 2 },
  { slug: "hoenn", nombre: "Hoenn", generacion: 3 },
  { slug: "sinnoh", nombre: "Sinnoh", generacion: 4 },
  { slug: "teselia", nombre: "Teselia", generacion: 5 },
  { slug: "kalos", nombre: "Kalos", generacion: 6 },
  { slug: "alola", nombre: "Alola", generacion: 7, sinMapa: true },
  { slug: "melemele", nombre: "Isla Melemele", generacion: 7 },
  { slug: "akala", nombre: "Isla Akala", generacion: 7 },
  { slug: "ula-ula", nombre: "Isla Ula-Ula", generacion: 7 },
  { slug: "poni", nombre: "Isla Poni", generacion: 7 },
];

/** Las regiones que tienen mapa propio, que son las de Administración. */
export const REGIONES_DE_MAPA = REGIONES.filter((region) => !region.sinMapa);

/** En el orden en el que se recorren jugando. */
const ISLAS_DE_ALOLA: Region[] = ["melemele", "akala", "ula-ula", "poni"];

const SUELTOS: Juego[] = [
  { id: "rojo", name: "Rojo", grupo: "1ª generación", region: "kanto", tema: "rojo" },
  { id: "azul", name: "Azul", grupo: "1ª generación", region: "kanto", tema: "azul" },
  { id: "amarillo", name: "Amarillo", grupo: "1ª generación", region: "kanto", tema: "amarillo" },

  { id: "oro", name: "Oro", grupo: "2ª generación", region: "johto", extra: ["kanto"], tema: "oro" },
  { id: "plata", name: "Plata", grupo: "2ª generación", region: "johto", extra: ["kanto"], tema: "plata" },
  { id: "cristal", name: "Cristal", grupo: "2ª generación", region: "johto", extra: ["kanto"], tema: "cristal" },

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

  // La 7ª se juega en Alola pero se dibuja isla por isla: ver `mapas`
  { id: "sol", name: "Sol", grupo: "7ª generación", region: "alola", mapas: ISLAS_DE_ALOLA, tema: "sol" },
  { id: "luna", name: "Luna", grupo: "7ª generación", region: "alola", mapas: ISLAS_DE_ALOLA, tema: "luna" },
  { id: "ultrasol", name: "Ultrasol", grupo: "7ª generación", region: "alola", mapas: ISLAS_DE_ALOLA, tema: "sol" },
  { id: "ultraluna", name: "Ultraluna", grupo: "7ª generación", region: "alola", mapas: ISLAS_DE_ALOLA, tema: "luna" },

  // Los remakes, aparte pero con la región del original
  { id: "rojo-fuego", name: "Rojo Fuego", grupo: "Remakes", region: "kanto", tema: "rojo", generacion: 3 },
  { id: "verde-hoja", name: "Verde Hoja", grupo: "Remakes", region: "kanto", tema: "azul", generacion: 3 },
  { id: "heartgold", name: "HeartGold", grupo: "Remakes", region: "johto", extra: ["kanto"], tema: "oro", generacion: 4 },
  { id: "soulsilver", name: "SoulSilver", grupo: "Remakes", region: "johto", extra: ["kanto"], tema: "plata", generacion: 4 },
  { id: "rubi-omega", name: "Rubí Omega", grupo: "Remakes", region: "hoenn", tema: "rubi", generacion: 6 },
  { id: "zafiro-alfa", name: "Zafiro Alfa", grupo: "Remakes", region: "hoenn", tema: "zafiro", generacion: 6 },
];

/**
 * Los juegos que **comparten la plantilla de level caps**.
 *
 * Rojo y Azul son el mismo juego con distintos bichos, así que sus gimnasios y
 * sus niveles también son los mismos, y preparar dos listas idénticas no tiene
 * sentido. Las **terceras versiones** (Amarillo, Cristal, Esmeralda, Platino) y
 * los **remakes** van aparte a propósito, porque ahí sí suele haber cambios:
 * Platino recoloca gimnasios, Esmeralda cambia el último y los remakes tocan
 * niveles. Ultrasol y Ultraluna también van por su cuenta, que cambian
 * dominantes y añaden una prueba.
 *
 * De aquí salen las pestañas de Administración → Level caps y a qué plantilla
 * mira cada edición.
 */
export type GrupoDePlantilla = {
  id: string;
  nombre: string;
  /** Los juegos que la comparten */
  juegos: string[];
};

export const GRUPOS_DE_PLANTILLA: GrupoDePlantilla[] = [
  { id: "rojo-azul", nombre: "Rojo y Azul", juegos: ["rojo", "azul"] },
  { id: "amarillo", nombre: "Amarillo", juegos: ["amarillo"] },

  { id: "oro-plata", nombre: "Oro y Plata", juegos: ["oro", "plata"] },
  { id: "cristal", nombre: "Cristal", juegos: ["cristal"] },

  { id: "rubi-zafiro", nombre: "Rubí y Zafiro", juegos: ["rubi", "zafiro"] },
  { id: "esmeralda", nombre: "Esmeralda", juegos: ["esmeralda"] },

  { id: "diamante-perla", nombre: "Diamante y Perla", juegos: ["diamante", "perla"] },
  { id: "platino", nombre: "Platino", juegos: ["platino"] },

  { id: "negro-blanco", nombre: "Negro y Blanco", juegos: ["negro", "blanco"] },
  { id: "negro2-blanco2", nombre: "Negro 2 y Blanco 2", juegos: ["negro-2", "blanco-2"] },

  { id: "x-y", nombre: "X e Y", juegos: ["x", "y"] },

  { id: "sol-luna", nombre: "Sol y Luna", juegos: ["sol", "luna"] },
  { id: "ultrasol-ultraluna", nombre: "Ultrasol y Ultraluna", juegos: ["ultrasol", "ultraluna"] },

  { id: "rojofuego-verdehoja", nombre: "Rojo Fuego y Verde Hoja", juegos: ["rojo-fuego", "verde-hoja"] },
  { id: "heartgold-soulsilver", nombre: "HeartGold y SoulSilver", juegos: ["heartgold", "soulsilver"] },
  { id: "rubiomega-zafiroalfa", nombre: "Rubí Omega y Zafiro Alfa", juegos: ["rubi-omega", "zafiro-alfa"] },
];

const SUELTO_POR_ID = new Map(SUELTOS.map((juego) => [juego.id, juego]));

/**
 * Las **parejas**: los juegos que son el mismo con distintos bichos, sacadas de
 * las plantillas de level caps de dos juegos, que son justo esas. Se eligen
 * como un juego más —con su región, su mapa, su plantilla y su tema, los de su
 * primera versión— y luego cada jugador se queda con una de las dos. Las
 * terceras ediciones (Amarillo, Cristal, Esmeralda, Platino) no tienen pareja
 * y van sueltas.
 */
const PAREJAS: Juego[] = GRUPOS_DE_PLANTILLA.filter((grupo) => grupo.juegos.length > 1).map(
  (grupo) => {
    const primero = SUELTO_POR_ID.get(grupo.juegos[0])!;
    return {
      ...primero,
      id: grupo.id,
      name: grupo.nombre,
      versiones: grupo.juegos.map((id) => SUELTO_POR_ID.get(id)!.name),
    };
  },
);

/** Todos: los sueltos y las parejas. Cualquiera vale como juego de una edición. */
export const JUEGOS: Juego[] = [...SUELTOS, ...PAREJAS];

const POR_ID = new Map(JUEGOS.map((juego) => [juego.id, juego]));

const GRUPO_POR_JUEGO = new Map(
  GRUPOS_DE_PLANTILLA.flatMap((grupo) => [
    ...grupo.juegos.map((juegoId) => [juegoId, grupo] as const),
    // Una pareja mira a la plantilla de la que sale, que tiene su mismo id
    [grupo.id, grupo] as const,
  ]),
);
const GRUPO_POR_ID = new Map(
  GRUPOS_DE_PLANTILLA.map((grupo) => [grupo.id, grupo] as const),
);

/** A qué plantilla de level caps mira un juego. */
export function grupoDePlantillaDeJuego(id: string | null | undefined) {
  return id ? GRUPO_POR_JUEGO.get(id) : undefined;
}

export function grupoDePlantillaPorId(id: string | null | undefined) {
  return id ? GRUPO_POR_ID.get(id) : undefined;
}

/** La región de un grupo: la del primero de sus juegos, que la comparten. */
export function regionDelGrupo(grupo: GrupoDePlantilla) {
  return POR_ID.get(grupo.juegos[0])!.region;
}

/** De qué generación es, para agrupar las pestañas como el desplegable. */
export function generacionDelGrupo(grupo: GrupoDePlantilla) {
  return POR_ID.get(grupo.juegos[0])!.grupo;
}

export function juegoPorId(id: string | null | undefined) {
  return id ? POR_ID.get(id) : undefined;
}

/** La región principal de una edición, si tiene juego elegido. */
export function regionDelJuego(id: string | null | undefined) {
  return juegoPorId(id)?.region ?? null;
}

/**
 * **Todos** los mapas que se juegan en esa edición, el principal primero.
 *
 * Casi siempre es uno solo. Hay dos excepciones: la 2ª generación y sus
 * remakes, que abren Kanto entero después de la Liga de Johto, y la 7ª, que
 * reparte Alola en sus cuatro islas.
 */
export function regionesDelJuego(id: string | null | undefined): Region[] {
  const juego = juegoPorId(id);
  if (!juego) return [];
  return juego.mapas ?? [juego.region, ...(juego.extra ?? [])];
}

/**
 * La generación de una edición, que es la que manda en la tabla de tipos y en
 * los tipos de cada pokémon.
 *
 * **La del juego, no la de su región**: los remakes van con su generación
 * (Rojo Fuego 3ª, HeartGold 4ª, Rubí Omega 6ª). Antes salía de la región y
 * Rubí Omega contaba como 3ª: Clefairy salía Normal en vez de Hada. Los demás
 * juegos se juegan en la región de su generación y la sacan de ahí.
 */
export function generacionDelJuego(id: string | null | undefined) {
  const juego = juegoPorId(id);
  if (!juego) return null;
  return (
    juego.generacion ??
    REGIONES.find((region) => region.slug === juego.region)?.generacion ??
    null
  );
}

/**
 * Los tipos de un locke: los de la generación de su juego o los de ahora.
 *
 * Hasta la 5ª el tipo Hada no existía y la tabla era otra (Acero resistía a
 * Fantasma y Siniestro; en la 1ª, más cambios). Hay grupos que juegan los
 * combates con los tipos de su juego y otros que usan los de ahora, así que
 * **se elige por locke**. De la 6ª en adelante son los mismos y no hay nada
 * que elegir. Un fangame sin base no tiene generación: por defecto lleva los
 * de ahora, y "antiguos" son los de la 5ª, la última sin Hada.
 */
export type EleccionDeTipos = "antiguos" | "actuales";
export const ULTIMA_GENERACION_SIN_HADA = 5;

export function leerTipos(valor: unknown): EleccionDeTipos | null {
  return valor === "antiguos" || valor === "actuales" ? valor : null;
}

/** Si ese juego deja elegir los tipos: de la 1ª a la 5ª, o un fangame sin base */
export function puedeElegirTipos(gameId: string | null | undefined, noOficial: boolean) {
  const generacion = generacionDelJuego(gameId);
  return generacion === null ? noOficial : generacion <= ULTIMA_GENERACION_SIN_HADA;
}

/** Lo que se usa si nadie ha elegido nada */
export function tiposPorDefecto(gameId: string | null | undefined): EleccionDeTipos {
  const generacion = generacionDelJuego(gameId);
  return generacion !== null && generacion <= ULTIMA_GENERACION_SIN_HADA ? "antiguos" : "actuales";
}

/**
 * La generación con la que se leen los tipos de un locke. `null` es **la de
 * ahora** (quien llama pone la última que haya en los datos de tipos, que este
 * fichero no carga: lo lee también el navegador).
 */
export function generacionDeTipos(edicion: {
  game?: string | null;
  gameId: string | null;
  juegoNoOficial: boolean;
  tipos: string | null;
}): number | null {
  // Añil tiene sus propios tipos (los de ahora, con los suyos encima)
  if (esPokemonAnil(edicion)) return GENERACION_ANIL;
  const generacion = generacionDelJuego(edicion.gameId);
  const eleccion = leerTipos(edicion.tipos) ?? tiposPorDefecto(edicion.gameId);
  if (generacion === null) return eleccion === "antiguos" ? ULTIMA_GENERACION_SIN_HADA : null;
  if (generacion > ULTIMA_GENERACION_SIN_HADA) return generacion;
  return eleccion === "actuales" ? null : generacion;
}

export function nombreDeRegion(slug: string) {
  return REGIONES.find((region) => region.slug === slug)?.nombre ?? slug;
}

/** Las versiones entre las que se reparte el grupo, si el juego es una pareja. */
export function versionesDelJuego(id: string | null | undefined): string[] {
  return juegoPorId(id)?.versiones ?? [];
}

/** Los juegos que ya están dentro de una pareja: en el desplegable sobran. */
const EN_PAREJA = new Set(PAREJAS.flatMap((pareja) => GRUPO_POR_ID.get(pareja.id)!.juegos));

/**
 * Los juegos repartidos por generación, en el orden del desplegable: en cada
 * una, **primero la pareja y luego la tercera edición**. Las versiones sueltas
 * de una pareja no salen —se elige la pareja y se reparten—, salvo la que ya
 * tenga puesta una edición de antes (`actual`), que si no desaparecería.
 */
export function juegosPorGrupo(actual?: string | null) {
  const grupos = new Map<string, Juego[]>();
  for (const juego of SUELTOS) grupos.set(juego.grupo, grupos.get(juego.grupo) ?? []);
  for (const juego of [...PAREJAS, ...SUELTOS]) {
    if (EN_PAREJA.has(juego.id) && juego.id !== actual) continue;
    grupos.get(juego.grupo)!.push(juego);
  }
  return [...grupos.entries()];
}

/**
 * El nombre para enseñar de una edición: el del juego elegido si lo tiene, y si
 * no, lo que hubiera escrito a mano. Las ediciones de antes de que existiera la
 * lista siguen enseñando su texto tal cual.
 */
export function nombreDelJuego(
  gameId: string | null,
  game: string | null,
  /** Un fangame se llama como se escribió: su `gameId` es solo la base */
  juegoNoOficial = false,
) {
  if (juegoNoOficial) return game ?? null;
  return juegoPorId(gameId)?.name ?? game ?? null;
}

/**
 * Las versiones que se reparten en una edición: las de su pareja, salvo que el
 * juego sea no oficial, que es uno solo aunque se base en Rojo y Azul.
 */
export function versionesDeLaEdicion(edicion: {
  gameId: string | null;
  juegoNoOficial: boolean;
}): string[] {
  return edicion.juegoNoOficial ? [] : versionesDelJuego(edicion.gameId);
}

/** Lo más largo que se deja poner de nombre a un juego escrito a mano. */
const LARGO_DEL_NOMBRE = 60;

/**
 * Qué juego se ha elegido en el selector (`JuegoPicker`), ya comprobado.
 *
 * - **Oficial**: `gameId` de la lista y, en `game`, el nombre a mano si se
 *   quiso poner otro ("HeartGold / SoulSilver, random").
 * - **No oficial** (un fangame): `game` es su nombre, que es obligatorio, y
 *   `gameId` el juego en que se basa, o nada si se empieza de cero.
 *
 * Sin base de datos, para poder probarlo. Llega un objeto y no un FormData para
 * que valga igual desde un formulario que desde una prueba.
 */
export function leerJuego(campos: {
  gameId?: string | null;
  game?: string | null;
  noOficial?: string | boolean | null;
}):
  | { gameId: string | null; game: string | null; juegoNoOficial: boolean }
  | { error: string } {
  const id = String(campos.gameId ?? "").trim();
  const gameId = juegoPorId(id) ? id : null;
  const game = String(campos.game ?? "").replace(/\s+/g, " ").trim().slice(0, LARGO_DEL_NOMBRE) || null;
  const noOficial = campos.noOficial === true || campos.noOficial === "on";
  if (noOficial) {
    if (!game) return { error: "Ponle nombre al juego: \"Pokémon Añil\", por ejemplo." };
    return { gameId, game, juegoNoOficial: true };
  }
  return { gameId, game, juegoNoOficial: false };
}

/**
 * Reparte las versiones de una pareja entre los jugadores **a partes iguales y
 * al azar**: con cuatro, dos y dos; con cinco, tres y dos. `azar` se puede
 * cambiar para probarlo sin que baile.
 */
export function repartirVersiones(
  jugadores: string[],
  versiones: string[],
  azar: () => number = Math.random,
): Map<string, string> {
  const reparto = new Map<string, string>();
  if (versiones.length < 2) return reparto;
  // Fisher-Yates: barajar de verdad, no con un sort con random
  const barajados = [...jugadores];
  for (let i = barajados.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [barajados[i], barajados[j]] = [barajados[j], barajados[i]];
  }
  // La versión que sobra en un reparto impar también se sortea
  const inicio = Math.floor(azar() * versiones.length);
  barajados.forEach((id, i) => reparto.set(id, versiones[(inicio + i) % versiones.length]));
  return reparto;
}
