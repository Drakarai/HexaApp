"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { Icono } from "@/components/icono";
import { FORMA_DE_LA_CAJA, FondoDeCajaImagen } from "@/components/fondo-de-caja";
import {
  FONDOS_DE_CAJA,
  fondoDeCaja,
  LARGO_DEL_NOMBRE_DE_CAJA,
  nombreDeCaja,
  type FondoDeCaja,
} from "@/lib/fondos-de-caja";
import { cx } from "@/lib/utils";
import { sonarBip } from "@/lib/gritos";
import { ExportarEquipo } from "./exportar-showdown";
import { HUECOS_POR_CAJA, colocar, companerasDe, mover, type Lugar } from "@/lib/equipo-y-caja";
import type { PokemonDelTablero, TableroDeJugador } from "@/lib/soul-link";
import {
  cambiarFondoDeCajaAction,
  nombrarCajaAction,
  deshacerEnCajaAction,
  moverPokemonAction,
} from "@/app/actions/equipo-y-caja";
import { directaConCola, sinConexion } from "@/lib/acciones-sin-conexion";
import type { ZonaParaElegir } from "@/lib/mapas";
import { Fantasma, useArrastre } from "./arrastre";
import { APAGADO, Casilla, FlechaDeCaja, Sprite } from "./casilla";
import { Ficha, vinculables } from "./ficha-del-tablero";
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

export type Aviso = { tipo: "ok" | "error"; texto: string };

