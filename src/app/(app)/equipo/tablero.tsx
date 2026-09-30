"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui";
import { Icono } from "@/components/icono";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import { Hoja } from "@/components/hoja";
import { FORMA_DE_LA_CAJA, FondoDeCajaImagen } from "@/components/fondo-de-caja";
import { FONDOS_DE_CAJA, fondoDeCaja, type FondoDeCaja } from "@/lib/fondos-de-caja";
import { AnimacionDeEvolucion, type ResultadoDeEvolucion } from "./evolucion";
import { cx } from "@/lib/utils";
import {
  HUECOS_POR_CAJA,
  colocar,
  companerasDe,
  mover,
  sePuedenVincular,
  type Lugar,
} from "@/lib/equipo-y-caja";
import type { PokemonDelTablero, TableroDeJugador } from "@/lib/soul-link";
import type { OpcionDeEvolucion } from "@/lib/evoluciones";
import {
  borrarDeLaCajaAction,
  cambiarFondoDeCajaAction,
  cambiarMoteAction,
  darPorMuertoAction,
  desvincularAction,
  deshacerEnCajaAction,
  evolucionarAction,
  moverPokemonAction,
  vincularAction,
} from "@/app/actions/equipo-y-caja";
import { directaConCola, sinConexion } from "@/lib/acciones-sin-conexion";

/**
 * El equipo y la caja de cada uno, a la vista de todos.
 *
 * Los pokémon **se arrastran**: con el ratón, en cuanto se mueve; con el dedo,
 * dejándolo pulsado un momento (si no, no se podría hacer scroll por la
 * página). La casilla se mueve al soltar, sin esperar al servidor, y si el
 * servidor dice que no, vuelve a su sitio. Un toque sin arrastrar abre la
 * ficha, que tiene también "Al equipo" y "A la caja" por si arrastrar no va.
 *
 * Las parejas de un vínculo llevan **el mismo número** en la esquina, así se
 * ve de un vistazo con quién va cada uno sin abrir nada.
 */

type Aviso = { tipo: "ok" | "error"; texto: string };

export function EquiposYCajas({
  tableros,
  numeros,
  esSoulLink,
}: {
  tableros: TableroDeJugador[];
  /** El número de cada vínculo, por su clave */
  numeros: Record<string, number>;
  esSoulLink: boolean;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), 4500);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  const todos = useMemo(
    () => tableros.flatMap((t) => [...t.vivos, ...t.caidos]),
    [tableros],
  );
  const pokemonAbierto = todos.find((p) => p.id === abierto) ?? null;
  // Las parejas del que está abierto se resaltan en los otros tableros
  const resaltados = useMemo(() => {
    if (!pokemonAbierto) return new Set<string>();
    return new Set(companerasDe(vinculables(todos), pokemonAbierto.id).map((c) => c.id));
  }, [pokemonAbierto, todos]);

  return (
    <>
      <div className="space-y-5">
        {tableros.map((tablero) => (
          <Tablero
            key={tablero.participantId}
            tablero={tablero}
            numeros={numeros}
            resaltados={resaltados}
            onAbrir={setAbierto}
            onAviso={setAviso}
          />
        ))}
      </div>

      {pokemonAbierto ? (
        <Ficha
          pokemon={pokemonAbierto}
          tableros={tableros}
          todos={todos}
          numero={pokemonAbierto.vinculo ? numeros[pokemonAbierto.vinculo] : undefined}
          esSoulLink={esSoulLink}
          onCerrar={() => setAbierto(null)}
          onAviso={setAviso}
        />
      ) : null}

      {aviso ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[75] flex justify-center px-4 lg:bottom-8">
          <p
            role="status"
            className={cx(
              "pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm shadow-2xl backdrop-blur",
              aviso.tipo === "error"
                ? "border-red-500/40 bg-red-950/90 text-red-100"
                : "border-emerald-500/40 bg-emerald-950/90 text-emerald-100",
            )}
          >
            {aviso.texto}
          </p>
        </div>
      ) : null}
    </>
  );
}

/** Lo que piden las cuentas de vínculos: el tablero no sabe de zonas */
function vinculables(pokemon: PokemonDelTablero[]) {
  return pokemon.map((p) => ({ ...p, zoneId: null }));
}

// ---------------------------------------------------------------------------
// El tablero de un jugador
// ---------------------------------------------------------------------------

type Destino = { lugar: Lugar; hueco: number };

