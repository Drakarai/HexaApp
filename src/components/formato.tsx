"use client";

import {
  esFormatoEspecial,
  formatoDeCombate,
  FORMATOS,
  FORMATOS_DE_DOS,
} from "@/lib/formatos-de-combate";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

/**
 * La chapa que dice de qué va un combate: "🏆 VGC", "👑 Battle Royale".
 *
 * **En singles no sale nada.** Es lo normal, y si saliera en todas partes
 * dejaría de querer decir nada; así, que una jornada lleve chapa ya significa
 * por sí solo "ojo, que esta es distinta".
 */
export function ChapaDeFormato({
  formato,
  detalle = false,
  className,
}: {
  formato: string | null | undefined;
  /** Añade lo que cambia ("4 pokémon · de dos en dos") */
  detalle?: boolean;
  className?: string;
}) {
  if (!esFormatoEspecial(formato)) return null;
  const ficha = formatoDeCombate(formato);

  return (
    <span
      className={cx(
        // `etiqueta-formato` no pinta nada: es el gancho del aspecto de ahora
        "etiqueta-formato inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{
        borderColor: `${ficha.color}66`,
        background: `${ficha.color}1f`,
        color: ficha.color,
      }}
      title={ficha.resumen}
    >
      <span aria-hidden>
        <Icono emoji={ficha.icono} />
      </span>
      {ficha.nombre}
      {detalle ? (
        <span className="font-normal opacity-80">· {comoSeJuega(ficha.id)}</span>
      ) : null}
    </span>
  );
}

/** "4 pokémon · de dos en dos", para no tener que explicarlo cada vez. */
export function comoSeJuega(formato: string | null | undefined) {
  const ficha = formatoDeCombate(formato);
  const cuantos = `${ficha.equipo} pokémon`;
  if (ficha.multiple) return `${cuantos} · todos contra todos`;
  return ficha.aLaVez > 1 ? `${cuantos} · de ${ficha.aLaVez} en ${ficha.aLaVez}` : cuantos;
}

/**
 * El desplegable para elegir formato.
 *
 * `soloDeDos` deja fuera el Battle Royale: hay sitios donde no cabe, como un
 * reto —que es entre dos por definición— o un combate suelto de una jornada.
 */
export function ElegirFormato({
  name = "formato",
  valor,
  soloDeDos = false,
  label = "Tipo de combate",
  className,
  onCambio,
}: {
  name?: string;
  valor?: string | null;
  soloDeDos?: boolean;
  label?: string | null;
  className?: string;
  /** Para los formularios que cambian de forma según el formato elegido */
  onCambio?: (formato: string) => void;
}) {
  const lista = soloDeDos ? FORMATOS_DE_DOS : FORMATOS;

  return (
    <div className={className}>
      {label ? <label className="label">{label}</label> : null}
      <select
        name={name}
        className="input"
        defaultValue={valor ?? "singles"}
        onChange={(evento) => onCambio?.(evento.target.value)}
      >
        {lista.map((formato) => (
          <option key={formato.id} value={formato.id}>
            {formato.icono} {formato.nombre} · {comoSeJuega(formato.id)}
          </option>
        ))}
      </select>
    </div>
  );
}
