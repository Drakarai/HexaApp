import "server-only";
import tablas from "@/lib/partida/oficial-tablas.json";
import { POKEDEX } from "@/lib/pokedex";
import { MOVIMIENTOS_POR_POKEMON } from "@/lib/movimientos";
import { claveDe, sinMoteDeEspecie, type PokemonTraducido } from "./traducir";
import { GENERACION_DE, type Familia, type PartidaOficial, type PokemonOficial } from "./oficial/comun";

/**
 * De los números de un juego oficial (especie, movimiento, objeto, habilidad,
 * lugar) a lo de la app, con las tablas de `scripts/partidas-oficiales.py`
 * (PokéAPI y PKHeX). Los objetos cambian de número según la generación y los
 * lugares según el juego; lo demás es igual en todos.
 */

type Tablas = {
  movimientos: Record<string, string>;
  habilidades: Record<string, string>;
  naturalezas: (string | null)[];
  objetos: Record<string, Record<string, string>>;
  formas: Record<string, number>;
  habilidadesG3: Record<string, (string | null)[]>;
  lugares: Record<string, Record<string, string>>;
};
const T = tablas as unknown as Tablas;
const NOMBRE_POR_DEX = new Map(POKEDEX.map((e) => [e.dex, e.name]));

/** Qué tabla de lugares usa cada familia: los juegos de una generación comparten la suya */
const LUGARES: Record<Familia, string | null> = {
  rby: null,
  // Oro y Plata no guardan dónde se capturó; Cristal sí
  gs: null,
  c: "gsc",
  rs: "rsefrlg",
  e: "rsefrlg",
  frlg: "rsefrlg",
  dp: "hgss",
  pt: "hgss",
  hgss: "hgss",
  bw: "bw2",
  b2w2: "bw2",
  xy: "xy",
  oras: "xy",
  sm: "sm",
  usum: "sm",
};

export function traducirOficial(p: PokemonOficial, familia: Familia): PokemonTraducido | null {
  const especie = NOMBRE_POR_DEX.get(p.especie);
  if (!especie) return null;
  const generacion = GENERACION_DE[familia];
  const deLaForma = p.forma ? T.formas[`${p.especie}_${p.forma}`] : undefined;
  const avisos: string[] = [];

  let habilidad: string | null = null;
  if (generacion === 3) {
    const suyas = T.habilidadesG3[String(p.especie)] ?? [];
    habilidad = suyas[p.ranuraDeHabilidad ?? 0] ?? suyas[0] ?? null;
  } else if (p.habilidad) {
    habilidad = T.habilidades[String(p.habilidad)] ?? null;
    if (!habilidad) avisos.push(`la habilidad nº ${p.habilidad}`);
  }

  let objeto: string | null = null;
  if (p.objeto) {
    objeto = T.objetos[String(generacion)]?.[String(p.objeto)] ?? null;
    if (!objeto) avisos.push(`el objeto nº ${p.objeto}`);
  }

  const movimientos: string[] = [];
  for (const m of p.movimientos) {
    const slug = T.movimientos[String(m)];
    if (slug) {
      if (!movimientos.includes(slug)) movimientos.push(slug);
    } else avisos.push(`el movimiento nº ${m}`);
  }

  const tablaDeLugares = LUGARES[familia];
  const sitio = tablaDeLugares && p.lugar ? (T.lugares[tablaDeLugares]?.[String(p.lugar)] ?? null) : null;

  return {
    clave: claveDe(p.donde),
    donde: p.donde,
    especie,
    pokemonId: deLaForma ?? p.especie,
    formaExacta: !p.forma || deLaForma !== undefined,
    mote: sinMoteDeEspecie(p.mote, especie),
    shiny: p.shiny,
    naturaleza: p.naturaleza !== null ? (T.naturalezas[p.naturaleza] ?? null) : null,
    habilidad,
    objeto,
    movimientos: movimientos.slice(0, MOVIMIENTOS_POR_POKEMON),
    sitio,
    // Solo el día: a mediodía, para que ningún huso horario lo cambie de fecha
    recibido: p.fecha ? `${p.fecha}T12:00:00.000Z` : null,
    avisos,
  };
}

const FAMILIAS = new Set(Object.keys(GENERACION_DE));

/** Lo que llega del navegador, comprobado campo a campo (ver `partidaDelNavegador`) */
export function partidaOficialDelNavegador(entrada: unknown): PartidaOficial | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  if (e.tipo !== "oficial" || typeof e.familia !== "string" || !FAMILIAS.has(e.familia)) return null;
  const entero = (v: unknown, max = 0xffff) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
  const pokemon: PokemonOficial[] = [];
  for (const bruto of Array.isArray(e.pokemon) ? e.pokemon.slice(0, 2000) : []) {
    if (!bruto || typeof bruto !== "object") continue;
    const p = bruto as Record<string, unknown>;
    const especie = entero(p.especie, 2000);
    const d = p.donde as Record<string, unknown> | undefined;
    const hueco = entero(d?.hueco, 100);
    if (!especie || !d || hueco === null) continue;
    const caja = entero(d.caja, 200);
    const donde =
      d.lugar === "equipo" && hueco < 6
        ? ({ lugar: "equipo", hueco } as const)
        : d.lugar === "caja" && caja !== null
          ? ({ lugar: "caja", caja, hueco } as const)
          : null;
    if (!donde) continue;
    pokemon.push({
      especie,
      forma: entero(p.forma, 64) ?? 0,
      mote: typeof p.mote === "string" ? p.mote.slice(0, 24) : null,
      shiny: p.shiny === true,
      naturaleza: entero(p.naturaleza, 24),
      habilidad: entero(p.habilidad, 1000),
      ranuraDeHabilidad: entero(p.ranuraDeHabilidad, 1),
      objeto: entero(p.objeto, 5000),
      movimientos: (Array.isArray(p.movimientos) ? p.movimientos : [])
        .map((m) => entero(m, 2000))
        .filter((m): m is number => Boolean(m))
        .slice(0, 4),
      lugar: entero(p.lugar, 70000),
      fecha: typeof p.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : null,
      donde,
    });
  }
  return {
    tipo: "oficial",
    familia: e.familia as Familia,
    jugador: typeof e.jugador === "string" ? e.jugador.slice(0, 24) : null,
    pokemon,
    cajas: (Array.isArray(e.cajas) ? e.cajas : []).slice(0, 200).map((c, i) => (typeof c === "string" ? c.slice(0, 30) : `Caja ${i + 1}`)),
  };
}
