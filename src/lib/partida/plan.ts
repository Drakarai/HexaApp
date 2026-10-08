import { raizDeLaFamilia, queEs } from "@/lib/evoluciones";
import { naturalezaPorSlug, movimientoPorSlug } from "@/lib/movimientos";
import { objetoPorSlug } from "@/lib/objetos";
import { habilidadPorSlug } from "@/lib/habilidades";
import type { PokemonTraducido } from "./traducir";

/**
 * Qué hay que hacer en el Equipo y PC de alguien para ponerlo como su partida
 * de Añil. Son **cuentas sueltas**, sin base de datos: las usan la vista
 * previa y el «Aplicar», que lo vuelve a calcular en el servidor con lo que
 * haya en ese momento (no se fía de la vista previa), y las pruebas.
 *
 * - **Quién es quién**: por el **mote y la especie**, sin mirar mayúsculas,
 *   tildes ni espacios («CHISPAS» en el juego es «Chispas» en la app), y la
 *   especie por **familia**, porque el de la app puede no haber evolucionado
 *   todavía. Los que no llevan mote, con los que tampoco lo llevan y son de su
 *   familia. Si hay dos candidatos, el que se apuntó más cerca de la fecha en
 *   que se capturó en el juego. Nada de emparejar «a ojo» un mote con uno sin
 *   mote: sale como nuevo en la vista previa y se puede desmarcar.
 * - Los que están **en la caja de los caídos** (la última, salvo que se elija
 *   otra) solo **se dan por muertos**. Si no estaban en la app, se apuntan en el
 *   cementerio y ya está.
 * - Los demás: si ya estaban, se les pone al día la especie (evolución), la
 *   forma, el shiny, la naturaleza, la habilidad, el objeto y los movimientos.
 *   Si no, se apuntan con todo eso, la fecha de captura y su ruta.
 * - Lo que solo está en la app no se toca: puede haberse liberado, o ser una
 *   captura fallida que no llegó al juego.
 */

export type CapturaParaPlan = {
  id: string;
  species: string;
  nickname: string | null;
  pokemonId: number | null;
  shiny: boolean;
  naturaleza: string | null;
  objeto: string | null;
  movimientos: string[];
  habilidad: string | null;
  muerta: boolean;
  /** Cuándo se apuntó (ISO) */
  creado: string;
};

/** Una baja del cementerio apuntada a mano, sin captura detrás */
export type BajaSuelta = { id: string; species: string; nickname: string | null };

export type ZonaParaPlan = { id: string; name: string; label: string };

export type Cambio = { campo: string; antes: string; despues: string };

export type DatosNuevos = {
  species?: string;
  pokemonId?: number;
  shiny?: boolean;
  naturaleza?: string | null;
  habilidad?: string | null;
  objeto?: string | null;
  movimientos?: string[];
};

export type PasoDelPlan =
  | {
      tipo: "actualizar";
      clave: string;
      captureId: string;
      nombre: string;
      /** Qué pokémon es, ya al día, para su dibujo en la vista previa */
      pokemonId: number;
      shiny: boolean;
      cambios: Cambio[];
      datos: DatosNuevos;
      /** Si es una evolución, para su historia */
      evoluciona: { de: string; a: string } | null;
    }
  | {
      tipo: "nueva";
      clave: string;
      nombre: string;
      pokemon: PokemonTraducido;
      zoneId: string | null;
      /** Cómo se llama la zona de la app en la que se apunta, para la vista previa */
      zona: string | null;
      /** El nombre del juego cuando no es exactamente el de la zona («Ruta 10 Norte») */
      nota: string | null;
    }
  | { tipo: "muere"; clave: string; captureId: string; nombre: string; pokemonId: number | null; shiny: boolean }
  | { tipo: "baja"; clave: string; nombre: string; pokemon: PokemonTraducido };

export type Plan = {
  pasos: PasoDelPlan[];
  /** Los que ya estaban igual */
  iguales: number;
  /** Los de la caja de caídos que ya estaban en el cementerio */
  yaCaidos: number;
  /** Vivos en el juego pero caídos en la app (se dejan: revivir es cosa de premios) */
  caidosEnLaApp: string[];
  /** Vivos en la app que no salen en la partida (se dejan como están) */
  soloEnLaApp: string[];
};