export function EquiposYCajas({
  tableros,
  numeros,
  niveles = {},
  esSoulLink,
  zonas = [],
  abrirDeEntrada = null,
}: {
  tableros: TableroDeJugador[];
  /** El número de cada vínculo, por su clave */
  numeros: Record<string, number>;
  /** El level cap que le toca a cada jugador, para exportar a Showdown a ese nivel */
  niveles?: Record<string, number | null>;
  esSoulLink: boolean;
  /** Las zonas del mapa, para decir dónde cayó uno al darlo por muerto */
  zonas?: ZonaParaElegir[];
  /** La ficha que se abre al llegar (`/equipo?ver=…`, desde el buscador rápido) */
  abrirDeEntrada?: string | null;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  /**
   * La de `?ver=` se abre **ya en el navegador**, no de entrada: la ficha va en
   * un portal sobre `document.body`, que en el servidor no existe, y pintarla
   * allí rompía la carga de la página (React tenía que rehacerla entera).
   */
  useEffect(() => {
    if (abrirDeEntrada) setAbierto(abrirDeEntrada);
  }, [abrirDeEntrada]);
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
            nivel={niveles[tablero.participantId] ?? null}
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
          nivel={niveles[pokemonAbierto.participantId] ?? null}
          esSoulLink={esSoulLink}
          zonas={zonas}
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

// ---------------------------------------------------------------------------
// El tablero de un jugador
// ---------------------------------------------------------------------------

export type Destino = { lugar: Lugar; hueco: number };

function Tablero({
  tablero,
  numeros,
  nivel,
  resaltados,
  onAbrir,
  onAviso,
}: {
  tablero: TableroDeJugador;
  numeros: Record<string, number>;
  nivel: number | null;
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
  /** Hacia dónde se pasó de caja la última vez: la nueva entra por ese lado */
  const [direccion, setDireccion] = useState<1 | -1 | 0>(0);
  function pasarCaja(paso: 1 | -1) {
    setDireccion(paso);
    setPagina((actual) => (Math.min(actual, cajas - 1) + paso + cajas) % cajas);
  }
  /** Dónde empezó el dedo, para saber si al levantarlo fue un deslizamiento */
  const toque = useRef<{ x: number; y: number; t: number } | null>(null);
  // Bip al pasar de caja; solo la cambia quien juega, así que basta con mirar
  // si `pagina` es otra (comparando, y no saltándose el primer efecto, que en
  // desarrollo React lo ejecuta dos veces)
  const paginaAnterior = useRef(pagina);
  useEffect(() => {
    if (paginaAnterior.current === pagina) return;
    paginaAnterior.current = pagina;
    sonarBip("caja");
  }, [pagina]);
  const [pendiente, empezar] = useTransition();

  /**
   * El fondo de la caja que se ve. Al elegir uno se pone al momento, sin
   * esperar al servidor; lo de aquí se tira cuando llegan los datos nuevos.
   */
  const [fondosElegidos, setFondosElegidos] = useState<Record<number, FondoDeCaja>>({});
  useEffect(() => setFondosElegidos({}), [tablero]);
  // De qué caja se está eligiendo el fondo: en lo ancho se ven dos
  const [eligiendoFondo, setEligiendoFondo] = useState<number | null>(null);
  const fondoDe = (caja: number) => fondosElegidos[caja] ?? fondoDeCaja(tablero.fondos, caja);
  /** Igual con los nombres: el puesto se ve al momento */
  const [nombresElegidos, setNombresElegidos] = useState<Record<number, string>>({});
  useEffect(() => setNombresElegidos({}), [tablero]);
  const [nombrando, setNombrando] = useState<number | null>(null);
  const nombreDe = (caja: number) =>
    nombresElegidos[caja] !== undefined
      ? nombresElegidos[caja] || `Caja ${caja + 1}`
      : nombreDeCaja(tablero.nombres, caja);

  function nombrar(caja: number, nombre: string) {
    setNombrando(null);
    if (nombre.trim() === nombreDe(caja)) return;
    setNombresElegidos((antes) => ({ ...antes, [caja]: nombre.trim() }));
    empezar(async () => {
      const respuesta = await sinConexion(() =>
        nombrarCajaAction({ participantId: tablero.participantId, caja, nombre }),
      );
      if (respuesta.error) {
        setNombresElegidos((antes) => {
          const sin = { ...antes };
          delete sin[caja];
          return sin;
        });
        onAviso({ tipo: "error", texto: respuesta.error });
      }
    });
  }
  // La que se ve al lado en una pantalla ancha: la siguiente, y de la última, la primera
  const segunda = (paginaVisible + 1) % cajas;

  function elegirFondo(caja: number, nuevo: FondoDeCaja) {
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
    onCambiarPagina: (paso) => pasarCaja(paso > 0 ? 1 : -1),
  });

  const enEquipo = equipo.filter(Boolean).length;
  const enCaja = caja.filter(Boolean).length;
  const deLaCaja = (n: number) => caja.slice(n * HUECOS_POR_CAJA, (n + 1) * HUECOS_POR_CAJA);
  const cogido = arrastre.fantasma?.id;
  const indiceCogido = cogido ? caja.findIndex((p) => p?.id === cogido) : -1;
  const cajaDelCogido = indiceCogido >= 0 ? Math.floor(indiceCogido / HUECOS_POR_CAJA) : null;

  /**
   * Las cajas que se pintan: la que se ve, la de al lado (solo en lo ancho) y
   * **la del pokémon que se lleva cogido**, aunque ya no se vea. Con el dedo,
   * los eventos van al elemento donde empezó el toque: si su casilla se quitaba
   * de la página al pasar de caja, dejaban de llegar y no había forma de
   * soltarlo. Así se queda montada, escondida.
   *
   * Van **en el orden de su número** y se colocan con `order` de CSS: si React
   * las recolocara al pasar de caja, movería la casilla cogida por la página y
   * se perderían igual los eventos.
   */
  const columnas = [...new Set([paginaVisible, segunda, ...(cajaDelCogido !== null ? [cajaDelCogido] : [])])]
    .sort((a, b) => a - b)
    .map((n) => ({
      n,
      orden: n === paginaVisible ? 1 : n === segunda ? 2 : 3,
      className: n === paginaVisible ? undefined : n === segunda ? "hidden xl:flex" : "hidden",
    }));

  /** Una caja con su cabecera (número y fondo) y sus 30 huecos */
  function columnaDeCaja(n: number, orden: number, className?: string) {
    const fondo = fondoDe(n);
    return (
      <div
        key={n}
        style={{ order: orden }}
        className={cx(
          "flex min-w-0 flex-1 flex-col",
          className,
          // La que entra lo hace por el lado al que se ha ido, como en el PC de los juegos
          orden === 1 && direccion === 1 && "motion-safe:animate-[caja-desde-la-derecha_220ms_ease-out]",
          orden === 1 && direccion === -1 && "motion-safe:animate-[caja-desde-la-izquierda_220ms_ease-out]",
        )}
      >
        <div className="mb-1.5 flex items-center gap-2 px-1">
          {nombrando === n ? (
            <input
              autoFocus
              className="input h-7 min-w-0 flex-1 px-2 py-0 text-xs"
              defaultValue={nombreDe(n)}
              maxLength={LARGO_DEL_NOMBRE_DE_CAJA}
              aria-label={`Nombre de la caja ${n + 1}`}
              placeholder={`Caja ${n + 1}`}
              onFocus={(evento) => evento.currentTarget.select()}
              onBlur={(evento) => nombrar(n, evento.currentTarget.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") evento.currentTarget.blur();
                if (evento.key === "Escape") setNombrando(null);
              }}
            />
          ) : (
            <button
              type="button"
              disabled={!tablero.editable}
              onClick={() => setNombrando(n)}
              title={tablero.editable ? "Ponerle nombre a esta caja" : undefined}
              className="group/nombre flex min-w-0 items-baseline gap-1.5 rounded text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 enabled:hover:text-slate-300"
            >
              <span className="truncate">{nombreDe(n)}</span>
              <span className="shrink-0 font-normal normal-case tracking-normal text-slate-500">
                {n + 1} de {cajas}
              </span>
              {tablero.editable ? (
                <span aria-hidden className="shrink-0 text-slate-600 opacity-60 group-hover/nombre:opacity-100">
                  ✎
                </span>
              ) : null}
            </button>
          )}
          {tablero.editable ? (
            <button
              type="button"
              className={cx("btn-ghost btn-sm ml-auto px-2", eligiendoFondo === n && "border-brand-400/50")}
              onClick={() => setEligiendoFondo((abierta) => (abierta === n ? null : n))}
              aria-expanded={eligiendoFondo === n}
              title="El fondo de esta caja"
            >
              <Icono emoji="🎨" />
              <span className="text-xs">Fondo</span>
            </button>
          ) : null}
        </div>
        {eligiendoFondo === n && tablero.editable ? (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {FONDOS_DE_CAJA.map((opcion) => (
              <button
                key={opcion.slug}
                type="button"
                disabled={pendiente}
                onClick={() => elegirFondo(n, opcion.slug)}
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
        <div
          className={cx(
            "relative isolate min-w-0 overflow-hidden rounded-md",
            FORMA_DE_LA_CAJA,
            fondo === "liso" ? "rounded-xl border border-white/5 bg-ink-950/40" : "bg-ink-950",
          )}
        >
          {/**
           * El fondo, apagado: a todo color se comía a los pokémon (un Magneton
           * sobre el de Reshiram, un Clefairy sobre el de Ho-Oh). Transparente
           * sobre el negro de debajo, se oscurece sin perder el dibujo.
           */}
          <FondoDeCajaImagen fondo={fondo} className={cx("-z-10", APAGADO)} />
          {/* Dentro del marco de la imagen: seis columnas y cinco filas */}
          <div className="grid h-full grid-cols-6 grid-rows-5 gap-x-[2%] gap-y-[2.5%] p-[4%]">
            {deLaCaja(n).map((pokemon, i) => {
              const hueco = n * HUECOS_POR_CAJA + i;
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
            })}
          </div>
        </div>
      </div>
    );
  }

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

      <div className="mb-1.5 flex min-h-8 items-center gap-2">
        <p className="rotulo">Equipo</p>
        {equipo.some(Boolean) ? (
          <ExportarEquipo equipo={equipo.filter((p): p is PokemonDelTablero => Boolean(p))} nivel={nivel} />
        ) : null}
      </div>
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

      {/**
       * La caja, con la forma de sus fondos (los de los juegos) y una flecha a
       * cada lado, altas y anchas: se tocan para cambiar de caja y, con un
       * pokémon cogido, **quedarse encima pasa de caja** para soltarlo en otra.
       * En el móvil gana ancho metiéndose en el margen de la tarjeta, que a 260
       * píxeles los pokémon se quedaban en nada.
       *
       * **En una pantalla ancha se ven dos cajas**, la de ahora y la siguiente,
       * y se arrastra de una a otra sin pasar de caja. Va solo con CSS (la
       * segunda está siempre y se esconde en lo estrecho) para que al cargar
       * no salte de una a dos.
       */}
      {/**
       * **Deslizando con el dedo también se pasa de caja**, como en el PC de los
       * juegos. Cuenta si el gesto es sobre todo de lado, de más de 50 píxeles y
       * rápido (menos de 0,7 s): así no se confunde con bajar por la página ni con
       * coger un pokémon, que es dejar el dedo quieto. Mientras se arrastra uno, o
       * justo al soltarlo, no cuenta: ese gesto ya es del arrastre.
       *
       * `touch-pan-y` le dice al navegador que aquí **los gestos de lado son de
       * la app** y él solo sube y baja la página: sin eso, deslizar hacia la
       * derecha lo tomaba Chrome por «atrás» y se iba de la pantalla.
       */}
      <div
        className="-mx-4 mt-4 flex max-w-lg touch-pan-y items-stretch gap-1 sm:mx-0 xl:max-w-none"
        onTouchStart={(evento) => {
          const dedo = evento.touches[0];
          toque.current = evento.touches.length === 1 ? { x: dedo.clientX, y: dedo.clientY, t: Date.now() } : null;
        }}
        onTouchEnd={(evento) => {
          const inicio = toque.current;
          toque.current = null;
          if (!inicio || cajas < 2 || arrastre.fantasma || arrastre.acabaDeSoltar()) return;
          const dedo = evento.changedTouches[0];
          const dx = dedo.clientX - inicio.x;
          const dy = dedo.clientY - inicio.y;
          if (Date.now() - inicio.t > 700 || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          pasarCaja(dx < 0 ? 1 : -1);
        }}
      >
        <FlechaDeCaja
          paso={-1}
          dueno={tablero.participantId}
          encendida={arrastre.flecha === -1}
          onClick={() => pasarCaja(-1)}
        />
        {columnas.map((c) => columnaDeCaja(c.n, c.orden, c.className))}
        <FlechaDeCaja
          paso={1}
          dueno={tablero.participantId}
          encendida={arrastre.flecha === 1}
          onClick={() => pasarCaja(1)}
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
          x={arrastre.posicion().x}
          y={arrastre.posicion().y}
          nodo={arrastre.nodoFantasma}
        />
      ) : null}
    </section>
  );
}
