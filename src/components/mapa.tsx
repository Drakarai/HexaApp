"use client";

import { useEffect, useRef, useState } from "react";
import type { MapaDeRegion, ZonaDelMapa } from "@/lib/mapas";
import { colorDeZona } from "@/lib/zonas";
import { cx } from "@/lib/utils";

/** Por debajo de este acercamiento los nombres no caben y solo se ven puntos. */
const SOLO_PUNTOS = 0.5;

/**
 * Lo ancha que puede llegar a ser una etiqueta antes de recortarse, en unidades
 * del lienzo. Va por debajo de la separación entre columnas (190) a propósito:
 * así, un nombre inventado larguísimo se corta con puntos suspensivos en vez de
 * pisar al vecino y dejar el mapa ilegible.
 */
const ANCHO_MAXIMO = 168;

/**
 * El mapa de una región: las zonas colocadas sobre un lienzo, con la imagen de
 * fondo detrás si alguien la ha subido.
 *
 * **Las posiciones escalan con el acercamiento, pero los nombres no.** Si todo
 * escalara junto, en el móvil las letras quedarían de tres píxeles; así se
 * puede alejar para ver la región entera y los nombres se siguen leyendo, y
 * cuando ya no caben se convierten en puntos y el nombre sale al tocarlos.
 */
export function Mapa({
  mapa,
  cuentas,
  onZona,
  seleccionada,
  editable = false,
  onMover,
}: {
  mapa: MapaDeRegion;
  /** Cuántas capturas hay apuntadas en cada zona, para la chapita */
  cuentas?: Record<string, number>;
  onZona?: (zona: ZonaDelMapa) => void;
  seleccionada?: string | null;
  /** Modo administrador: las zonas se arrastran */
  editable?: boolean;
  /** Se llama al soltar, con dónde ha quedado todo */
  onMover?: (sitios: { id: string; x: number; y: number }[]) => void;
}) {
  const [zoom, setZoom] = useState(0.7);
  const lienzo = useRef<HTMLDivElement>(null);

  /**
   * Mientras arrastras, las posiciones viven aquí y no en el servidor: mandar
   * una petición por cada píxel sería absurdo. Al soltar se avisa con todo.
   */
  const [movidas, setMovidas] = useState<Record<string, { x: number; y: number }>>({});
  const arrastrando = useRef<string | null>(null);

  // Si el mapa cambia por debajo (otra región, o se guardó), se olvida lo local
  useEffect(() => setMovidas({}), [mapa.id, mapa.zones.length]);

  const sitioDe = (zona: ZonaDelMapa) => movidas[zona.id] ?? { x: zona.x, y: zona.y };
  const soloPuntos = zoom < SOLO_PUNTOS;

  function alMover(evento: React.PointerEvent) {
    const id = arrastrando.current;
    if (!id || !lienzo.current) return;
    const caja = lienzo.current.getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * mapa.width;
    const y = ((evento.clientY - caja.top) / caja.height) * mapa.height;
    setMovidas((antes) => ({
      ...antes,
      [id]: {
        x: Math.max(0, Math.min(mapa.width, Math.round(x))),
        y: Math.max(0, Math.min(mapa.height, Math.round(y))),
      },
    }));
  }

  function alSoltar() {
    if (!arrastrando.current) return;
    arrastrando.current = null;
    const sitios = Object.entries(movidas).map(([id, sitio]) => ({ id, ...sitio }));
    if (sitios.length) onMover?.(sitios);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.15).toFixed(2)))}
            aria-label="Alejar"
          >
            −
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}
            aria-label="Acercar"
          >
            +
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {editable
            ? "Arrastra las zonas a su sitio. Se guarda al soltar."
            : soloPuntos
              ? "Acércate para ver los nombres."
              : "Toca una zona para apuntar lo que capturaste ahí."}
        </p>
      </div>

      <div className="overflow-auto rounded-xl border border-white/10 bg-ink-950/60">
        <div
          ref={lienzo}
          className="relative touch-pan-x touch-pan-y"
          style={{
            width: mapa.width * zoom,
            height: mapa.height * zoom,
            // El fondo, si lo hay, se estira al lienzo entero
            backgroundImage: mapa.image ? `url(${mapa.image})` : undefined,
            backgroundSize: "100% 100%",
          }}
          onPointerMove={editable ? alMover : undefined}
          onPointerUp={editable ? alSoltar : undefined}
          onPointerLeave={editable ? alSoltar : undefined}
        >
          {mapa.zones.map((zona) => {
            const sitio = sitioDe(zona);
            const color = colorDeZona(zona.kind);
            const cuenta = cuentas?.[zona.id] ?? 0;
            const activa = seleccionada === zona.id;

            return (
              <button
                key={zona.id}
                type="button"
                title={zona.name}
                onPointerDown={
                  editable
                    ? (evento) => {
                        arrastrando.current = zona.id;
                        evento.currentTarget.setPointerCapture(evento.pointerId);
                      }
                    : undefined
                }
                onClick={() => {
                  // Al arrastrar no se cuenta como pulsar
                  if (editable && movidas[zona.id]) return;
                  onZona?.(zona);
                }}
                className={cx(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border text-xs font-medium transition",
                  soloPuntos ? "h-4 w-4 justify-center rounded-full p-0" : "px-2 py-1",
                  editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  activa ? "z-10 ring-2 ring-white/70" : "hover:brightness-150",
                )}
                style={{
                  left: sitio.x * zoom,
                  top: sitio.y * zoom,
                  borderColor: `${color}99`,
                  background: cuenta ? `${color}55` : `${color}1f`,
                  color: "#e2e8f0",
                }}
              >
                {soloPuntos ? null : (
                  <>
                    <span
                      className="truncate"
                      style={{ maxWidth: ANCHO_MAXIMO * zoom }}
                    >
                      {zona.name}
                    </span>
                    {cuenta ? (
                      <span
                        className="rounded px-1 text-[10px] font-bold tabular-nums"
                        style={{ background: color, color: "#0b1020" }}
                      >
                        {cuenta}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            );
          })}

          {mapa.zones.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Este mapa todavía no tiene zonas.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
