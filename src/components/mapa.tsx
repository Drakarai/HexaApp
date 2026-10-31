"use client";

import { useEffect, useRef, useState } from "react";
import type { MapaDeRegion, ZonaDelMapa } from "@/lib/mapas";
import { MAXIMO_DE_VERTICES, colorDeZona, esRedonda, girarVertices, pegarARecta } from "@/lib/zonas";
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

type Vertice = [number, number];

/**
 * La caja de una zona mientras se la mueve, se la estira o se la gira. Las
 * zonas a medida llevan además sus vértices, que son los que se dibujan.
 */
type Caja = { x: number; y: number; w: number; h: number; angle: number; points?: Vertice[] };

/** Dos toques en el mismo vértice en menos de esto lo quitan */
const DOBLE_TOQUE_MS = 350;

/**
 * Deja el giro en grados enteros de 0 a 359, y **se pega a los múltiplos de
 * 15** cuando anda cerca: con el dedo es imposible clavar un 45 a pulso, y 45
 * es justo el que se quiere casi siempre.
 */
function redondearGiro(grados: number) {
  const normal = ((Math.round(grados) % 360) + 360) % 360;
  const cerca = Math.round(normal / 15) * 15;
  return Math.abs(normal - cerca) <= 3 ? cerca % 360 : normal;
}

/**
 * El centro sobre el que gira una zona.
 *
 * Los polígonos se dibujan con sus vértices y pasan de la caja, así que la suya
 * puede haberse quedado en cualquier sitio: para ellos el centro sale de los
 * propios vértices o girarían alrededor de un punto que no se ve.
 */
function centroDeZona(zona: ZonaDelMapa, caja: Caja) {
  const vertices = caja.points ?? zona.points;
  if (zona.shape === "poly" && vertices?.length) {
    const xs = vertices.map(([x]) => x);
    const ys = vertices.map(([, y]) => y);
    return {
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cy: (Math.min(...ys) + Math.max(...ys)) / 2,
      arriba: Math.min(...ys),
    };
  }
  return { cx: caja.x + caja.w / 2, cy: caja.y + caja.h / 2, arriba: caja.y };
}