function Tablero({
  tablero,
  numeros,
  resaltados,
  onAbrir,
  onAviso,
}: {
  tablero: TableroDeJugador;
  numeros: Record<string, number>;
  resaltados: Set<string>;
  onAbrir: (id: string) => void;
  onAviso: (aviso: Aviso) => void;
}) {
  /**
   * Dónde está cada uno **mientras el servidor contesta**: el arrastre mueve
   * aquí al momento. Cuando llegan los datos nuevos del servidor se tira, que
   * ya vienen con el cambio hecho.
   */
  const [movidos, setMovidos] = useState<Map<string, Destino> | null>(null);
  useEffect(() => setMovidos(null), [tablero]);

  const vivos = useMemo(
    () =>
      tablero.vivos.map((p) => {
        const movido = movidos?.get(p.id);
        return movido ? { ...p, ...movido } : p;
      }),
    [tablero.vivos, movidos],
  );
  const { equipo, caja } = useMemo(() => colocar(vivos), [vivos]);
  const cajas = caja.length / HUECOS_POR_CAJA;
  const [pagina, setPagina] = useState(0);
  const paginaVisible = Math.min(pagina, cajas - 1);
  const [pendiente, empezar] = useTransition();

  /**
   * El fondo de la caja que se ve. Al elegir uno se pone al momento, sin
   * esperar al servidor; lo de aquí se tira cuando llegan los datos nuevos.
   */
  const [fondosElegidos, setFondosElegidos] = useState<Record<number, FondoDeCaja>>({});
  useEffect(() => setFondosElegidos({}), [tablero]);
  const [eligiendoFondo, setEligiendoFondo] = useState(false);
  const fondo = fondosElegidos[paginaVisible] ?? fondoDeCaja(tablero.fondos, paginaVisible);

  function elegirFondo(nuevo: FondoDeCaja) {
    const caja = paginaVisible;
    setFondosElegidos((antes) => ({ ...antes, [caja]: nuevo }));
    empezar(async () => {
      const respuesta = await sinConexion(() =>
        cambiarFondoDeCajaAction({ participantId: tablero.participantId, caja, fondo: nuevo }),
      );
      if (respuesta.error) {
        setFondosElegidos((antes) => {
          const sin = { ...antes };
          delete sin[caja];
          return sin;
        });
        onAviso({ tipo: "error", texto: respuesta.error });
      }
    });
  }

  function soltar(id: string, destino: Destino) {
    const resultado = mover(vivos, id, destino);
    if ("error" in resultado) {
      onAviso({ tipo: "error", texto: resultado.error });
      return;
    }
    setMovidos(new Map(resultado.posiciones.map((p) => [p.id, { lugar: p.lugar, hueco: p.hueco }])));
    const quien = vivos.find((p) => p.id === id);
    empezar(async () => {
      // Sin línea se queda en la cola y la casilla, movida, hasta que suba
      const respuesta = await directaConCola(
        () => moverPokemonAction({ captureId: id, ...destino }),
        "movimiento",
        { captureId: id, lugar: destino.lugar, hueco: String(destino.hueco) },
        `${quien?.nickname ?? quien?.species ?? "Pokémon"} → ${destino.lugar === "equipo" ? "equipo" : "caja"}`,
      );
      if ("enCola" in respuesta) onAviso({ tipo: "ok", texto: respuesta.aviso });
      else if (respuesta.error) {
        setMovidos(null);
        onAviso({ tipo: "error", texto: respuesta.error });
      }
    });
  }

  const arrastre = useArrastre({
    habilitado: tablero.editable,
    participantId: tablero.participantId,
    onSoltar: soltar,
    // Como en los juegos, de la última se pasa a la primera
    onCambiarPagina: (paso) => setPagina((actual) => (Math.min(actual, cajas - 1) + paso + cajas) % cajas),
  });

  const enEquipo = equipo.filter(Boolean).length;
  const enCaja = caja.filter(Boolean).length;
  const visibles = caja.slice(paginaVisible * HUECOS_POR_CAJA, (paginaVisible + 1) * HUECOS_POR_CAJA);
  const cogido = arrastre.fantasma?.id;
  const cogidoDeOtraCaja =
    cogido && !visibles.some((p) => p?.id === cogido)
      ? (caja.find((p) => p?.id === cogido) ?? null)
      : null;

  return (
    <section ref={arrastre.contenedor} className="card select-none">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Avatar
          name={tablero.displayName}
          color={tablero.color}
          image={tablero.avatarImage}
          size={30}
          participantId={tablero.participantId}
        />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-white">
            {tablero.displayName}
            {tablero.fuera ? <span className="ml-2 chip text-[10px]">Fuera</span> : null}
          </h2>
          <p className="text-xs text-slate-500">
            {enEquipo} en el equipo · {enCaja} en la caja
            {tablero.caidos.length ? ` · ${tablero.caidos.length} caídos` : ""}
          </p>
        </div>
        {tablero.deshacer ? (
          <button
            type="button"
            className="btn-ghost btn-sm ml-auto max-w-[55%]"
            disabled={pendiente}
            title={`Deshacer: ${tablero.deshacer}`}
            onClick={() =>
              empezar(async () => {
                const respuesta = await sinConexion(() =>
                  deshacerEnCajaAction({ participantId: tablero.participantId }),
                );
                onAviso(
                  respuesta.error
                    ? { tipo: "error", texto: respuesta.error }
                    : { tipo: "ok", texto: respuesta.aviso ?? "Deshecho." },
                );
              })
            }
          >
            <Icono emoji="↩️" />
            <span className="truncate">Deshacer</span>
          </button>
        ) : null}
      </div>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Equipo
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {equipo.map((pokemon, hueco) => (
          <Casilla
            key={pokemon?.id ?? `equipo-${hueco}`}
            grande
            pokemon={pokemon}
            destino={`${tablero.participantId}|equipo|${hueco}`}
            numero={pokemon?.vinculo ? numeros[pokemon.vinculo] : undefined}
            resaltado={Boolean(pokemon && resaltados.has(pokemon.id))}
            arrastre={arrastre}
            onAbrir={onAbrir}
          />
        ))}
      </div>

      <div className="mb-1.5 mt-4 flex max-w-lg items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Caja {paginaVisible + 1} <span className="text-slate-600">de {cajas}</span>
        </p>
        {tablero.editable ? (
          <button
            type="button"
            className={cx("btn-ghost btn-sm ml-auto px-2", eligiendoFondo && "border-brand-400/50")}
            onClick={() => setEligiendoFondo((abierto) => !abierto)}
            aria-expanded={eligiendoFondo}
            title="El fondo de esta caja"
          >
            <Icono emoji="🎨" />
            <span className="text-xs">Fondo</span>
          </button>
        ) : null}
      </div>
      {eligiendoFondo && tablero.editable ? (
        <div className="mb-2 flex max-w-lg gap-1.5 overflow-x-auto pb-1">
          {FONDOS_DE_CAJA.map((opcion) => (
            <button
              key={opcion.slug}
              type="button"
              disabled={pendiente}
              onClick={() => elegirFondo(opcion.slug)}
              className="w-[60px] shrink-0 text-center"
              aria-pressed={opcion.slug === fondo}
              title={opcion.nombre}
            >
              <span
                className={cx(
                  "relative block w-[60px] overflow-hidden rounded-md border bg-ink-950/60",
                  FORMA_DE_LA_CAJA,
                  opcion.slug === fondo
                    ? "border-brand-400 ring-2 ring-brand-400/40"
                    : "border-white/10",
                )}
              >
                <FondoDeCajaImagen fondo={opcion.slug} />
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                {opcion.nombre}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {/**
       * La caja, con la forma de sus fondos (los de los juegos) y una flecha a
       * cada lado, altas y anchas: se tocan para cambiar de caja y, con un
       * pokémon cogido, **quedarse encima pasa de caja** para soltarlo en otra.
       * En el móvil gana ancho metiéndose en el margen de la tarjeta, que a 260
       * píxeles los pokémon se quedaban en nada.
       */}
      <div className="-mx-4 flex max-w-lg items-stretch gap-1 sm:mx-0">
        <FlechaDeCaja
          paso={-1}
          dueno={tablero.participantId}
          encendida={arrastre.flecha === -1}
          onClick={() => setPagina((paginaVisible - 1 + cajas) % cajas)}
        />
        <div
          className={cx(
            "relative isolate min-w-0 flex-1 overflow-hidden rounded-md",
            FORMA_DE_LA_CAJA,
            fondo === "liso" && "rounded-xl border border-white/5 bg-ink-950/40",
          )}
        >
          <FondoDeCajaImagen fondo={fondo} className="-z-10" />
          {/* Dentro del marco de la imagen: seis columnas y cinco filas */}
          <div className="grid h-full grid-cols-6 grid-rows-5 gap-px p-[3%]">
            {[
              ...visibles.map((pokemon, i) => {
                const hueco = paginaVisible * HUECOS_POR_CAJA + i;
                return (
                  <Casilla
                    key={pokemon?.id ?? `caja-${hueco}`}
                    pokemon={pokemon}
                    destino={`${tablero.participantId}|caja|${hueco}`}
                    numero={pokemon?.vinculo ? numeros[pokemon.vinculo] : undefined}
                    resaltado={Boolean(pokemon && resaltados.has(pokemon.id))}
                    rejilla={fondo === "liso"}
                    arrastre={arrastre}
                    onAbrir={onAbrir}
                  />
                );
              }),
              /**
               * El que se lleva cogido de otra caja **sigue en la página**,
               * escondido y con la misma `key` (así React no lo quita, solo lo
               * mueve). Con el dedo, los eventos van al elemento donde empezó
               * el toque: si se quitaba al pasar de caja, dejaban de llegar y
               * no había forma de soltarlo.
               */
              cogidoDeOtraCaja ? (
                <Casilla
                  key={cogidoDeOtraCaja.id}
                  pokemon={cogidoDeOtraCaja}
                  destino=""
                  oculta
                  numero={undefined}
                  resaltado={false}
                  arrastre={arrastre}
                  onAbrir={onAbrir}
                />
              ) : null,
            ]}
          </div>
        </div>
        <FlechaDeCaja
          paso={1}
          dueno={tablero.participantId}
          encendida={arrastre.flecha === 1}
          onClick={() => setPagina((paginaVisible + 1) % cajas)}
        />
      </div>

      {tablero.caidos.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer list-none text-xs text-slate-500 hover:text-slate-300">
            ▸ Caídos ({tablero.caidos.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tablero.caidos.map((pokemon) => (
              <button
                key={pokemon.id}
                type="button"
                onClick={() => onAbrir(pokemon.id)}
                title={`${pokemon.nickname ?? pokemon.species} · ${pokemon.causa ?? "caído"}`}
                className={cx(
                  "flex h-11 w-11 items-center justify-center rounded-lg border border-white/5 bg-ink-850",
                  resaltados.has(pokemon.id) && "ring-2 ring-brand-400",
                )}
              >
                <Sprite pokemon={pokemon} className="h-9 w-9 opacity-50 grayscale" />
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {arrastre.fantasma ? (
        <Fantasma
          pokemon={vivos.find((p) => p.id === arrastre.fantasma!.id) ?? null}
          x={arrastre.fantasma.x}
          y={arrastre.fantasma.y}
        />
      ) : null}
    </section>
  );
}

function Casilla({
  pokemon,
  destino,
  numero,
  resaltado,
  grande = false,
  rejilla = false,
  oculta = false,
  arrastre,
  onAbrir,
}: {
  pokemon: PokemonDelTablero | null;
  destino: string;
  numero: number | undefined;
  resaltado: boolean;
  grande?: boolean;
  /** En la caja sin fondo, cada hueco se marca; sobre un fondo, no, como en los juegos */
  rejilla?: boolean;
  /** El cogido de otra caja: está, pero ni se ve ni es un sitio donde soltar */
  oculta?: boolean;
  arrastre: Arrastre;
  onAbrir: (id: string) => void;
}) {
  const levantado = pokemon && arrastre.fantasma?.id === pokemon.id;
  const debajo = arrastre.destino === destino;
  return (
    <div
      data-destino={oculta ? undefined : destino}
      className={cx(
        "relative flex flex-col items-center justify-center rounded-lg transition",
        oculta && "hidden",
        grande
          ? "min-h-[6.5rem] border border-white/10 bg-white/[0.03] p-1.5"
          : cx("min-h-0 min-w-0", rejilla && "bg-white/[0.03]"),
        !pokemon && grande && "border-dashed",
        debajo && "bg-brand-500/20 ring-2 ring-brand-400",
        resaltado && "ring-2 ring-amber-300",
      )}
    >
      {pokemon ? (
        <button
          type="button"
          {...arrastre.propsDe(pokemon.id)}
          onClick={() => {
            if (arrastre.acabaDeSoltar()) return;
            onAbrir(pokemon.id);
          }}
          title={`${pokemon.nickname ?? pokemon.species} — ${pokemon.species}`}
          style={{ WebkitTouchCallout: "none", touchAction: "manipulation" }}
          className={cx(
            "flex h-full w-full flex-col items-center justify-center rounded-md",
            arrastre.habilitado && "cursor-grab active:cursor-grabbing",
            levantado && "opacity-30",
          )}
        >
          {/* En la caja, algo más grande que su hueco: los sprites traen mucho aire alrededor */}
          <Sprite pokemon={pokemon} className={grande ? "h-14 w-14" : "h-full w-full scale-[1.3]"} />
          {grande ? (
            <>
              <span className="mt-0.5 w-full truncate text-center text-xs font-medium text-slate-100">
                {pokemon.nickname ?? pokemon.species}
              </span>
              <Tipos tipos={pokemon.tipos} enColumna />
            </>
          ) : (
            // En la caja no caben los nombres de los tipos: sus iconos, en la esquina
            <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex gap-px">
              {pokemon.tipos.map((tipo) => (
                <ChapaDeTipo
                  key={tipo.slug}
                  slug={tipo.slug}
                  nombre={tipo.nombre}
                  forma="icono"
                  alto={11}
                />
              ))}
            </span>
          )}
        </button>
      ) : null}
      {pokemon && numero ? (
        <span
          className={cx(
            "pointer-events-none absolute flex items-center justify-center rounded-full bg-brand-600 font-bold text-white shadow",
            grande ? "left-1 top-1 h-5 min-w-5 px-1 text-[10px]" : "left-0.5 top-0.5 h-3.5 min-w-3.5 px-0.5 text-[8px]",
          )}
          title="Su vínculo: la pareja lleva el mismo número"
        >
          {numero}
        </span>
      ) : null}
    </div>
  );
}

/** La flecha de un lado de la caja. `data-pagina` es lo que mira el arrastre */
function FlechaDeCaja({
  paso,
  dueno,
  encendida,
  onClick,
}: {
  paso: -1 | 1;
  dueno: string;
  /** Con un pokémon cogido encima: está a punto de pasar de caja */
  encendida: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-pagina={paso}
      data-dueno={dueno}
      onClick={onClick}
      aria-label={paso < 0 ? "Caja anterior" : "Caja siguiente"}
      className={cx(
        "flex w-7 shrink-0 items-center justify-center rounded-lg border text-xl transition sm:w-8",
        encendida
          ? "border-brand-400 bg-brand-500/25 text-white"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white active:bg-brand-500/20",
      )}
    >
      {paso < 0 ? "‹" : "›"}
    </button>
  );
}

function Sprite({ pokemon, className }: { pokemon: PokemonDelTablero; className?: string }) {
  return pokemon.imagen ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pokemon.imagen}
      alt={pokemon.species}
      draggable={false}
      className={cx("pointer-events-none object-contain", className)}
    />
  ) : (
    <span className={cx("flex items-center justify-center text-[10px] text-slate-500", className)}>
      {pokemon.species.slice(0, 3)}
    </span>
  );
}

/**
 * Los tipos con sus chapas de los juegos. En la casilla del equipo van una
 * encima de otra, que dos en fila no caben en el ancho de un móvil; en la
 * ficha, en fila y más grandes.
 */
function Tipos({
  tipos,
  alto = 12,
  enColumna = false,
}: {
  tipos: PokemonDelTablero["tipos"];
  alto?: number;
  enColumna?: boolean;
}) {
  if (!tipos.length) return null;
  return (
    <span
      className={cx(
        "mt-1 flex items-center justify-center gap-0.5",
        enColumna ? "flex-col" : "flex-wrap",
      )}
    >
      {tipos.map((tipo) => (
        <ChapaDeTipo key={tipo.slug} slug={tipo.slug} nombre={tipo.nombre} alto={alto} />
      ))}
    </span>
  );
}

function Fantasma({ pokemon, x, y }: { pokemon: PokemonDelTablero | null; x: number; y: number }) {
  if (!pokemon) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[70] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-brand-400/60 bg-ink-900/90 shadow-2xl"
      style={{ left: x, top: y }}
    >
      <Sprite pokemon={pokemon} className="h-14 w-14" />
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Arrastrar, con ratón y con el dedo
// ---------------------------------------------------------------------------

type Arrastre = ReturnType<typeof useArrastre>;

/** Cuánto hay que dejar el dedo quieto para coger un pokémon */
const PULSACION = 250;
/** Cuánto se puede mover el dedo antes de que cuente como scroll */
const HOLGURA = 8;
/** Lo que hay que quedarse encima de una flecha para pasar de caja */
const ESPERA_EN_LA_FLECHA = 550;

/**
 * Arrastrar sin librerías. Se hace con eventos de puntero, que valen igual para
 * ratón y dedo; la diferencia es cuándo empieza:
 *
 * - **Ratón**: al moverlo unos píxeles con el botón pulsado.
 * - **Dedo**: al dejarlo quieto un cuarto de segundo. Si se mueve antes, es que
 *   quería hacer scroll y no se coge nada. Una vez cogido, el scroll se bloquea
 *   con un `touchmove` que **no es pasivo y está puesto desde el principio** en
 *   el tablero: si se pusiera al empezar a arrastrar, el navegador ya habría
 *   decidido que ese dedo hace scroll y no dejaría pararlo.
 *
 * Dónde se suelta se mira con `elementFromPoint` buscando el `data-destino` de
 * la casilla de debajo; el pokémon que sigue al dedo no recibe eventos para no
 * taparlo. Solo vale soltar en el tablero del mismo dueño. Cerca de los bordes
 * de la pantalla la página se desplaza sola, y quedarse encima de las flechas
 * de la caja pasa de caja.
 */
function useArrastre({
  habilitado,
  participantId,
  onSoltar,
  onCambiarPagina,
}: {
  habilitado: boolean;
  participantId: string;
  onSoltar: (id: string, destino: Destino) => void;
  onCambiarPagina: (paso: number) => void;
}) {
  const [fantasma, setFantasma] = useState<{ id: string; x: number; y: number } | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  // La flecha de la caja que hay debajo del pokémon cogido, para encenderla
  const [flecha, setFlecha] = useState<number | null>(null);
  const contenedor = useRef<HTMLElement | null>(null);
  const estado = useRef<{
    id: string;
    x0: number;
    y0: number;
    x: number;
    y: number;
    activo: boolean;
    temporizador: number;
    pagina: { paso: number; desde: number } | null;
    desplazar: number;
  } | null>(null);
  const soltadoEn = useRef(0);
  // Las funciones de fuera cambian en cada render; los escuchas son de uno
  const avisos = useRef({ onSoltar, onCambiarPagina });
  avisos.current = { onSoltar, onCambiarPagina };

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const bloquear = (evento: TouchEvent) => {
      if (estado.current?.activo && evento.cancelable) evento.preventDefault();
    };
    nodo.addEventListener("touchmove", bloquear, { passive: false });
    return () => nodo.removeEventListener("touchmove", bloquear);
  }, []);

  function destinoEn(x: number, y: number) {
    const debajo = document.elementFromPoint(x, y);
    const casilla = debajo?.closest<HTMLElement>("[data-destino]");
    const valor = casilla?.dataset.destino ?? null;
    return valor && valor.startsWith(`${participantId}|`) ? valor : null;
  }

  function paginaEn(x: number, y: number) {
    const debajo = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-pagina]");
    return debajo && debajo.dataset.dueno === participantId ? Number(debajo.dataset.pagina) : null;
  }

  function terminar() {
    const actual = estado.current;
    if (actual) {
      window.clearTimeout(actual.temporizador);
      window.clearInterval(actual.desplazar);
    }
    estado.current = null;
    setFantasma(null);
    setDestino(null);
    setFlecha(null);
    window.removeEventListener("pointermove", alMover);
    window.removeEventListener("pointerup", alSoltar);
    window.removeEventListener("pointercancel", alCancelar);
  }

  function activar() {
    const actual = estado.current;
    if (!actual) return;
    actual.activo = true;
    navigator.vibrate?.(15);
    setFantasma({ id: actual.id, x: actual.x, y: actual.y });
    setDestino(destinoEn(actual.x, actual.y));
    // Desplazar la página cerca de los bordes y pasar de caja encima de una
    // flecha, **aunque el dedo no se mueva**: quieto no llega ningún evento
    actual.desplazar = window.setInterval(() => {
      const ahora = estado.current;
      if (!ahora?.activo) return;
      const margen = 70;
      if (ahora.y < margen) window.scrollBy(0, -14);
      else if (ahora.y > window.innerHeight - margen) window.scrollBy(0, 14);
      if (ahora.pagina && Date.now() - ahora.pagina.desde > ESPERA_EN_LA_FLECHA) {
        avisos.current.onCambiarPagina(ahora.pagina.paso);
        ahora.pagina = { paso: ahora.pagina.paso, desde: Date.now() };
      }
    }, 16);
  }

  function alMover(evento: PointerEvent) {
    const actual = estado.current;
    if (!actual) return;
    actual.x = evento.clientX;
    actual.y = evento.clientY;
    const lejos = Math.hypot(actual.x - actual.x0, actual.y - actual.y0);
    if (!actual.activo) {
      if (evento.pointerType === "mouse") {
        if (lejos > 5) activar();
      } else if (lejos > HOLGURA) {
        // El dedo se ha ido antes de tiempo: era scroll
        terminar();
      }
      return;
    }
    evento.preventDefault();
    setFantasma({ id: actual.id, x: actual.x, y: actual.y });
    setDestino(destinoEn(actual.x, actual.y));
    const paso = paginaEn(actual.x, actual.y);
    setFlecha(paso);
    if (paso === null) actual.pagina = null;
    else if (!actual.pagina || actual.pagina.paso !== paso) {
      actual.pagina = { paso, desde: Date.now() };
    }
  }

  function alSoltar(evento: PointerEvent) {
    const actual = estado.current;
    if (actual?.activo) {
      soltadoEn.current = Date.now();
      const valor = destinoEn(evento.clientX, evento.clientY);
      if (valor) {
        const [, lugar, hueco] = valor.split("|");
        avisos.current.onSoltar(actual.id, { lugar: lugar as Lugar, hueco: Number(hueco) });
      }
    }
    terminar();
  }

  function alCancelar() {
    terminar();
  }

  useEffect(() => terminar, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    contenedor,
    habilitado,
    fantasma,
    destino,
    flecha,
    /** Tras soltar llega un clic que no hay que tomar por un toque */
    acabaDeSoltar: () => Date.now() - soltadoEn.current < 400,
    propsDe: (id: string) =>
      habilitado
        ? {
            onPointerDown: (evento: React.PointerEvent) => {
              if (evento.pointerType === "mouse" && evento.button !== 0) return;
              terminar();
              estado.current = {
                id,
                x0: evento.clientX,
                y0: evento.clientY,
                x: evento.clientX,
                y: evento.clientY,
                activo: false,
                temporizador:
                  evento.pointerType === "mouse" ? 0 : window.setTimeout(activar, PULSACION),
                pagina: null,
                desplazar: 0,
              };
              window.addEventListener("pointermove", alMover, { passive: false });
              window.addEventListener("pointerup", alSoltar);
              window.addEventListener("pointercancel", alCancelar);
            },
            onContextMenu: (evento: React.MouseEvent) => evento.preventDefault(),
          }
        : {},
  };
}

// ---------------------------------------------------------------------------
// La ficha
// ---------------------------------------------------------------------------

function Ficha({
  pokemon,
  tableros,
  todos,
  numero,
  esSoulLink,
  onCerrar,
  onAviso,
}: {
  pokemon: PokemonDelTablero;
  tableros: TableroDeJugador[];
  todos: PokemonDelTablero[];
  numero: number | undefined;
  esSoulLink: boolean;
  onCerrar: () => void;
  onAviso: (aviso: Aviso) => void;
}) {
  const [pendiente, empezar] = useTransition();
  const [causa, setCausa] = useState("");
  // Evolucionar va en dos pasos: primero se elige, luego se confirma
  const [aEvolucionar, setAEvolucionar] = useState<OpcionDeEvolucion | null>(null);
  // Y justo después, su deshacer: a qué evolucionó y cómo se llama el cambio
  const [evolucionado, setEvolucionado] = useState<{ rotulo: string; deshacer: string } | null>(
    null,
  );
  // La animación de la evolución, mientras se ve
  const [animacion, setAnimacion] = useState<{
    antes: string | null;
    despues: string | null;
    nombre: string;
    nueva: string;
    resultado: ResultadoDeEvolucion;
  } | null>(null);
  const [mote, setMote] = useState(pokemon.nickname ?? "");
  const [conId, setConId] = useState("");
  const dueno = tableros.find((t) => t.participantId === pokemon.participantId)!;
  const editable = dueno.editable && !pokemon.muerta;
  // Las cajas del dueño y en cuál está este, para «Mover a la caja…»
  const cajaDelDueno = colocar(dueno.vivos).caja;
  const cajasDelDueno = cajaDelDueno.length / HUECOS_POR_CAJA;
  const posicionEnCaja = cajaDelDueno.findIndex((p) => p?.id === pokemon.id);
  const cajaActual = posicionEnCaja >= 0 ? Math.floor(posicionEnCaja / HUECOS_POR_CAJA) : null;
  const nombreDe = (id: string) => tableros.find((t) => t.participantId === id)?.displayName ?? "";

  const lista = vinculables(todos);
  const companeras = companerasDe(lista, pokemon.id);
  const companerasVivas = companeras.filter((c) => !c.muerta);
  // Con quién se podría vincular: lo decide la misma cuenta que el servidor
  const candidatas = esSoulLink
    ? todos.filter(
        (otra) => !otra.muerta && sePuedenVincular(lista, pokemon.id, otra.id) === null,
      )
    : [];

  function lanzar(
    accion: () => Promise<{ error?: string; aviso?: string }>,
    { cerrar = false, ok }: { cerrar?: boolean; ok?: string } = {},
  ) {
    empezar(async () => {
      // Lo que no se encola avisa de que hace falta línea en vez de romperse
      const respuesta = await sinConexion(accion);
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      if (respuesta.aviso || ok) onAviso({ tipo: "ok", texto: respuesta.aviso ?? ok! });
      if (cerrar) onCerrar();
    });
  }

  function evolucionar() {
    const opcion = aEvolucionar;
    if (!opcion) return;
    // La animación arranca ya, con el sprite de ahora; el nuevo llega con la respuesta
    setAnimacion({
      antes: pokemon.imagen,
      despues: null,
      nombre: pokemon.nickname ?? pokemon.species,
      nueva: opcion.rotulo,
      resultado: "esperando",
    });
    setAEvolucionar(null);
    empezar(async () => {
      const respuesta = await directaConCola(
        () => evolucionarAction({ captureId: pokemon.id, pokemonId: opcion.pokemonId }),
        "evolucion",
        { captureId: pokemon.id, pokemonId: String(opcion.pokemonId) },
        `${pokemon.nickname ?? pokemon.species} → ${opcion.rotulo}`,
      );
      if ("enCola" in respuesta) {
        setAnimacion((a) => a && { ...a, resultado: "encolada" });
        return;
      }
      if (respuesta.error) {
        setAnimacion((a) => a && { ...a, resultado: "fallida" });
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      // Lo de «¡Ha evolucionado!» ya lo dice la animación: sin aviso abajo
      setAnimacion((a) => a && { ...a, resultado: "hecha", despues: respuesta.imagen ?? null });
      if (respuesta.deshacer) setEvolucionado({ rotulo: opcion.rotulo, deshacer: respuesta.deshacer });
    });
  }

  function deshacerEvolucion() {
    if (!evolucionado) return;
    empezar(async () => {
      const respuesta = await sinConexion(() =>
        deshacerEnCajaAction({ participantId: pokemon.participantId, soloSi: evolucionado.deshacer }),
      );
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      onAviso({ tipo: "ok", texto: "Deshecho: la evolución no ha pasado." });
      setEvolucionado(null);
    });
  }

  const enEquipo = pokemon.lugar === "equipo";

  return (
    <>
      <Hoja onCerrar={onCerrar} className="p-5" etiqueta={pokemon.nickname ?? pokemon.species}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={dueno.displayName} color={dueno.color} image={dueno.avatarImage} size={28} />
            <p className="text-sm text-slate-400">{dueno.displayName}</p>
          </div>
          <button type="button" onClick={onCerrar} className="btn-ghost btn-sm" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-ink-850">
            <Sprite
              pokemon={pokemon}
              className={cx("h-20 w-20", pokemon.muerta && "opacity-50 grayscale")}
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-white">
              {pokemon.nickname ?? pokemon.species}
            </h3>
            {/* Sin mote, el nombre de arriba ya es la especie */}
            {pokemon.nickname ? <p className="muted">{pokemon.species}</p> : null}
            <div className="mt-1.5">
              <Tipos tipos={pokemon.tipos} alto={20} />
            </div>
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          {pokemon.sitio ? <Fila etiqueta="Capturado en" valor={pokemon.sitio} /> : null}
          <Fila
            etiqueta="Ahora"
            valor={pokemon.muerta ? "En el cementerio" : enEquipo ? "En el equipo" : "En la caja"}
          />
          {pokemon.muerta && pokemon.causa ? <Fila etiqueta="Causa" valor={pokemon.causa} /> : null}
        </dl>

        {esSoulLink ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Icono emoji="🔗" /> Vínculo {numero ? `#${numero}` : ""}
            </p>
            {companeras.length ? (
              <ul className="space-y-1.5">
                {companeras.map((otra) => {
                  const entera = todos.find((p) => p.id === otra.id)!;
                  return (
                    <li key={otra.id} className="flex items-center gap-2 text-sm">
                      <Sprite
                        pokemon={entera}
                        className={cx("h-8 w-8", entera.muerta && "opacity-50 grayscale")}
                      />
                      <span className="min-w-0 truncate text-slate-200">
                        {entera.nickname ?? entera.species}
                        <span className="text-slate-500"> · de {nombreDe(entera.participantId)}</span>
                      </span>
                      {entera.muerta ? <span className="chip ml-auto text-[10px]">Caído</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">
                Va suelto: nadie más ha capturado en esa ruta todavía.
              </p>
            )}

            {editable ? (
              <div className="mt-3 space-y-2">
                {candidatas.length ? (
                  <div className="flex gap-2">
                    <select
                      className="input min-w-0 flex-1"
                      value={conId}
                      onChange={(evento) => setConId(evento.target.value)}
                    >
                      <option value="">Vincular a mano con…</option>
                      {candidatas.map((otra) => (
                        <option key={otra.id} value={otra.id}>
                          {otra.nickname ?? otra.species}
                          {otra.sitio ? ` (${otra.sitio})` : ""} · de {nombreDe(otra.participantId)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={!conId || pendiente}
                      onClick={() =>
                        lanzar(() => vincularAction({ captureId: pokemon.id, conId }), {
                          ok: "Vinculados.",
                        })
                      }
                    >
                      <Icono emoji="🔗" /> Vincular
                    </button>
                  </div>
                ) : null}
                {pokemon.vinculo && companeras.length ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={pendiente}
                    onClick={() =>
                      lanzar(() => desvincularAction({ captureId: pokemon.id }), {
                        ok: "Desvinculado: ahora va suelto.",
                      })
                    }
                  >
                    <Icono emoji="⛓️‍💥" /> Desvincular
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {editable ? (
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pendiente}
                onClick={() =>
                  lanzar(
                    () =>
                      directaConCola(
                        () =>
                          moverPokemonAction({
                            captureId: pokemon.id,
                            lugar: enEquipo ? "caja" : "equipo",
                            hueco: null,
                          }),
                        "movimiento",
                        { captureId: pokemon.id, lugar: enEquipo ? "caja" : "equipo", hueco: "" },
                        `${(pokemon.nickname ?? pokemon.species)} → ${enEquipo ? "caja" : "equipo"}`,
                      ),
                    { ok: enEquipo ? "A la caja." : "Al equipo." },
                  )
                }
              >
                <Icono emoji="🔁" /> {enEquipo ? "A la caja" : "Al equipo"}
              </button>
              {/* Sin arrastrar: directo a la caja que se diga, al primer hueco libre */}
              <select
                className="input w-auto min-w-0 flex-1 py-1.5 text-sm sm:flex-none"
                value=""
                disabled={pendiente}
                aria-label="Mover a otra caja"
                onChange={(evento) => {
                  const caja = Number(evento.target.value);
                  if (evento.target.value === "" || Number.isNaN(caja)) return;
                  lanzar(
                    () =>
                      directaConCola(
                        () =>
                          moverPokemonAction({
                            captureId: pokemon.id,
                            lugar: "caja",
                            hueco: null,
                            caja,
                          }),
                        "movimiento",
                        { captureId: pokemon.id, lugar: "caja", hueco: "", caja: String(caja) },
                        `${pokemon.nickname ?? pokemon.species} → caja ${caja + 1}`,
                      ),
                    { ok: `A la caja ${caja + 1}.` },
                  );
                }}
              >
                <option value="">Mover a la caja…</option>
                {Array.from({ length: cajasDelDueno }, (_, caja) => (
                  <option key={caja} value={caja} disabled={caja === cajaActual}>
                    Caja {caja + 1}
                    {caja === cajaActual ? " (está aquí)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* En dos pasos, y con su deshacer al lado: evolucionar sin querer
                cambia la especie, el sprite y los tipos de golpe */}
            <div>
              <p className="label">Evolucionar</p>
              {evolucionado ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <span className="min-w-0 flex-1">
                    ¡Ha evolucionado en <strong>{evolucionado.rotulo}</strong>!
                  </span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={pendiente}
                    onClick={deshacerEvolucion}
                  >
                    <Icono emoji="↩️" /> Deshacer
                  </button>
                </div>
              ) : aEvolucionar ? (
                // Como en los juegos: «¡Está evolucionando!», y la B lo corta
                <div className="rounded-xl border border-brand-400/30 bg-brand-600/10 p-3">
                  <p className="text-sm font-semibold text-white">
                    ¡{pokemon.nickname ?? pokemon.species} está evolucionando!
                  </p>
                  <p className="text-xs text-slate-400">En {aEvolucionar.rotulo}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={pendiente}
                      onClick={evolucionar}
                    >
                      <Icono emoji="🧬" /> Confirmar
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={pendiente}
                      onClick={() => setAEvolucionar(null)}
                    >
                      Darle a la B
                    </button>
                  </div>
                </div>
              ) : pokemon.evoluciones.length ? (
                <div className="flex flex-wrap gap-2">
                  {pokemon.evoluciones.map((opcion) => (
                    <button
                      key={opcion.pokemonId}
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={pendiente}
                      onClick={() => setAEvolucionar(opcion)}
                    >
                      <Icono emoji="🧬" /> {opcion.rotulo}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No evoluciona más.</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="mote-ficha">
                Mote
              </label>
              <div className="flex gap-2">
                <input
                  id="mote-ficha"
                  className="input min-w-0 flex-1"
                  value={mote}
                  maxLength={40}
                  onChange={(evento) => setMote(evento.target.value)}
                  placeholder={pokemon.species}
                />
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={pendiente || mote === (pokemon.nickname ?? "")}
                  onClick={() =>
                    lanzar(() => cambiarMoteAction({ captureId: pokemon.id, mote }), {
                      ok: "Mote cambiado.",
                    })
                  }
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
              <label className="label" htmlFor="causa-ficha">
                Ha caído
              </label>
              <input
                id="causa-ficha"
                className="input"
                value={causa}
                maxLength={200}
                onChange={(evento) => setCausa(evento.target.value)}
                placeholder="Qué lo mató (opcional)"
              />
              {companerasVivas.length ? (
                <p className="mt-1.5 text-xs text-red-200/80">
                  Se lleva con él a{" "}
                  {companerasVivas
                    .map((c) => `${c.nickname ?? c.species} de ${nombreDe(c.participantId)}`)
                    .join(" y ")}
                  .
                </p>
              ) : null}
              <button
                type="button"
                className="btn-danger btn-sm mt-2"
                disabled={pendiente}
                onClick={() => {
                  const pregunta = companerasVivas.length
                    ? `¿${pokemon.nickname ?? pokemon.species} ha caído? Por el vínculo cae también ${companerasVivas
                        .map((c) => c.nickname ?? c.species)
                        .join(" y ")}. Se puede deshacer.`
                    : `¿${pokemon.nickname ?? pokemon.species} ha caído? Se puede deshacer.`;
                  if (!window.confirm(pregunta)) return;
                  lanzar(
                    () =>
                      directaConCola(
                        () => darPorMuertoAction({ captureId: pokemon.id, causa }),
                        "caida",
                        { captureId: pokemon.id, causa },
                        `${(pokemon.nickname ?? pokemon.species)}${causa ? ` · ${causa}` : ""}`,
                      ),
                    { cerrar: true },
                  );
                }}
              >
                <Icono emoji="💀" /> Dar por muerto
              </button>
            </div>

            <button
              type="button"
              className="text-xs text-slate-500 underline-offset-2 hover:text-red-300 hover:underline"
              disabled={pendiente}
              onClick={() => {
                if (
                  !window.confirm(
                    `¿Borrar ${pokemon.nickname ?? pokemon.species}? Es para lo apuntado por error y no se puede deshacer.`,
                  )
                ) {
                  return;
                }
                lanzar(() => borrarDeLaCajaAction({ captureId: pokemon.id }), {
                  cerrar: true,
                  ok: "Borrado.",
                });
              }}
            >
              Borrar (apuntado por error)
            </button>
          </div>
        ) : null}
      </Hoja>
      {animacion ? (
        <AnimacionDeEvolucion
          {...animacion}
          onCerrar={() => setAnimacion(null)}
          onDeshacer={deshacerEvolucion}
        />
      ) : null}
    </>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{etiqueta}</dt>
      <dd className="min-w-0 text-slate-200">{valor}</dd>
    </div>
  );
}
