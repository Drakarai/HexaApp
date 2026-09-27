"use client";

import { useEffect, useRef, useState } from "react";
import type {
  EtapaDelGrafico,
  JugadorDelGrafico,
  SalidaDelGrafico,
} from "@/lib/grafico-clasificacion";
import { Avatar } from "@/components/ui";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

/** Medidas del dibujo, en píxeles del SVG. */
const ANCHO_ETAPA = 86;
const ALTO_CARRIL = 44;
const MARGEN_IZQ = 36;
// Hueco de la derecha: la foto (28 px) va pegada al último nodo y necesita
// que le quepa también el aro de cuando está resaltada
const MARGEN_DER = 58;
const MARGEN_SUP = 30;
const MARGEN_INF = 14;
const RADIO_NODO = 12;

/**
 * Cómo ha ido la clasificación, jornada a jornada, como líneas que se cruzan.
 *
 * Va dibujado a mano en SVG: son seis polilíneas de seis puntos, y meter una
 * librería de gráficos serían cientos de kilobytes para esto. Hay precedente en
 * la casa: la ruleta también es SVG a pelo.
 */
export function PointsChart({
  etapas,
  etapasDeLosQueSiguen = null,
  salidas = [],
  jugadores,
}: {
  etapas: EtapaDelGrafico[];
  /** La misma historia descontando a los que se fueron, si se fue alguien */
  etapasDeLosQueSiguen?: EtapaDelGrafico[] | null;
  salidas?: SalidaDelGrafico[];
  jugadores: JugadorDelGrafico[];
}) {
  const [resaltado, setResaltado] = useState<string | null>(null);
  /**
   * Cuál de las dos se está viendo. Las dos vienen ya calculadas del servidor,
   * así que cambiar de pestaña no pide nada: es la misma página.
   */
  const [modo, setModo] = useState<"todos" | "siguen">("todos");
  const hayDosVistas = Boolean(etapasDeLosQueSiguen?.length);
  const vista =
    modo === "siguen" && etapasDeLosQueSiguen ? etapasDeLosQueSiguen : etapas;

  /**
   * En una pantalla estrecha el dibujo se sale de la tarjeta y hay que
   * deslizarlo, pero eso no se ve: las líneas se cortan y parece que ahí acaba.
   * Se mide de verdad en vez de suponerlo por el ancho de la pantalla.
   */
  const marco = useRef<HTMLDivElement>(null);
  const [seSale, setSeSale] = useState(false);
  useEffect(() => {
    const mirar = () => {
      const caja = marco.current;
      if (caja) setSeSale(caja.scrollWidth > caja.clientWidth + 1);
    };
    mirar();
    const observador = new ResizeObserver(mirar);
    if (marco.current) observador.observe(marco.current);
    return () => observador.disconnect();
  }, []);

  const carriles = jugadores.length;
  const ancho = MARGEN_IZQ + (vista.length - 1) * ANCHO_ETAPA + MARGEN_DER;
  const alto = MARGEN_SUP + carriles * ALTO_CARRIL + MARGEN_INF;

  const x = (etapa: number) => MARGEN_IZQ + etapa * ANCHO_ETAPA;
  const y = (carril: number) => MARGEN_SUP + (carril - 0.5) * ALTO_CARRIL;

  const nodoDe = (etapa: number, participantId: string) =>
    vista[etapa].nodos.find((nodo) => nodo.participantId === participantId);

  /** Cuántos comparten carril en esa etapa: si son varios, el nodo es uno solo. */
  const compartenCarril = (etapa: number, carril: number) =>
    vista[etapa].nodos.filter((nodo) => nodo.carril === carril).length;

  /**
   * La curva en ese de una etapa a la siguiente. Con líneas rectas esto se lee
   * como un diente de sierra; con la curva, como un adelantamiento.
   */
  const trazo = (participantId: string) =>
    vista
      .map((_, etapa) => {
        const nodo = nodoDe(etapa, participantId);
        if (!nodo) return "";
        const px = x(etapa);
        const py = y(nodo.carril);
        if (etapa === 0) return `M ${px} ${py}`;
        const previo = nodoDe(etapa - 1, participantId);
        const anteriorY = y(previo?.carril ?? nodo.carril);
        const tiron = ANCHO_ETAPA * 0.42;
        return `C ${px - ANCHO_ETAPA + tiron} ${anteriorY} ${px - tiron} ${py} ${px} ${py}`;
      })
      .join(" ");

  const ultima = vista.length - 1;
  const apagado = (participantId: string) =>
    resaltado !== null && resaltado !== participantId;

  const elResaltado = jugadores.find((j) => j.participantId === resaltado);
  /**
   * La última etapa **suya**, que no tiene por qué ser la última de todas:
   * descontando a los que se fueron, su línea acaba donde lo dejó.
   */
  const ultimoNodoDe = (participantId: string) => {
    for (let etapa = ultima; etapa >= 0; etapa--) {
      const nodo = nodoDe(etapa, participantId);
      if (nodo) return nodo;
    }
    return null;
  };
  const suPrimero = resaltado ? nodoDe(0, resaltado) : null;
  const suUltimo = resaltado ? ultimoNodoDe(resaltado) : null;
  /** Si se fue, se dice dónde acaba su línea en vez de "acaba Nº" */
  const suSalida = resaltado
    ? (salidas.find((salida) => salida.participantId === resaltado) ?? null)
    : null;

  return (
    <div>
      {/**
       * Las dos vistas. Solo salen si se ha ido alguien: con todo el mundo
       * dentro las dos gráficas serían idénticas y la pestaña sobraría.
       */}
      {hayDosVistas ? (
        <div className="mb-3 flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              ["todos", "Con todos"],
              ["siguen", "Sin los que se fueron"],
            ] as const
          ).map(([cual, rotulo]) => (
            <button
              key={cual}
              type="button"
              onClick={() => setModo(cual)}
              aria-pressed={modo === cual}
              className={cx(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                modo === cual
                  ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      ) : null}

      {/* En el móvil se desplaza en horizontal antes que encogerse: con las
          letras a la mitad de tamaño no se leería nada */}
      <div className="table-wrap" ref={marco}>
        <div className="relative mx-auto" style={{ width: ancho }}>
          <svg
            width={ancho}
            height={alto}
            role="img"
            aria-label={`Puestos de la clasificación por jornada. Al final: ${vista[ultima].nodos
              .slice()
              .sort((a, b) => a.puesto - b.puesto)
              .map(
                (nodo) =>
                  `${nodo.puesto}º ${
                    jugadores.find((j) => j.participantId === nodo.participantId)
                      ?.displayName
                  } con ${nodo.puntos}`,
              )
              .join(", ")}.`}
          >
            {/* Carriles y sus números */}
            {Array.from({ length: carriles }, (_, indice) => (
              <g key={indice}>
                <line
                  x1={MARGEN_IZQ - 10}
                  x2={ancho - MARGEN_DER + 14}
                  y1={y(indice + 1)}
                  y2={y(indice + 1)}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-white/[0.05]"
                />
                <text
                  x={MARGEN_IZQ - 18}
                  y={y(indice + 1)}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="fill-slate-600 text-[10px]"
                >
                  {indice + 1}º
                </text>
              </g>
            ))}

            {/* Nombre de cada etapa */}
            {vista.map((etapa, indice) => (
              <text
                key={etapa.etiqueta}
                x={x(indice)}
                y={MARGEN_SUP - 16}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-semibold"
              >
                <title>{etapa.titulo}</title>
                {etapa.etiqueta}
              </text>
            ))}

            {/* Las líneas. Primero las apagadas, para que la resaltada quede
                por encima de todas */}
            {[...jugadores]
              .sort(
                (a, b) =>
                  Number(a.participantId === resaltado) -
                  Number(b.participantId === resaltado),
              )
              .map((jugador) => (
                <g key={jugador.participantId}>
                  <path
                    d={trazo(jugador.participantId)}
                    fill="none"
                    stroke={jugador.color}
                    strokeWidth={jugador.participantId === resaltado ? 3.5 : 2}
                    strokeLinecap="round"
                    opacity={apagado(jugador.participantId) ? 0.15 : 1}
                    className="transition-[opacity,stroke-width]"
                  />
                  {/* Un trazo invisible y gordo: sin esto hay que acertar en
                      dos píxeles de línea con el dedo */}
                  <path
                    d={trazo(jugador.participantId)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-pointer"
                    onClick={() =>
                      setResaltado((antes) =>
                        antes === jugador.participantId ? null : jugador.participantId,
                      )
                    }
                  />
                </g>
              ))}

            {/* Los nodos, con los puntos dentro. Los que comparten carril se
                pintan una sola vez: van empatados, es lo que hay que contar */}
            {vista.map((etapa, indice) => {
              const pintados = new Set<number>();
              return etapa.nodos.map((nodo) => {
                const varios = compartenCarril(indice, nodo.carril) > 1;
                if (varios) {
                  if (pintados.has(nodo.carril)) return null;
                  pintados.add(nodo.carril);
                }
                const jugador = jugadores.find(
                  (j) => j.participantId === nodo.participantId,
                );
                return (
                  <g
                    key={`${indice}-${varios ? `c${nodo.carril}` : nodo.participantId}`}
                    opacity={
                      varios || !apagado(nodo.participantId) ? 1 : 0.2
                    }
                    className="transition-opacity"
                  >
                    <circle
                      cx={x(indice)}
                      cy={y(nodo.carril)}
                      r={RADIO_NODO}
                      fill="var(--color-ink-900, #0b1020)"
                      stroke={varios ? "rgba(148,163,184,.45)" : (jugador?.color ?? "#64748b")}
                      strokeWidth={2}
                    />
                    <text
                      x={x(indice)}
                      y={y(nodo.carril)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={cx(
                        "text-[10px] font-bold",
                        varios ? "fill-slate-400" : "fill-white",
                      )}
                    >
                      {nodo.puntos}
                    </text>
                    {/* Los caídos y la diferencia también salen: son los que
                        deciden cuando dos empatan a puntos, y sin verlos no se
                        entiende por qué uno va por encima del otro */}
                    <title>
                      {varios
                        ? `${nodo.puesto}º · empatados a ${nodo.puntos} puntos, ${nodo.muertes} caídos y ${nodo.diff > 0 ? "+" : ""}${nodo.diff} de diferencia`
                        : `${jugador?.displayName} · ${nodo.puesto}º · ${nodo.puntos} puntos · ${nodo.muertes} caídos · ${nodo.diff > 0 ? "+" : ""}${nodo.diff} de diferencia`}
                    </title>
                  </g>
                );
              });
            })}
          </svg>

          {/* Las fotos al final de cada línea: hacen de leyenda sin tener que
              mirar arriba y abajo, y sirven de botón para seguir a uno */}
          {jugadores.map((jugador) => {
            const nodo = nodoDe(ultima, jugador.participantId);
            if (!nodo) return null;
            return (
              <button
                key={jugador.participantId}
                type="button"
                aria-pressed={resaltado === jugador.participantId}
                aria-label={`Seguir la línea de ${jugador.displayName}`}
                onClick={() =>
                  setResaltado((antes) =>
                    antes === jugador.participantId ? null : jugador.participantId,
                  )
                }
                className={cx(
                  "absolute rounded-full transition",
                  apagado(jugador.participantId) ? "opacity-25" : "opacity-100",
                )}
                style={{
                  left: x(ultima) + 22,
                  top: y(nodo.carril) - 14,
                  outline:
                    resaltado === jugador.participantId
                      ? `2px solid ${jugador.color}`
                      : undefined,
                  outlineOffset: 2,
                }}
              >
                <Avatar
                  name={jugador.displayName}
                  color={jugador.color}
                  image={jugador.avatarImage}
                  size={28}
                />
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        {elResaltado && suPrimero && suUltimo ? (
          <>
            <span className="font-semibold" style={{ color: elResaltado.color }}>
              {elResaltado.displayName}
            </span>{" "}
            · {suPrimero.puntos} → {suUltimo.puntos} puntos · {suUltimo.muertes}{" "}
            caídos · {suUltimo.diff > 0 ? "+" : ""}
            {suUltimo.diff} de diferencia ·{" "}
            {modo === "siguen" && suSalida
              ? `${suSalida.motivo === "wipeo" ? "pierde el locke" : "se retira"} en ${suSalida.etiqueta}, ${suUltimo.puesto}º`
              : `acaba ${suUltimo.puesto}º`}
          </>
        ) : (
          <>
            {modo === "siguen" ? (
              <>
                Desde la jornada en la que alguien se va, deja de estar en la
                tabla y los de abajo suben.{" "}
                {salidas.map((salida, posicion) => {
                  const quien = jugadores.find(
                    (j) => j.participantId === salida.participantId,
                  );
                  if (!quien) return null;
                  return (
                    <span key={salida.participantId}>
                      {posicion > 0 ? " · " : ""}
                      <span style={{ color: quien.color }}>
                        {quien.displayName}
                      </span>{" "}
                      <Icono emoji={salida.motivo === "wipeo" ? "💥" : "🚪"} /> {salida.etiqueta}
                    </span>
                  );
                })}
              </>
            ) : (
              <>
                Cada línea es un jugador y cada carril un puesto. Toca una para
                seguirla.
                {seSale ? " Desliza para ver el resto de jornadas." : ""}
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}
