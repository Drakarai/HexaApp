import "server-only";
import internos from "@/lib/anil-internos.json";
import mapas from "@/lib/anil-mapas.json";
import { POKEDEX_CON_ANIL } from "@/lib/pokedex";
import { naturalezaPorSlug, movimientoPorSlug, MOVIMIENTOS_POR_POKEMON } from "@/lib/movimientos";
import { objetoPorSlug } from "@/lib/objetos";
import { habilidadPorSlug } from "@/lib/habilidades";
import type { DondeEnLaPartida, PartidaLeida, PokemonDeLaPartida } from "./essentials";

/**
 * De los nombres internos de Pokémon Añil («CHARMELEON», «BLAZE», «EMBER») a
 * los de la app («Charmeleon», «blaze», «ember»), con las tablas que saca
 * `scripts/anil.py` de los datos del juego (`lib/anil-internos.json`) y los
 * nombres de sus mapas (`lib/anil-mapas.json`, de `scripts/anil-mapas.ts`).
 *
 * Solo en el servidor: las tablas pesan y el navegador no las necesita.
 */

type Internos = {
  especies: Record<string, number>;
  formas: Record<string, number>;
  habilidadesDe: Record<string, [string[], string[]]>;
  habilidades: Record<string, string>;
  movimientos: Record<string, string>;
  objetos: Record<string, string>;
};
const I = internos as unknown as Internos;
const NOMBRES_DE_MAPAS = mapas as Record<string, string>;
const NOMBRE_POR_DEX = new Map(POKEDEX_CON_ANIL.map((e) => [e.dex, e.name]));

export type PokemonTraducido = {
  /** Dónde está en la partida, que es lo que lo distingue: «e0» (equipo) o «c3-12» (caja 4, hueco 13) */
  clave: string;
  donde: DondeEnLaPartida;
  /** El nombre de su especie en la app («Vulpix») y el número de su forma (10103, el de Alola) */
  especie: string;
  pokemonId: number;
  /**
   * Si la forma es seguro esa: las que la app no tiene aparte (los dibujos de
   * Vivillon, las letras de Unown) se leen como la normal, y entonces no se le
   * cambia la que tenga apuntada.
   */
  formaExacta: boolean;
  mote: string | null;
  shiny: boolean;
  naturaleza: string | null;
  habilidad: string | null;
  objeto: string | null;
  movimientos: string[];
  /** Dónde se consiguió, con el nombre que le da el juego («Ruta 10 Norte»); null si no se sabe */
  sitio: string | null;
  /** Cuándo se consiguió (ISO), o null */
  recibido: string | null;
  /** Lo que no se ha podido traducir, para avisar en vez de perderlo sin decir nada */
  avisos: string[];
};

export const claveDe = (donde: DondeEnLaPartida) =>
  donde.lugar === "equipo" ? `e${donde.hueco}` : `c${donde.caja}-${donde.hueco}`;

/**
 * Su habilidad, como la calcula el juego: la de la **cápsula** del modo Random
 * si se la cambió con una; si no, la **forzada** por el modo Random; si no, la
 * que ya tenga **guardada** (el juego la guarda en cuanto la mira); y si no, la
 * de su especie según su índice —0 y 1 las normales, 2 en adelante la oculta,
 * que si no existe vuelve a una normal—, con las de la tabla del Random si está
 * puesto. Ver `Pokemon#ability_id` en Essentials y el plugin «Modo Random».
 */
export function habilidadInterna(
  p: Pick<PokemonDeLaPartida, "especie" | "forma" | "habilidad">,
  random: PartidaLeida["habilidadesRandom"],
): string | null {
  const h = p.habilidad;
  if (h.capsula) return h.capsula;
  if (h.forzada) return h.forzada;
  if (h.guardada) return h.guardada;
  const conForma = p.forma ? `${p.especie}_${p.forma}` : null;
  // Una forma sin habilidades propias tiene las de su especie
  const lista =
    (conForma && random?.[conForma]) ||
    random?.[p.especie] ||
    (conForma && I.habilidadesDe[conForma]) ||
    I.habilidadesDe[p.especie];
  if (!lista) return null;
  const [normales, ocultas] = lista;
  let indice = h.indice;
  if (indice >= 2) {
    const oculta = ocultas[indice - 2];
    if (oculta) return oculta;
    indice = h.personalID & 1;
  }
  return normales[indice] || normales[0] || null;
}

/** El nombre del sitio donde se consiguió: el texto del regalo si lo tiene, si no el de su mapa */
export function sitioDe(p: Pick<PokemonDeLaPartida, "mapa" | "textoDeObtencion">): string | null {
  if (p.textoDeObtencion) return p.textoDeObtencion;
  if (!p.mapa) return null;
  return NOMBRES_DE_MAPAS[String(p.mapa)] ?? null;
}

