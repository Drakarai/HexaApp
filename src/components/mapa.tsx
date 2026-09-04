"use client";

import { useEffect, useRef, useState } from "react";
import type { MapaDeRegion, ZonaDelMapa } from "@/lib/mapas";
import { colorDeZona } from "@/lib/zonas";
import { cx } from "@/lib/utils";

/**
 * El mapa de una región: las zonas dibujadas encima de la imagen.
 *
 * **Las zonas van transparentes hasta que apuntas algo dentro**, y entonces se
 * rellenan de su color. Por eso no llevan el nombre escrito encima: con
 * cincuenta etiquetas ya no se vería el mapa. El nombre sale al tocarlas.
 *
 * Va en SVG y no con divs porque las zonas son formas de verdad —rectángulos,
 * círculos y polígonos a medida— y con `viewBox` todo se escala solo: las
 * coordenadas se guardan en unidades del lienzo y el navegador se encarga del
 * resto, así que el mismo mapa vale en un móvil y en un monitor.
 */

/** Qué tan opaca queda una zona con alguna captura buena */
const RELLENO_HECHO = 0.62;
/**
 * Y una en la que solo hubo encuentros fallados: la ruta está hecha, pero sin
 * premio. Se rellena a medias para distinguirla de un vistazo tanto de las que
 * tienen algo como de las que están sin tocar.
 */
const RELLENO_FALLADO = 0.3;
/** Y una en la que todavía no has apuntado nada */
const RELLENO_VACIO = 0.06;

/** El color de las zonas que solo tienen fallos, sea cual sea su tipo */
const COLOR_FALLADO = "#ef4444";

/** Lo apuntado en una zona: capturas buenas y encuentros fallados */
export type CuentaDeZona = { hechas: number; fallos: number };

