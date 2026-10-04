"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/utils";
import { precargarGrito, sonarGrito } from "@/lib/gritos";

/**
 * La evolución, como en los juegos.
 *
 * El pokémon se queda en blanco, su silueta se alterna con la de su evolución
 * cada vez más deprisa, un destello, y sale el nuevo con sus destellitos y el
 * «¡Enhorabuena!». Mientras se alterna, **«Darle a la B» la corta**, que es lo
 * que se hacía en los juegos: aquí se deshace (la evolución ya está guardada).
 *
 * Empieza en cuanto se confirma, sin esperar al servidor: la silueta late
 * mientras tanto, y cuando llega la respuesta arranca el cambio. Si no llega
 * bien —sin línea, o un error— se queda en lo que dice el juego cuando no
 * evoluciona. Con «reducir movimiento» activado en el móvil, va al final.
 */

export type ResultadoDeEvolucion = "esperando" | "hecha" | "fallida" | "encolada";

/** Cuánto dura cada silueta: de lento a muy rápido, como en los juegos */
const PASOS = [420, 380, 340, 300, 260, 220, 190, 160, 135, 115, 95, 80, 65, 55, 45, 40, 40, 40];

type Fase = "blanco" | "cambio" | "destello" | "final" | "cancelada" | "no-evoluciona";