/** Sin mayúsculas, tildes, espacios ni signos: «Nieví » y «NIEVI» son lo mismo */
export function plano(texto: string | null | undefined) {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const palabras = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * En qué zona del mapa se apunta un sitio del juego:
 * - Si se llama igual que una zona («Ruta 10»), en esa.
 * - Si empieza por el nombre entero de una zona y sigue con algo más («Ruta 10
 *   Norte», que en Añil parte la ruta en dos), en esa, con el nombre del juego
 *   de nota. Por **palabras enteras**: «Ruta 1» no es el principio de «Ruta 10».
 * - Si no, en ninguna: que lo ponga quien juega. Con solo «Ruta» en común no
 *   basta.
 * Si dos zonas se llaman igual, la que no cuelga de otra.
 */
export function zonaDelSitio(
  sitio: string | null,
  zonas: ZonaParaPlan[],
): { zona: ZonaParaPlan; nota: string | null } | null {
  if (!sitio) return null;
  const delSitio = palabras(sitio);
  if (!delSitio.length) return null;
  let mejor: { zona: ZonaParaPlan; largo: number; exacta: boolean } | null = null;
  for (const zona of zonas) {
    const deLaZona = palabras(zona.name);
    if (!deLaZona.length || deLaZona.length > delSitio.length) continue;
    if (!deLaZona.every((p, i) => p === delSitio[i])) continue;
    const exacta = deLaZona.length === delSitio.length;
    const suelta = zona.label === zona.name;
    if (
      !mejor ||
      deLaZona.length > mejor.largo ||
      (deLaZona.length === mejor.largo && suelta && mejor.zona.label !== mejor.zona.name)
    ) {
      mejor = { zona, largo: deLaZona.length, exacta };
    }
  }
  if (!mejor) return null;
  return { zona: mejor.zona, nota: mejor.exacta ? null : sitio.trim() };
}

const familia = (pokemonId: number | null | undefined, especie: string) => raizDeLaFamilia(pokemonId, especie);

/** El mote para emparejar: el que sea igual a su especie no cuenta como mote */
function moteDe(mote: string | null, especie: string) {
  const m = plano(mote);
  return m && m !== plano(especie) ? m : "";
}

const nombreDe = (p: { nickname?: string | null; mote?: string | null; species?: string; especie?: string }) =>
  p.nickname || p.mote || p.species || p.especie || "";

/** Distancia en días entre dos fechas, para desempatar; sin fecha, lejos */
function distancia(a: string | null, b: string | null) {
  if (!a || !b) return Number.MAX_SAFE_INTEGER;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime());
}

/**
 * Empareja los de la partida con los de la app. Devuelve, por clave de la
 * partida, la captura que le toca.
 */
export function emparejar(
  partida: PokemonTraducido[],
  capturas: CapturaParaPlan[],
  esCaido: (p: PokemonTraducido) => boolean,
): Map<string, CapturaParaPlan> {
  const parejas = new Map<string, CapturaParaPlan>();
  const usadas = new Set<string>();
  const datosDe = new Map(
    capturas.map((c) => [c.id, { mote: moteDe(c.nickname, c.species), raiz: familia(c.pokemonId, c.species), especie: plano(c.species) }]),
  );

  // Primero los que llevan mote, que es lo que más dice; luego los que no
  const conMote = partida.filter((p) => moteDe(p.mote, p.especie));
  const sinMote = partida.filter((p) => !moteDe(p.mote, p.especie));
  for (const p of [...conMote, ...sinMote]) {
    const mote = moteDe(p.mote, p.especie);
    const raiz = familia(p.pokemonId, p.especie);
    const candidatas = capturas.filter((c) => {
      if (usadas.has(c.id)) return false;
      const d = datosDe.get(c.id)!;
      if (d.mote !== mote) return false;
      // Una especie que la app no conoce (no debería en Añil) va por el nombre
      return d.raiz !== null && raiz !== null ? d.raiz === raiz : d.especie === plano(p.especie);
    });
    if (!candidatas.length) continue;
    const caido = esCaido(p);
    candidatas.sort(
      (a, b) =>
        // Antes la que está como en el juego (viva o caída)
        Number(a.muerta !== caido) - Number(b.muerta !== caido) ||
        distancia(a.creado, p.recibido) - distancia(b.creado, p.recibido),
    );
    parejas.set(p.clave, candidatas[0]);
    usadas.add(candidatas[0].id);
  }
  return parejas;
}

