"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Lugar } from "@/lib/equipo-y-caja";
import type { PokemonDelTablero } from "@/lib/soul-link";
import { Sprite } from "./casilla";
import type { Destino } from "./tablero";

/**
 * Arrastrar pokémon por el tablero del Equipo y PC, con ratón y con el dedo,
 * y el pokémon que sigue al dedo mientras tanto. Ver `tablero.tsx`.
 */
/**
 * El pokémon que sigue al dedo. Lo mueve `useArrastre` **tocando su estilo
 * directamente**, sin pasar por React, y con `transform` en su propia capa:
 * así cada movimiento del dedo ni repinta lo que hay debajo ni vuelve a
 * dibujar el tablero entero.
 */
export function Fantasma({
  pokemon,
  x,
  y,
  nodo,
}: {
  pokemon: PokemonDelTablero | null;
  x: number;
  y: number;
  nodo: React.RefObject<HTMLDivElement | null>;
}) {
  if (!pokemon) return null;
  return createPortal(
    <div
      ref={nodo}
      className="pointer-events-none fixed left-0 top-0 z-[70] flex h-16 w-16 items-center justify-center rounded-xl border border-brand-400/60 bg-ink-900/90 shadow-2xl will-change-transform"
      style={{ transform: posicionDelFantasma(x, y) }}
    >
      <Sprite pokemon={pokemon} className="h-14 w-14" />
    </div>,
    document.body,
  );
}

function posicionDelFantasma(x: number, y: number) {
  return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
}

// ---------------------------------------------------------------------------
// Arrastrar, con ratón y con el dedo
// ---------------------------------------------------------------------------

export type Arrastre = ReturnType<typeof useArrastre>;

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
export function useArrastre({
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
  // Quién va cogido. Dónde está no es estado: se mueve a mano (ver Fantasma)
  const [fantasma, setFantasma] = useState<{ id: string } | null>(null);
  const nodoFantasma = useRef<HTMLDivElement | null>(null);
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
    setFantasma({ id: actual.id });
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
    if (nodoFantasma.current) {
      nodoFantasma.current.style.transform = posicionDelFantasma(actual.x, actual.y);
    }
    // Estos dos solo cambian al pasar a otra casilla o a una flecha: React no
    // vuelve a pintar nada mientras sigan igual
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
    nodoFantasma,
    /** Dónde está el dedo, para el primer dibujo del fantasma */
    posicion: () => ({ x: estado.current?.x ?? 0, y: estado.current?.y ?? 0 }),
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
