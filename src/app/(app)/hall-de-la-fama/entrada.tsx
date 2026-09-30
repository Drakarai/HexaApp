"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/utils";
import { precargarGrito, sonarGrito } from "@/lib/gritos";
import { Icono } from "@/components/icono";
import type { HallPokemon } from "./team-editor";

/**
 * La entrada al Hall de la Fama, como en los juegos.
 *
 * Sale uno a uno cada pokémon del equipo: entra en diagonal hasta el centro,
 * grita, se lee su número de la Pokédex, su mote y su especie, y se queda en
 * la fila de abajo. Cuando han pasado todos, «¡Bienvenidos al Hall de la
 * Fama!» con el equipo entero, el nombre de quien lo llevó y confeti.
 *
 * Se salta tocando la pantalla (pasa al siguiente) o con «Saltar». Con
 * «reducir movimiento» en el móvil, va directa al final.
 */

export type EquipoDelHall = {
  participantId: string;
  displayName: string;
  color: string;
  campeon: boolean;
  equipo: HallPokemon[];
};

/** Lo que dura cada pokémon en el centro, en ms */
const POR_POKEMON = 2600;

export function EntradaAlHall({
  equipo,
  edicion,
  onCerrar,
}: {
  equipo: EquipoDelHall;
  edicion: string;
  onCerrar: () => void;
}) {
  const pokemon = equipo.equipo;
  // -1: aún no ha empezado; de 0 a n-1, el que está en el centro; n, el final
  const [paso, setPaso] = useState(-1);
  const temporizador = useRef<number | null>(null);

  // Todo cargado antes de empezar: que no entre nadie a medio dibujar
  useEffect(() => {
    pokemon.forEach((p) => {
      precargarGrito(p.pokemonId);
      const imagen = p.detailImage ?? p.image;
      if (imagen) new Image().src = imagen;
    });
    const sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const arranque = window.setTimeout(() => setPaso(sinMovimiento ? pokemon.length : 0), 450);
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(arranque);
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
    // Una vez al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada pokémon: su grito al llegar al centro, y al rato el siguiente
  useEffect(() => {
    if (paso < 0 || paso > pokemon.length) return;
    if (paso < pokemon.length) {
      // El grito cuando termina de entrar, no mientras cruza la pantalla
      const grito = window.setTimeout(() => sonarGrito(pokemon[paso].pokemonId), 650);
      temporizador.current = window.setTimeout(() => setPaso((p) => p + 1), POR_POKEMON);
      return () => {
        window.clearTimeout(grito);
        if (temporizador.current) window.clearTimeout(temporizador.current);
      };
    }
    // El final: un toque de vibración, que la fanfarria no la podemos poner
    navigator.vibrate?.([30, 60, 30]);
  }, [paso, pokemon]);

  const alFinal = paso >= pokemon.length;
  const actual = paso >= 0 && !alFinal ? pokemon[paso] : null;

  function siguiente() {
    if (alFinal || paso < 0) return;
    if (temporizador.current) window.clearTimeout(temporizador.current);
    setPaso((p) => p + 1);
  }

  return createPortal(
    <div
      role="dialog"
      aria-label={`${equipo.displayName} entra en el Hall de la Fama`}
      className="fixed inset-0 z-[80] overflow-hidden bg-[radial-gradient(ellipse_at_center,#1e293b_0%,#020617_70%)]"
      onClick={siguiente}
    >
      {/* Los rayos de luz de detrás, girando despacio */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[42%] h-[160vmax] w-[160vmax] animate-[hall-rayos_40s_linear_infinite] opacity-25 [background:repeating-conic-gradient(from_0deg,rgba(255,255,255,0.18)_0deg_6deg,transparent_6deg_18deg)] [transform:translate(-50%,-50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[42%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/20 blur-3xl"
      />

      <div className="relative flex h-full flex-col items-center px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-200/80">
          Hall de la Fama
        </p>

        {/* El centro: el que está entrando, o el rótulo del final */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {actual ? (
            <div key={actual.id} className="flex flex-col items-center">
              <div className="flex h-52 w-52 items-center justify-center animate-[hall-entra_700ms_cubic-bezier(0.2,0.8,0.3,1)_both] sm:h-64 sm:w-64">
                {actual.detailImage ?? actual.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={actual.detailImage ?? actual.image ?? ""}
                    alt=""
                    draggable={false}
                    className="h-full w-full select-none object-contain drop-shadow-[0_0_24px_rgba(253,230,138,0.35)]"
                  />
                ) : (
                  <span className="text-6xl text-slate-600">?</span>
                )}
              </div>
              {/* El cartel de debajo, como el recuadro de texto de los juegos */}
              <div className="mt-5 min-w-64 rounded-xl border-2 border-white/80 bg-slate-900/90 px-5 py-3 text-center shadow-lg animate-[hall-rotulo_400ms_ease-out_550ms_both]">
                <p className="text-[11px] font-semibold tracking-widest text-slate-400">
                  {/* Las formas (10xxx en PokéAPI) no tienen número propio de Pokédex */}
                  {actual.pokemonId && actual.pokemonId < 10000
                    ? `Nº ${String(actual.pokemonId).padStart(3, "0")}`
                    : "Nº ???"}
                </p>
                <p className="text-2xl font-black text-white">{actual.nickname ?? actual.species}</p>
                {actual.nickname ? <p className="text-sm text-slate-300">{actual.species}</p> : null}
              </div>
            </div>
          ) : alFinal ? (
            <div className="flex flex-col items-center text-center animate-[hall-rotulo_600ms_ease-out_both]">
              <p className="text-3xl font-black leading-tight text-white sm:text-4xl">
                ¡Bienvenidos al
                <br />
                <span className="text-amber-200">Hall de la Fama!</span>
              </p>
              <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: equipo.color }}
                  aria-hidden
                />
                {equipo.displayName}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {equipo.campeon ? (
                  <>
                    <Icono emoji="🏆" /> Campeón ·{" "}
                  </>
                ) : null}
                {edicion}
              </p>
              {/* Y el equipo entero, en grande, como la foto final del juego */}
              <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2">
                {pokemon.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex flex-col items-center rounded-xl border border-amber-200/30 bg-amber-200/[0.06] p-2 animate-[hall-casilla_450ms_ease-out_both]"
                    style={{ animationDelay: `${300 + i * 120}ms` }}
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-16 w-16 object-contain" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center text-slate-500">★</span>
                    )}
                    <span className="w-full truncate text-xs font-semibold text-white">
                      {p.nickname ?? p.species}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* La fila de los que ya han entrado; al final suben al centro */}
        <div className={cx("grid w-full max-w-md grid-cols-6 gap-1.5", alFinal && "invisible")}>
          {pokemon.map((p, i) => (
            <div
              key={p.id}
              className={cx(
                "flex aspect-square items-center justify-center rounded-lg border",
                i < paso || alFinal
                  ? "animate-[hall-casilla_450ms_ease-out_both] border-amber-200/40 bg-amber-200/10"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              {i < paso || alFinal ? (
                p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.nickname ?? p.species} className="h-full w-full object-contain p-0.5" />
                ) : (
                  <span className="text-xs text-slate-500">★</span>
                )
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 flex min-h-10 gap-2" onClick={(evento) => evento.stopPropagation()}>
          {alFinal ? (
            <>
              <button type="button" className="btn-primary btn-sm" onClick={onCerrar}>
                ¡Genial!
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setPaso(0)}>
                Otra vez
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPaso(pokemon.length)}>
              Saltar
            </button>
          )}
        </div>
      </div>

      {/* El confeti del final */}
      {alFinal
        ? CONFETI.map(([x, retraso, dura, color], i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute top-0 h-2.5 w-1.5 animate-[hall-confeti_linear_infinite]"
              style={{
                left: `${x}%`,
                background: color,
                animationDelay: `${retraso}ms`,
                animationDuration: `${dura}ms`,
              }}
            />
          ))
        : null}
    </div>,
    document.body,
  );
}

/** Cada trocito de confeti: x en %, retraso, lo que tarda en caer y su color */
const COLORES = ["#fde68a", "#fca5a5", "#93c5fd", "#86efac", "#f9a8d4", "#ffffff"];
const CONFETI: [number, number, number, string][] = Array.from({ length: 36 }, (_, i) => [
  (i * 37) % 100,
  (i * 173) % 2400,
  2600 + ((i * 331) % 1800),
  COLORES[i % COLORES.length],
]);

// ---------------------------------------------------------------------------
// Cuándo sale sola
// ---------------------------------------------------------------------------

const LLAVE = "hexaapp-hall-visto";

/** La huella de un equipo: si cambia algún pokémon, es otra entrada */
function huella(equipo: EquipoDelHall) {
  return `${equipo.participantId}:${equipo.equipo.map((p) => p.id).join(",")}`;
}

function vistas(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(LLAVE) ?? "[]");
  } catch {
    return [];
  }
}

function marcarVista(equipo: EquipoDelHall) {
  try {
    const todas = [...new Set([...vistas(), huella(equipo)])].slice(-60);
    window.localStorage.setItem(LLAVE, JSON.stringify(todas));
  } catch {
    // Sin localStorage volverá a salir la próxima vez: tampoco es un drama
  }
}

/**
 * La primera vez que alguien abre el hall con un equipo **completo** que no
 * ha visto entrar, se le ofrece verlo. Se pregunta en vez de arrancar solo
 * porque el toque de «Ver la entrada» es lo que deja sonar los gritos en el
 * móvil, y porque no siempre es el momento. Si hay varios, van en fila, del
 * campeón para abajo (el orden del hall).
 */
export function EntradasPendientes({
  equipos,
  edicion,
  tamano,
}: {
  equipos: EquipoDelHall[];
  edicion: string;
  tamano: number;
}) {
  const [cola, setCola] = useState<EquipoDelHall[]>([]);
  const [viendo, setViendo] = useState<EquipoDelHall | null>(null);

  useEffect(() => {
    const yaVistas = new Set(vistas());
    setCola(equipos.filter((e) => e.equipo.length >= tamano && !yaVistas.has(huella(e))));
  }, [equipos, tamano]);

  const siguiente = cola[0];
  if (viendo) {
    return (
      <EntradaAlHall
        equipo={viendo}
        edicion={edicion}
        onCerrar={() => {
          setViendo(null);
          setCola((c) => c.slice(1));
        }}
      />
    );
  }
  if (!siguiente) return null;

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-3 border-amber-400/30 bg-amber-400/[0.05]">
      <p className="min-w-0 flex-1 text-sm text-slate-200">
        <strong className="text-white">{siguiente.displayName}</strong> ha entrado en el Hall de la
        Fama.
        {cola.length > 1 ? ` Y ${cola.length - 1} más.` : ""}
      </p>
      <button
        type="button"
        className="btn-primary btn-sm"
        onClick={() => {
          marcarVista(siguiente);
          setViendo(siguiente);
        }}
      >
        <Icono emoji="▶️" /> Ver la entrada
      </button>
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => {
          cola.forEach(marcarVista);
          setCola([]);
        }}
      >
        Ahora no
      </button>
    </div>
  );
}

/** El botón de cada equipo, para verla cuando se quiera */
export function BotonDeEntrada({ equipo, edicion }: { equipo: EquipoDelHall; edicion: string }) {
  const [viendo, setViendo] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn-ghost btn-sm shrink-0"
        onClick={() => {
          marcarVista(equipo);
          setViendo(true);
        }}
        title="Ver su entrada al Hall de la Fama"
      >
        <Icono emoji="▶️" /> Entrada
      </button>
      {viendo ? (
        <EntradaAlHall equipo={equipo} edicion={edicion} onCerrar={() => setViendo(false)} />
      ) : null}
    </>
  );
}