/** Un punto girado alrededor de otro, para colocar cosas en una zona torcida. */
function girarPunto(x: number, y: number, cx: number, cy: number, grados: number) {
  if (!grados) return { x, y };
  const radianes = (grados * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(radianes) - dy * Math.sin(radianes),
    y: cy + dx * Math.sin(radianes) + dy * Math.cos(radianes),
  };
}

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
      angle?: number;
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
  const [borrador, setBorrador] = useState<Record<string, Caja>>({});
  const gesto = useRef<{
    id: string;
    modo: "mover" | "estirar" | "girar" | "vertice";
    /** Solo al mover un vértice: cuál */
    indice?: number;
    desdeX: number;
    desdeY: number;
    inicial: Caja;
    /** Solo al girar: el centro y el ángulo del que se partía */
    centro?: { cx: number; cy: number };
    /** Que la zona es un círculo: al estirarla no puede quedarse ovalada */
    redonda?: boolean;
    movido: boolean;
  } | null>(null);

  /**
   * Cuando llega el mapa como ha quedado en el servidor, el borrador sobra: ya
   * trae lo que se soltó. Antes solo se soltaba al cambiar el número de zonas,
   * y un giro con el tirador seguía mandando sobre el que luego se escribía a
   * mano en el panel.
   */
  useEffect(() => setBorrador({}), [mapa.zones]);

  /** El último toque en un vértice, para saber si el siguiente es el segundo de un doble toque */
  const ultimoToque = useRef<{ id: string; indice: number; cuando: number } | null>(null);

  const cajaDe = (zona: ZonaDelMapa): Caja =>
    borrador[zona.id] ?? {
      x: zona.x,
      y: zona.y,
      w: zona.w,
      h: zona.h,
      angle: zona.angle,
      ...(zona.shape === "poly" && zona.points ? { points: zona.points } : {}),
    };

  /**
   * Los tiradores, a la escala del lienzo: van en sus unidades, y un mapa de
   * 1900 de ancho los dejaba en un par de píxeles. Así miden lo mismo en
   * pantalla sea cual sea el tamaño del mapa.
   */
  const escala = Math.max(1, Math.max(mapa.width, mapa.height) / 1000);
  /** Lo cerca que tiene que pasar un vértice de la recta de su vecino para pegarse */
  const margenDePegado = Math.max(mapa.width, mapa.height) * 0.012;

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
    let nueva: Caja;

    if (activo.modo === "vertice" && inicial.points && activo.indice !== undefined) {
      // Un vértice: dentro del lienzo y pegado en recta con sus vecinos si pasa cerca
      const dentro: Vertice = [
        Math.max(0, Math.min(mapa.width, punto.x)),
        Math.max(0, Math.min(mapa.height, punto.y)),
      ];
      const puntos = [...inicial.points];
      puntos[activo.indice] = pegarARecta(puntos, activo.indice, dentro, margenDePegado);
      nueva = { ...inicial, points: puntos };
    } else if (activo.modo === "mover" && inicial.points) {
      /**
       * Una zona a medida se mueve moviendo sus vértices: se dibuja con ellos,
       * y antes solo cambiaba su caja, así que al arrastrarla no se movía. Se
       * frena en el borde para que no se salga ninguna esquina.
       */
      const xs = inicial.points.map(([x]) => x);
      const ys = inicial.points.map(([, y]) => y);
      const mx = Math.round(Math.max(-Math.min(...xs), Math.min(mapa.width - Math.max(...xs), dx)));
      const my = Math.round(Math.max(-Math.min(...ys), Math.min(mapa.height - Math.max(...ys), dy)));
      nueva = {
        ...inicial,
        x: inicial.x + mx,
        y: inicial.y + my,
        points: inicial.points.map(([x, y]) => [x + mx, y + my] as Vertice),
      };
    } else if (activo.modo === "girar" && activo.centro) {
      /**
       * El ángulo va del centro de la zona al dedo, y se le resta el que había
       * al empezar: así la forma no pega un salto al agarrar el tirador, se
       * gire desde donde se gire.
       */
      const { cx, cy } = activo.centro;
      const ahora = Math.atan2(punto.y - cy, punto.x - cx);
      const antes = Math.atan2(activo.desdeY - cy, activo.desdeX - cx);
      const grados = ((ahora - antes) * 180) / Math.PI + inicial.angle;
      nueva = { ...inicial, angle: redondearGiro(grados) };
    } else if (activo.modo === "mover") {
      nueva = {
        ...inicial,
        x: Math.round(Math.max(0, Math.min(mapa.width - inicial.w, inicial.x + dx))),
        y: Math.round(Math.max(0, Math.min(mapa.height - inicial.h, inicial.y + dy))),
      };
    } else {
      /**
       * Estirar va en los ejes de la zona, no en los de la pantalla: si está
       * girada 90°, arrastrar hacia abajo tiene que alargarla por su lado
       * largo. Se deshace el giro del movimiento y ya se estira como siempre.
       */
      const radianes = (-inicial.angle * Math.PI) / 180;
      const dxSuyo = dx * Math.cos(radianes) - dy * Math.sin(radianes);
      const dySuyo = dx * Math.sin(radianes) + dy * Math.cos(radianes);

      if (activo.redonda) {
        // Un círculo tiene un solo tamaño: manda el lado que más se arrastre
        const lado = Math.round(
          Math.max(
            12,
            Math.min(
              mapa.width,
              mapa.height,
              Math.min(inicial.w, inicial.h) + Math.max(dxSuyo, dySuyo),
            ),
          ),
        );
        nueva = { ...inicial, w: lado, h: lado };
      } else {
        nueva = {
          ...inicial,
          w: Math.round(Math.max(12, Math.min(mapa.width, inicial.w + dxSuyo))),
          h: Math.round(Math.max(12, Math.min(mapa.height, inicial.h + dySuyo))),
        };
      }
    }

    setBorrador((antes) => ({ ...antes, [activo.id]: nueva }));
  }

  function alSoltar() {
    const activo = gesto.current;
    gesto.current = null;
    if (!activo?.movido) return;
    const caja = borrador[activo.id];
    if (caja) onMover?.([{ id: activo.id, ...caja }]);
  }

  /**
   * Empezar a mover un vértice (o uno recién añadido con el «+»). Si la zona
   * está girada, primero se le aplica el giro a los vértices y se deja derecha:
   * el centro del giro sale de los vértices, y moviendo uno con la zona girada
   * el centro cambiaba y la forma entera saltaba al soltar.
   */
  function agarrarVertice(
    evento: React.PointerEvent,
    zona: ZonaDelMapa,
    caja: Caja,
    puntos: Vertice[],
    indice: number,
    nuevo: boolean,
  ) {
    evento.stopPropagation();
    const derechos = caja.angle ? girarVertices(puntos, caja.angle) : puntos;
    const inicial: Caja = { ...caja, angle: 0, points: derechos };
    const punto = aLienzo(evento);
    gesto.current = {
      id: zona.id,
      modo: "vertice",
      indice,
      desdeX: punto.x,
      desdeY: punto.y,
      inicial,
      // Uno nuevo ya es un cambio aunque no se arrastre: se ha añadido
      movido: nuevo || Boolean(caja.angle),
    };
    setBorrador((antes) => ({ ...antes, [zona.id]: inicial }));
    (evento.target as Element).setPointerCapture(evento.pointerId);
  }

  /** Dos toques seguidos en un vértice lo quitan, si quedan más de tres */
  function quizaQuitarVertice(zona: ZonaDelMapa, caja: Caja, puntos: Vertice[], indice: number) {
    const ahora = Date.now();
    const antes = ultimoToque.current;
    ultimoToque.current = { id: zona.id, indice, cuando: ahora };
    if (!antes || antes.id !== zona.id || antes.indice !== indice || ahora - antes.cuando > DOBLE_TOQUE_MS) {
      return false;
    }
    ultimoToque.current = null;
    if (puntos.length <= 3) return true;
    const derechos = caja.angle ? girarVertices(puntos, caja.angle) : puntos;
    const sin = derechos.filter((_, i) => i !== indice);
    const nueva: Caja = { ...caja, angle: 0, points: sin };
    setBorrador((previo) => ({ ...previo, [zona.id]: nueva }));
    onMover?.([{ id: zona.id, ...nueva }]);
    return true;
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

            const { cx: centroX, cy: centroY, arriba } = centroDeZona(zona, caja);
            // El tirador de girar asoma por arriba, o por dentro si la zona
            // está pegada al borde y ahí fuera no se vería
            const tiradorY = arriba >= 34 ? arriba - 26 : arriba + 26;
            // El giro se aplica al dibujar: por dentro la zona sigue derecha
            const giro = caja.angle
              ? `rotate(${caja.angle} ${centroX} ${centroY})`
              : undefined;

            const comun = {
              fill: color,
              transform: giro,
              fillOpacity: Number(
                (
                  (hechas
                    ? RELLENO_HECHO
                    : soloFallos
                      ? RELLENO_FALLADO
                      : RELLENO_VACIO) * mapa.relleno
                ).toFixed(3),
              ),
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
                {esRedonda(zona.shape) ? (
                  <circle
                    {...comun}
                    cx={caja.x + caja.w / 2}
                    cy={caja.y + caja.h / 2}
                    r={Math.min(caja.w, caja.h) / 2}
                  />
                ) : zona.shape === "circle" ? (
                  <ellipse
                    {...comun}
                    cx={caja.x + caja.w / 2}
                    cy={caja.y + caja.h / 2}
                    rx={caja.w / 2}
                    ry={caja.h / 2}
                  />
                ) : zona.shape === "poly" && caja.points ? (
                  <polygon
                    {...comun}
                    points={caja.points.map(([x, y]) => `${x},${y}`).join(" ")}
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

                {/* Cuántas llevas ahí, o una ✕ si solo hubo fallos. Va sin
                    girar aunque la zona lo esté: un número torcido no se lee */}
                {hechas || soloFallos ? (
                  <text
                    x={centroX}
                    y={centroY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(26, caja.h * 0.7)}
                    fontWeight="700"
                    fill={soloFallos ? "#ffffff" : "var(--color-ink-900, #0b1020)"}
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
                {caidos ? (
                  <Chapa
                    caja={caja}
                    centro={{ cx: centroX, cy: centroY }}
                    cuantos={caidos}
                  />
                ) : null}

                {/* Los tiradores del editor, solo en la zona elegida. Van
                    dentro del giro para que sigan a la forma: el de estirar en
                    su esquina de siempre y el de girar asomando por arriba. */}
                {editable && activa ? (
                  <g transform={giro}>
                    {zona.shape !== "poly" ? (
                      <rect
                        x={caja.x + caja.w - 9}
                        y={caja.y + caja.h - 9}
                        width={18}
                        height={18}
                        rx={4}
                        fill="#ffffff"
                        stroke="var(--color-ink-900, #0b1020)"
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
                            redonda: esRedonda(zona.shape),
                            movido: false,
                          };
                          (evento.target as Element).setPointerCapture(
                            evento.pointerId,
                          );
                        }}
                      >
                        <title>Estirar</title>
                      </rect>
                    ) : null}

                    {/* A medida: un punto en cada esquina para arrastrarla (dos
                        toques la quitan) y un «+» en medio de cada lado que
                        añade una esquina ahí */}
                    {zona.shape === "poly" && caja.points
                      ? (() => {
                          const puntos = caja.points;
                          return (
                            <>
                              {puntos.length < MAXIMO_DE_VERTICES
                                ? puntos.map(([x, y], i) => {
                                    const [x2, y2] = puntos[(i + 1) % puntos.length];
                                    const mx = (x + x2) / 2;
                                    const my = (y + y2) / 2;
                                    return (
                                      <g
                                        key={`mas-${i}`}
                                        className="cursor-copy"
                                        data-anadir-vertice={i}
                                        onPointerDown={(evento) => {
                                          const con = [...puntos];
                                          con.splice(i + 1, 0, [Math.round(mx), Math.round(my)]);
                                          agarrarVertice(evento, zona, caja, con, i + 1, true);
                                        }}
                                      >
                                        <circle
                                          cx={mx}
                                          cy={my}
                                          r={5.5 * escala}
                                          fill="var(--color-ink-900, #0b1020)"
                                          fillOpacity={0.75}
                                          stroke="#ffffff"
                                          strokeWidth={1.5 * escala}
                                          strokeDasharray={`${2 * escala} ${2 * escala}`}
                                        />
                                        <text
                                          x={mx}
                                          y={my}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                          fontSize={9 * escala}
                                          fill="#ffffff"
                                          pointerEvents="none"
                                        >
                                          +
                                        </text>
                                        <title>Añadir una esquina aquí</title>
                                      </g>
                                    );
                                  })
                                : null}
                              {puntos.map(([x, y], i) => (
                                <circle
                                  key={`v-${i}`}
                                  cx={x}
                                  cy={y}
                                  r={7 * escala}
                                  fill="#ffffff"
                                  stroke="var(--color-ink-900, #0b1020)"
                                  strokeWidth={2 * escala}
                                  className="cursor-grab"
                                  data-vertice={i}
                                  onPointerDown={(evento) => {
                                    if (quizaQuitarVertice(zona, caja, puntos, i)) {
                                      evento.stopPropagation();
                                      return;
                                    }
                                    agarrarVertice(evento, zona, caja, puntos, i, false);
                                  }}
                                >
                                  <title>Arrastra esta esquina; dos toques la quitan</title>
                                </circle>
                              ))}
                            </>
                          );
                        })()
                      : null}

                    <line
                      x1={centroX}
                      y1={arriba}
                      x2={centroX}
                      y2={tiradorY}
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeOpacity={0.6}
                      pointerEvents="none"
                    />
                    <circle
                      cx={centroX}
                      cy={tiradorY}
                      r={11}
                      fill="#ffffff"
                      stroke="var(--color-ink-900, #0b1020)"
                      strokeWidth={2}
                      className="cursor-grab"
                      onPointerDown={(evento) => {
                        evento.stopPropagation();
                        const punto = aLienzo(evento);
                        gesto.current = {
                          id: zona.id,
                          modo: "girar",
                          desdeX: punto.x,
                          desdeY: punto.y,
                          inicial: caja,
                          centro: { cx: centroX, cy: centroY },
                          movido: false,
                        };
                        (evento.target as Element).setPointerCapture(
                          evento.pointerId,
                        );
                      }}
                    >
                      <title>Girar</title>
                    </circle>
                    <text
                      x={centroX}
                      y={tiradorY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={13}
                      fill="var(--color-ink-900, #0b1020)"
                      pointerEvents="none"
                    >
                      ↻
                    </text>
                  </g>
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
  centro,
  cuantos,
}: {
  caja: Caja;
  centro: { cx: number; cy: number };
  cuantos: number;
}) {
  const radio = Math.max(6, Math.min(12, caja.h * 0.32, caja.w * 0.32));
  /**
   * La esquina de la zona, girada a mano en vez de con un `transform`: así la
   * chapa se va con la forma pero la cifra de dentro no sale del revés.
   */
  const { x: cx, y: cy } = girarPunto(
    caja.x + caja.w - radio * 0.7,
    caja.y + radio * 0.7,
    centro.cx,
    centro.cy,
    caja.angle,
  );

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