export function traducir(p: PokemonDeLaPartida, random: PartidaLeida["habilidadesRandom"]): PokemonTraducido | null {
  const dex = I.especies[p.especie];
  if (!dex) return null;
  const deLaForma = p.forma ? I.formas[`${p.especie}_${p.forma}`] : undefined;
  const pokemonId = deLaForma ?? dex;
  const especie = NOMBRE_POR_DEX.get(dex) ?? p.especie;
  const avisos: string[] = [];

  const naturaleza = p.naturaleza ? p.naturaleza.toLowerCase() : null;
  const internaDeHabilidad = habilidadInterna(p, random);
  const habilidad = internaDeHabilidad ? (I.habilidades[internaDeHabilidad] ?? null) : null;
  if (internaDeHabilidad && !habilidadPorSlug(habilidad, true)) avisos.push(`la habilidad ${internaDeHabilidad}`);

  const objeto = p.objeto ? (I.objetos[p.objeto] ?? null) : null;
  if (p.objeto && !(objeto && objetoPorSlug(objeto))) avisos.push(`el objeto ${p.objeto}`);

  const movimientos: string[] = [];
  for (const m of p.movimientos) {
    const slug = I.movimientos[m];
    if (slug && movimientoPorSlug(slug)) {
      if (!movimientos.includes(slug)) movimientos.push(slug);
    } else avisos.push(`el movimiento ${m}`);
  }

  // Un mote igual que su especie es que no tiene mote
  const plano = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const mote = p.mote && plano(p.mote) !== plano(especie) ? p.mote.slice(0, 40) : null;

  return {
    clave: claveDe(p.donde),
    donde: p.donde,
    especie,
    pokemonId,
    formaExacta: !p.forma || deLaForma !== undefined,
    mote,
    shiny: p.shiny,
    naturaleza: naturaleza && naturalezaPorSlug(naturaleza) ? naturaleza : null,
    habilidad: habilidad && habilidadPorSlug(habilidad, true) ? habilidad : null,
    objeto: objeto && objetoPorSlug(objeto) ? objeto : null,
    movimientos: movimientos.slice(0, MOVIMIENTOS_POR_POKEMON),
    sitio: sitioDe(p),
    recibido: p.recibido ? new Date(p.recibido * 1000).toISOString() : null,
    avisos,
  };
}

/**
 * Lo que llega del navegador, comprobado: es lo que mandaría cualquiera, así
 * que se mira cada campo y se recorta lo que sobra. Lo que no tiene la forma
 * que toca se descarta.
 */
export function partidaDelNavegador(entrada: unknown): PartidaLeida | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const corto = (v: unknown, largo = 60) => (typeof v === "string" ? v.slice(0, largo) : null);
  const entero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null);
  const interno = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_]{1,40}$/.test(v) ? v : null);

  const pokemon: PokemonDeLaPartida[] = [];
  for (const bruto of Array.isArray(e.pokemon) ? e.pokemon.slice(0, 2000) : []) {
    if (!bruto || typeof bruto !== "object") continue;
    const p = bruto as Record<string, unknown>;
    const especie = interno(p.especie);
    const d = p.donde as Record<string, unknown> | undefined;
    const hueco = entero(d?.hueco);
    if (!especie || !d || hueco === null || hueco < 0) continue;
    let donde: DondeEnLaPartida;
    if (d.lugar === "equipo" && hueco < 6) donde = { lugar: "equipo", hueco };
    else if (d.lugar === "caja" && (entero(d.caja) ?? -1) >= 0 && hueco < 100) donde = { lugar: "caja", caja: entero(d.caja)!, hueco };
    else continue;
    const h = (p.habilidad ?? {}) as Record<string, unknown>;
    pokemon.push({
      especie,
      forma: Math.max(0, entero(p.forma) ?? 0),
      mote: corto(p.mote, 40),
      shiny: p.shiny === true,
      naturaleza: interno(p.naturaleza),
      habilidad: {
        guardada: interno(h.guardada),
        forzada: interno(h.forzada),
        capsula: interno(h.capsula),
        indice: Math.max(0, entero(h.indice) ?? 0),
        personalID: entero(h.personalID) ?? 0,
      },
      objeto: interno(p.objeto),
      movimientos: (Array.isArray(p.movimientos) ? p.movimientos : []).map(interno).filter((m): m is string => Boolean(m)).slice(0, 8),
      mapa: entero(p.mapa),
      textoDeObtencion: corto(p.textoDeObtencion, 80),
      recibido: entero(p.recibido),
      donde,
    });
  }
  let habilidadesRandom: PartidaLeida["habilidadesRandom"] = null;
  if (e.habilidadesRandom && typeof e.habilidadesRandom === "object") {
    habilidadesRandom = {};
    for (const [clave, valor] of Object.entries(e.habilidadesRandom as Record<string, unknown>).slice(0, 3000)) {
      if (!interno(clave) || !Array.isArray(valor) || valor.length !== 2) continue;
      const lista = (v: unknown) => (Array.isArray(v) ? v.map(interno).map((h) => h ?? "").slice(0, 4) : []);
      habilidadesRandom[clave] = [lista(valor[0]), lista(valor[1])];
    }
  }
  return {
    jugador: corto(e.jugador, 40),
    pokemon,
    cajas: (Array.isArray(e.cajas) ? e.cajas : []).slice(0, 200).map((c, i) => corto(c, 40) ?? `Caja ${i + 1}`),
    habilidadesRandom,
  };
}
