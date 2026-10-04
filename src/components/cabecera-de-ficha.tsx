"use client";

import { Avatar } from "@/components/ui";
import { ChapaDeTipo } from "@/components/chapa-de-tipo";
import { Icono } from "@/components/icono";
import { COLOR_DE_TIPO } from "@/lib/colores-de-tipo";
import { cx } from "@/lib/utils";

/**
 * La cabecera de la ficha de un pokémon: quién lo lleva, su sprite, su nombre
 * y sus tipos, sobre el color de su primer tipo. Es la misma en el Equipo y
 * PC, en el cementerio y en el hall, para que un pokémon se vea igual esté
 * donde esté.
 *
 * Va fija arriba mientras se baja por la ficha (siempre se sabe de quién es),
 * con las pestañas debajo (`children`). Los márgenes negativos son los del
 * relleno de la `Hoja` (`p-5 pt-3`), para que el fondo llegue de lado a lado.
 */
export function CabeceraDeFicha({
  dueno,
  onCerrar,
  sprite,
  nombre,
  especie,
  shiny = false,
  detalle,
  tipos,
  apagada = false,
  children,
}: {
  dueno: { nombre: string; color: string; imagen: string | null; participantId?: string; debajo?: string };
  onCerrar: () => void;
  /** El sprite y lo que vaya encima (los destellos de volverse shiny) */
  sprite: React.ReactNode;
  nombre: string;
  /** La especie; solo sale si el nombre de arriba es un mote */
  especie?: string | null;
  shiny?: boolean;
  /** Una línea más al lado del nombre: el nivel, «del equipo campeón»… */
  detalle?: React.ReactNode;
  tipos: { slug: string; nombre: string }[];
  /** Un caído: el color, más apagado */
  apagada?: boolean;
  children?: React.ReactNode;
}) {
  const color = COLOR_DE_TIPO[tipos[0]?.slug ?? ""] ?? "#6366f1";
  const conMote = especie && especie !== nombre;

  return (
    <div className="sticky -top-3 z-10 -mx-5 bg-ink-900/95 px-5 pb-3 pt-1 backdrop-blur sm:-top-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar
            name={dueno.nombre}
            color={dueno.color}
            image={dueno.imagen}
            size={28}
            participantId={dueno.participantId}
          />
          <div>
            <p className="text-sm text-slate-400">{dueno.nombre}</p>
            {dueno.debajo ? <p className="text-xs text-slate-500">{dueno.debajo}</p> : null}
          </div>
        </div>
        <button type="button" onClick={onCerrar} className="btn-ghost btn-sm" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div
        className="flex items-center gap-4 rounded-2xl border border-white/5 p-2.5"
        style={{
          // Teñida del color de su tipo, como en la Pokédex; muy rebajado para no comerse nada
          background: `linear-gradient(135deg, ${color}${apagada ? "1f" : "38"}, ${color}0d 55%, transparent)`,
        }}
      >
        <div
          className={cx(
            "relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border bg-ink-900/60",
            shiny ? "border-amber-300/30" : "border-white/5",
          )}
        >
          {sprite}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold text-white">{nombre}</h3>
          {conMote || shiny || detalle ? (
            <p className="muted flex flex-wrap items-center gap-x-1.5">
              {conMote ? <span>{especie}</span> : null}
              {detalle ? <span>{detalle}</span> : null}
              {shiny ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                  <Icono emoji="✨" tamano={12} sinColor /> Shiny
                </span>
              ) : null}
            </p>
          ) : null}
          {tipos.length ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
              {tipos.map((tipo) => (
                <ChapaDeTipo key={tipo.slug} slug={tipo.slug} nombre={tipo.nombre} alto={20} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {children}
    </div>
  );
}