export function AnimacionDeEvolucion({
  antes,
  despues,
  nombre,
  nueva,
  resultado,
  gritoAntes,
  gritoDespues,
  onCerrar,
  onDeshacer,
}: {
  antes: string | null;
  despues: string | null;
  /** El mote, o la especie si no tiene */
  nombre: string;
  /** En qué evoluciona: "Quilava" */
  nueva: string;
  resultado: ResultadoDeEvolucion;
  /** Los números de PokéAPI de antes y de después, para sus gritos */
  gritoAntes?: number | null;
  gritoDespues?: number | null;
  onCerrar: () => void;
  onDeshacer: () => void;
}) {
  const [fase, setFase] = useState<Fase>("blanco");
  const [siluetaNueva, setSiluetaNueva] = useState(false);
  const [enBlanco, setEnBlanco] = useState(false);
  const [destello, setDestello] = useState(false);
  const temporizadores = useRef<number[]>([]);
  const empezado = useRef(false);

  const luego = (ms: number, hacer: () => void) => {
    temporizadores.current.push(window.setTimeout(hacer, ms));
  };

  // Al abrir: el pokémon grita y se queda en blanco, como en los juegos
  useEffect(() => {
    sonarGrito(gritoAntes);
    precargarGrito(gritoDespues);
    luego(80, () => setEnBlanco(true));
    const todos = temporizadores.current;
    return () => todos.forEach((t) => window.clearTimeout(t));
    // Solo al abrir: los gritos no cambian a mitad de animación
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando contesta el servidor, lo que toque
  useEffect(() => {
    if (resultado === "esperando" || empezado.current) return;
    empezado.current = true;

    if (resultado !== "hecha") {
      luego(700, () => {
        setEnBlanco(false);
        setFase("no-evoluciona");
      });
      return;
    }

    const sinMovimiento =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (sinMovimiento) {
      setEnBlanco(false);
      setSiluetaNueva(true);
      setFase("final");
      sonarGrito(gritoDespues);
      return;
    }

    // Se carga antes el sprite nuevo, que no salga en blanco a medias
    const arrancar = () => {
      setFase("cambio");
      let t = 700;
      PASOS.forEach((paso, i) => {
        t += paso;
        luego(t, () => setSiluetaNueva(i % 2 === 0));
      });
      luego(t + 60, () => {
        setSiluetaNueva(true);
        setFase("destello");
        setDestello(true);
        navigator.vibrate?.(40);
      });
      luego(t + 330, () => {
        setEnBlanco(false);
        setFase("final");
        // Y el grito del nuevo, que es lo que suena en los juegos al salir
        sonarGrito(gritoDespues);
      });
      luego(t + 800, () => setDestello(false));
    };
    if (despues) {
      const imagen = new Image();
      imagen.onload = arrancar;
      imagen.onerror = arrancar;
      imagen.src = despues;
    } else {
      arrancar();
    }
  }, [resultado, despues, gritoDespues]);

  function darleALaB() {
    temporizadores.current.forEach((t) => window.clearTimeout(t));
    temporizadores.current = [];
    setSiluetaNueva(false);
    setEnBlanco(false);
    setFase("cancelada");
    onDeshacer();
  }

  const mostrada = siluetaNueva && despues ? despues : antes;
  const alternando = fase === "cambio";
  const terminada = fase === "final" || fase === "cancelada" || fase === "no-evoluciona";

  const texto =
    fase === "final"
      ? `¡Enhorabuena! ¡${nombre} ha evolucionado en ${nueva}!`
      : fase === "cancelada"
        ? `¿Eh? ¡${nombre} ha dejado de evolucionar!`
        : fase === "no-evoluciona"
          ? resultado === "encolada"
            ? `Sin conexión: ${nombre} evolucionará en cuanto vuelva la línea.`
            : `¿Eh? ¡${nombre} no ha podido evolucionar!`
          : `¡${nombre} está evolucionando!`;

  return createPortal(
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 px-6 backdrop-blur-sm"
    >
      {/* El halo de detrás, que se enciende con el destello */}
      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-[60%] rounded-full blur-3xl transition-colors duration-700",
          fase === "final" ? "bg-amber-200/25" : "bg-sky-200/15",
        )}
      />

      <div className="relative flex h-44 w-44 items-center justify-center">
        {mostrada ? (
          // Como en la ficha: al estilo de Blanco y Negro, que es de donde se abre
          <SpritePokemon
            ficha
            key={fase === "final" ? "final" : "evolucionando"}
            src={mostrada}
            alt=""
            draggable={false}
            className={cx(
              "h-40 w-40 select-none object-contain transition-[filter] duration-700",
              enBlanco && "[filter:brightness(0)_invert(1)_drop-shadow(0_0_12px_rgba(255,255,255,0.8))]",
              fase === "blanco" && resultado === "esperando" && "animate-[evo-latido_900ms_ease-in-out_infinite]",
              fase === "final" && "animate-[evo-aparece_500ms_ease-out]",
            )}
          />
        ) : (
          <span className="text-slate-500">?</span>
        )}

        {/* Los destellitos de alrededor al terminar */}
        {fase === "final"
          ? DESTELLOS.map(([x, y, retraso, tam], i) => (
              <span
                key={i}
                aria-hidden
                className="absolute animate-[evo-destellito_1100ms_ease-out_both] bg-white [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: tam,
                  height: tam,
                  animationDelay: `${retraso}ms`,
                }}
              />
            ))
          : null}
      </div>

      <p className="mt-6 max-w-xs text-center text-lg font-semibold text-white">{texto}</p>

      <div className="mt-6 flex min-h-10 flex-wrap justify-center gap-2">
        {alternando && resultado === "hecha" ? (
          <button type="button" className="btn-ghost btn-sm" onClick={darleALaB}>
            Darle a la B
          </button>
        ) : null}
        {terminada ? (
          <>
            <button type="button" className="btn-primary btn-sm" onClick={onCerrar}>
              {fase === "final" ? "¡Genial!" : "Cerrar"}
            </button>
            {fase === "final" ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  onDeshacer();
                  onCerrar();
                }}
              >
                Deshacer
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {/* El destello blanco de pantalla entera */}
      <div
        aria-hidden
        className={cx(
          "pointer-events-none fixed inset-0 bg-white transition-opacity",
          destello ? "opacity-100 duration-200" : "opacity-0 duration-500",
        )}
      />
    </div>,
    document.body,
  );
}

/** Dónde sale cada destellito: x e y en %, retraso en ms y tamaño en px */
const DESTELLOS: [number, number, number, number][] = [
  [8, 20, 0, 18],
  [82, 12, 120, 14],
  [90, 60, 240, 20],
  [14, 72, 180, 14],
  [48, -4, 300, 12],
  [55, 92, 60, 16],
  [-4, 44, 360, 12],
  [100, 34, 420, 12],
];