export function Mapa({
  mapa,
  cuentas,
  bajas,
  onZona,
  seleccionada,
  editable = false,
  onMover,
  onDibujar,
}: {
  mapa: MapaDeRegion;
  /** Lo apuntado en cada zona, contando lo de sus hijas */
  cuentas?: Record<string, CuentaDeZona>;
  /**
   * Cuántos pokémon **tuyos** han caído en cada zona. Sale de las bajas del
   * cementerio, no del mapa, pero se pinta aquí porque es donde se entiende:
   * de un vistazo se ve dónde te está costando la vida.
   */
  bajas?: Record<string, number>;
  onZona?: (zona: ZonaDelMapa) => void;
  seleccionada?: string | null;
  /** Modo administrador: las zonas se mueven y se estiran */
  editable?: boolean;
  onMover?: (
    sitios: {
      id: string;
      x: number;
      y: number;
      w?: number;
      h?: number;
      points?: [number, number][];
    }[],
  ) => void;
  /** En modo administrador, pinchar en el hueco crea una zona ahí */
  onDibujar?: (sitio: { x: number; y: number }) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);

  /**
   * Mientras arrastras, la zona vive aquí y no en el servidor: mandar una
   * petición por cada píxel sería absurdo. Al soltar se avisa con el resultado.
   */
  const [borrador, setBorrador] = useState<
    Record<string, { x: number; y: number; w: number; h: number }>
  >({});
  const gesto = useRef<{
    id: string;
    modo: "mover" | "estirar";
    desdeX: number;
    desdeY: number;
    inicial: { x: number; y: number; w: number; h: number };
    movido: boolean;
  } | null>(null);

  useEffect(() => setBorrador({}), [mapa.id, mapa.zones.length]);

  const cajaDe = (zona: ZonaDelMapa) =>
    borrador[zona.id] ?? { x: zona.x, y: zona.y, w: zona.w, h: zona.h };

  /** De píxeles de pantalla a unidades del lienzo. */
  function aLienzo(evento: { clientX: number; clientY: number }) {
    const caja = svg.current?.getBoundingClientRect();
    if (!caja) return { x: 0, y: 0 };
    return {
      x: ((evento.clientX - caja.left) / caja.width) * mapa.width,
      y: ((evento.clientY - caja.top) / caja.height) * mapa.height,
    };
  }

  function alMover(evento: React.PointerEvent) {
    const activo = gesto.current;
    if (!activo) return;

    const punto = aLienzo(evento);
    const dx = punto.x - activo.desdeX;
    const dy = punto.y - activo.desdeY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) activo.movido = true;

    const { inicial } = activo;
    const nueva =
      activo.modo === "mover"
        ? {
            x: Math.round(Math.max(0, Math.min(mapa.width - inicial.w, inicial.x + dx))),
            y: Math.round(Math.max(0, Math.min(mapa.height - inicial.h, inicial.y + dy))),
            w: inicial.w,
            h: inicial.h,
          }
        : {
            x: inicial.x,
            y: inicial.y,
            w: Math.round(Math.max(12, Math.min(mapa.width - inicial.x, inicial.w + dx))),
            h: Math.round(Math.max(12, Math.min(mapa.height - inicial.y, inicial.h + dy))),
          };

    setBorrador((antes) => ({ ...antes, [activo.id]: nueva }));
  }

  function alSoltar() {
    const activo = gesto.current;
    gesto.current = null;
    if (!activo?.movido) return;
    const caja = borrador[activo.id];
    if (caja) onMover?.([{ id: activo.id, ...caja }]);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-950/60">
      <svg
        ref={svg}
        viewBox={`0 0 ${mapa.width} ${mapa.height}`}
        className={cx("block w-full", editable && "touch-none")}
        style={{ aspectRatio: `${mapa.width} / ${mapa.height}` }}
        onPointerMove={editable ? alMover : undefined}
        onPointerUp={editable ? alSoltar : undefined}
        onPointerLeave={editable ? alSoltar : undefined}
        onClick={(evento) => {
          // Pinchar en el hueco, en modo editor, crea una zona ahí
          if (editable && onDibujar && evento.target === svg.current) {
            onDibujar(aLienzo(evento));
          }
        }}
      >
        {mapa.image ? (
          <image
            href={mapa.image}
            x={0}
            y={0}
            width={mapa.width}
            height={mapa.height}
            preserveAspectRatio="none"
          />
        ) : (
          <rect
            width={mapa.width}
            height={mapa.height}
            fill="transparent"
          />
        )}

        {mapa.zones
          .filter((zona) => zona.shape !== "none")
          .map((zona) => {
            const caja = cajaDe(zona);
            const suyo = zona.color ?? colorDeZona(zona.kind);
            const { hechas = 0, fallos = 0 } = cuentas?.[zona.id] ?? {};
            const caidos = bajas?.[zona.id] ?? 0;
            const activa = seleccionada === zona.id;

            /**
             * Manda la captura buena: si la hay, la zona va de su color con el
             * número, aunque antes se hubiera fallado ahí. Solo cuando **no**
             * hay ninguna buena sale la ✕ en rojo.
             */
            const soloFallos = !hechas && fallos > 0;
            const color = soloFallos ? COLOR_FALLADO : suyo;

            const comun = {
              fill: color,
              fillOpacity: hechas
                ? RELLENO_HECHO
                : soloFallos
                  ? RELLENO_FALLADO
                  : RELLENO_VACIO,
              stroke: activa ? "#ffffff" : color,
              strokeWidth: activa ? 5 : 2.5,
              strokeOpacity: activa ? 1 : 0.85,
              className: cx(
                "transition-[fill-opacity]",
                editable ? "cursor-move" : "cursor-pointer",
              ),
              onPointerDown: editable
                ? (evento: React.PointerEvent) => {
                    const punto = aLienzo(evento);
                    gesto.current = {
                      id: zona.id,
                      modo: "mover",
                      desdeX: punto.x,
                      desdeY: punto.y,
                      inicial: caja,
                      movido: false,
                    };
                    (evento.target as Element).setPointerCapture(evento.pointerId);
                  }
                : undefined,
              onClick: () => {
                // Después de arrastrar no cuenta como pulsar
                if (editable && borrador[zona.id]) return;
                onZona?.(zona);
              },
            };

            return (
              <g key={zona.id}>
                {zona.shape === "circle" ? (
                  <ellipse
                    {...comun}
                    cx={caja.x + caja.w / 2}
                    cy={caja.y + caja.h / 2}
                    rx={caja.w / 2}
                    ry={caja.h / 2}
                  />
                ) : zona.shape === "poly" && zona.points ? (
                  <polygon
                    {...comun}
                    points={zona.points.map(([x, y]) => `${x},${y}`).join(" ")}
                  />
                ) : (
                  <rect
                    {...comun}
                    x={caja.x}
                    y={caja.y}
                    width={caja.w}
                    height={caja.h}
                    rx={Math.min(10, caja.w / 4, caja.h / 4)}
                  />
                )}

                <title>{zona.name}</title>

                {/* Cuántas llevas ahí, o una ✕ si solo hubo fallos */}
                {hechas || soloFallos ? (
                  <text
                    x={caja.x + caja.w / 2}
                    y={caja.y + caja.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(26, caja.h * 0.7)}
                    fontWeight="700"
                    fill={soloFallos ? "#ffffff" : "#0b1020"}
                    pointerEvents="none"
                  >
                    {hechas || "✕"}
                  </text>
                ) : null}

                {/* Lo que has perdido ahí: una chapa roja en la esquina, que no
                    pisa al número de capturas del medio.

                    Es un círculo con la cifra y no una calavera: un mapa de
                    región entero cabe en un móvil, así que cada zona mide
                    cuatro píxeles y el dibujo de un emoji ahí no se distingue.
                    Una forma plana de un solo color sí. */}
                {caidos ? <Chapa caja={caja} cuantos={caidos} /> : null}

                {/* El tirador de estirar, solo en el editor y en la elegida */}
                {editable && activa && zona.shape !== "poly" ? (
                  <rect
                    x={caja.x + caja.w - 9}
                    y={caja.y + caja.h - 9}
                    width={18}
                    height={18}
                    rx={4}
                    fill="#ffffff"
                    stroke="#0b1020"
                    strokeWidth={2}
                    className="cursor-nwse-resize"
                    onPointerDown={(evento) => {
                      evento.stopPropagation();
                      const punto = aLienzo(evento);
                      gesto.current = {
                        id: zona.id,
                        modo: "estirar",
                        desdeX: punto.x,
                        desdeY: punto.y,
                        inicial: caja,
                        movido: false,
                      };
                      (evento.target as Element).setPointerCapture(evento.pointerId);
                    }}
                  />
                ) : null}
              </g>
            );
          })}
      </svg>
    </div>
  );
}

/**
 * La chapa de las bajas: un círculo rojo con la cifra en la esquina de la zona.
 *
 * La cifra solo se escribe si el círculo da de sí; en las zonas pequeñas se
 * queda el punto pelado, que ya dice "aquí has perdido algo", y el número
 * exacto se lee en la lista o abriendo la zona.
 */
function Chapa({
  caja,
  cuantos,
}: {
  caja: { x: number; y: number; w: number; h: number };
  cuantos: number;
}) {
  const radio = Math.max(6, Math.min(12, caja.h * 0.32, caja.w * 0.32));
  const cx = caja.x + caja.w - radio * 0.7;
  const cy = caja.y + radio * 0.7;

  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={radio} fill="#dc2626" stroke="#fee2e2" strokeWidth={1.5} />
      {radio >= 9 ? (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={radio * 1.35}
          fontWeight="700"
          fill="#ffffff"
        >
          {cuantos}
        </text>
      ) : null}
    </g>
  );
}