const nombreDeNaturaleza = (s: string | null) => (s ? (naturalezaPorSlug(s)?.n ?? s) : "—");
const nombreDeHabilidad = (s: string | null) => (s ? (habilidadPorSlug(s, true)?.n ?? s) : "—");
const nombreDeObjeto = (s: string | null) => (s ? (objetoPorSlug(s)?.nombre ?? s) : "Nada");
const nombresDeMovimientos = (l: string[]) => (l.length ? l.map((m) => movimientoPorSlug(m)?.n ?? m).join(", ") : "—");

/** Qué cambia de una captura que ya estaba */
function ponerAlDia(c: CapturaParaPlan, p: PokemonTraducido) {
  const cambios: Cambio[] = [];
  const datos: DatosNuevos = {};
  let evoluciona: { de: string; a: string } | null = null;

  const ahora = queEs(c.pokemonId, c.species);
  const mismaEspecieSinFormaClara =
    !p.formaExacta && ahora !== null && ahora.especie.dex === queEs(p.pokemonId, p.especie)?.especie.dex;
  if ((!ahora || ahora.pokemonId !== p.pokemonId) && !mismaEspecieSinFormaClara) {
    datos.pokemonId = p.pokemonId;
    datos.species = p.especie;
    const delJuego = queEs(p.pokemonId, p.especie);
    const rotulo = (q: ReturnType<typeof queEs>, especie: string) =>
      q && q.pokemonId !== q.especie.dex ? `${q.especie.name} (${q.etiqueta})` : especie;
    const antes = rotulo(ahora, c.species);
    const despues = rotulo(delJuego, p.especie);
    if (plano(c.species) !== plano(p.especie)) {
      evoluciona = { de: c.species, a: p.especie };
      cambios.push({ campo: "Evoluciona", antes, despues });
    } else {
      cambios.push({ campo: "Forma", antes, despues });
    }
  }
  // Shiny solo a favor: en la app puede serlo por un premio que el juego no sabe
  if (p.shiny && !c.shiny) {
    datos.shiny = true;
    cambios.push({ campo: "Shiny", antes: "No", despues: "Sí" });
  }
  if (p.naturaleza && p.naturaleza !== c.naturaleza) {
    datos.naturaleza = p.naturaleza;
    cambios.push({ campo: "Naturaleza", antes: nombreDeNaturaleza(c.naturaleza), despues: nombreDeNaturaleza(p.naturaleza) });
  }
  // Una habilidad que no se ha podido saber no borra la que hubiera
  if (p.habilidad && p.habilidad !== c.habilidad) {
    datos.habilidad = p.habilidad;
    cambios.push({ campo: "Habilidad", antes: nombreDeHabilidad(c.habilidad), despues: nombreDeHabilidad(p.habilidad) });
  }
  // El objeto sí: si en el juego no lleva nada, es que se lo han quitado
  const objetoIlegible = p.avisos.some((a) => a.startsWith("el objeto"));
  if (!objetoIlegible && p.objeto !== c.objeto) {
    datos.objeto = p.objeto;
    cambios.push({ campo: "Objeto", antes: nombreDeObjeto(c.objeto), despues: nombreDeObjeto(p.objeto) });
  }
  if (p.movimientos.length && p.movimientos.join() !== c.movimientos.join()) {
    datos.movimientos = p.movimientos;
    cambios.push({ campo: "Movimientos", antes: nombresDeMovimientos(c.movimientos), despues: nombresDeMovimientos(p.movimientos) });
  }
  return { cambios, datos, evoluciona };
}

export function planear(entrada: {
  partida: PokemonTraducido[];
  capturas: CapturaParaPlan[];
  bajasSueltas: BajaSuelta[];
  zonas: ZonaParaPlan[];
  /** La caja de los caídos (desde 0), o null si no hay */
  cajaDeCaidos: number | null;
}): Plan {
  const { partida, capturas, bajasSueltas, zonas, cajaDeCaidos } = entrada;
  const esCaido = (p: PokemonTraducido) => p.donde.lugar === "caja" && p.donde.caja === cajaDeCaidos;
  const parejas = emparejar(partida, capturas, esCaido);

  /**
   * Las bajas apuntadas a mano en el cementerio, sin captura: un caído que no
   * está en la app como captura puede estar ahí. Se emparejan igual, por mote y
   * familia, para no apuntarlo dos veces ni devolverlo a la caja.
   */
  const bajasUsadas = new Set<string>();
  const enElCementerio = (p: PokemonTraducido) => {
    const mote = moteDe(p.mote, p.especie);
    const raiz = familia(p.pokemonId, p.especie);
    const baja = bajasSueltas.find((b) => {
      if (bajasUsadas.has(b.id) || moteDe(b.nickname, b.species) !== mote) return false;
      const suya = familia(null, b.species);
      return suya !== null && raiz !== null ? suya === raiz : plano(b.species) === plano(p.especie);
    });
    if (baja) bajasUsadas.add(baja.id);
    return Boolean(baja);
  };

  const pasos: PasoDelPlan[] = [];
  let iguales = 0;
  let yaCaidos = 0;
  const caidosEnLaApp: string[] = [];
  for (const p of partida) {
    const c = parejas.get(p.clave);
    const nombre = p.mote || p.especie;
    if (esCaido(p)) {
      if (c ? c.muerta : enElCementerio(p)) yaCaidos++;
      else if (c) {
        pasos.push({
          tipo: "muere",
          clave: p.clave,
          captureId: c.id,
          nombre: nombreDe(c),
          pokemonId: queEs(c.pokemonId, c.species)?.pokemonId ?? null,
          shiny: c.shiny,
        });
      }
      else pasos.push({ tipo: "baja", clave: p.clave, nombre, pokemon: p });
      continue;
    }
    if (c) {
      if (c.muerta) {
        caidosEnLaApp.push(nombreDe(c));
        continue;
      }
      const { cambios, datos, evoluciona } = ponerAlDia(c, p);
      if (cambios.length) {
        pasos.push({
          tipo: "actualizar",
          clave: p.clave,
          captureId: c.id,
          nombre: nombreDe(c),
          pokemonId: datos.pokemonId ?? queEs(c.pokemonId, c.species)?.pokemonId ?? p.pokemonId,
          shiny: datos.shiny ?? c.shiny,
          cambios,
          datos,
          evoluciona,
        });
      }
      else iguales++;
      continue;
    }
    if (enElCementerio(p)) {
      caidosEnLaApp.push(nombre);
      continue;
    }
    const donde = zonaDelSitio(p.sitio, zonas);
    pasos.push({
      tipo: "nueva",
      clave: p.clave,
      nombre,
      pokemon: p,
      zoneId: donde?.zona.id ?? null,
      zona: donde?.zona.label ?? null,
      nota: donde?.nota ?? null,
    });
  }

  const emparejadas = new Set([...parejas.values()].map((c) => c.id));
  return {
    pasos,
    iguales,
    yaCaidos,
    caidosEnLaApp,
    soloEnLaApp: capturas.filter((c) => !c.muerta && !emparejadas.has(c.id)).map(nombreDe),
  };
}

/**
 * La fecha de captura que se apunta, sacada del juego. Un reloj de consola mal
 * puesto o una partida tocada traen fechas imposibles: una que no existe (que
 * al guardarla rompería la lectura a medias) o del futuro se queda en nada —se
 * apunta con la de hoy—, y una de antes de que existiera el locke en la app se
 * queda en el día en que se creó, para que nada salga capturado antes de
 * empezar.
 */
export function fechaDeCaptura(iso: string | null, desde: Date): string | null {
  if (!iso) return null;
  const cuando = Date.parse(iso);
  if (!Number.isFinite(cuando) || cuando > Date.now()) return null;
  return new Date(Math.max(cuando, desde.getTime())).toISOString();
}
