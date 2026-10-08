"use client";

import { useEffect, useState } from "react";
import { Hoja } from "@/components/hoja";
import { Icono } from "@/components/icono";
import type { PokemonDelTablero } from "@/lib/soul-link";
import type { PokemonParaShowdown } from "@/lib/showdown";

/**
 * **Exportar a Showdown**: el equipo del Equipo y PC en el formato de «Export»
 * de Showdown, para pegarlo en su Teambuilder («Import from text») y probar
 * el combate sin teclear nada. Es lo contrario de pegar un equipo de Showdown
 * en una jornada (ver lib/showdown.ts).
 *
 * Sale al nivel del **level cap que le toca** a quien lo lleva, que es a lo
 * que se juegan los combates; se puede cambiar o dejar en blanco.
 *
 * El escritor se carga al abrirlo (con `import()`): lleva los nombres de
 * todas las especies, movimientos y habilidades, y la caja no los necesita
 * para nada más.
 */

const TEAMBUILDER = "https://play.pokemonshowdown.com/teambuilder";

/** Lo que pide el escritor, sacado de lo que ya tiene el tablero */
export function paraShowdown(pokemon: PokemonDelTablero): PokemonParaShowdown {
  return {
    pokemonId: pokemon.pokemonId,
    especie: pokemon.species,
    mote: pokemon.nickname,
    shiny: pokemon.shiny,
    objeto: pokemon.combate.objeto?.slug ?? null,
    // La de siempre: con la piedra puesta, Showdown ya le pone la de la mega
    habilidad: pokemon.combate.habilidades.normal,
    naturaleza: pokemon.combate.naturaleza?.slug ?? null,
    movimientos: pokemon.combate.movimientos.map((m) => m.slug),
  };
}

async function escribir(equipo: PokemonParaShowdown[], opciones: { nivel: number | null; conMotes: boolean }) {
  const { escribirShowdown } = await import("@/lib/showdown");
  return escribirShowdown(equipo, opciones);
}

async function alPortapapeles(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sin permiso para el portapapeles: el texto está a la vista para copiarlo a mano
    return false;
  }
}

/** El botón de encima del equipo y su hoja */
export function ExportarEquipo({ equipo, nivel }: { equipo: PokemonDelTablero[]; nivel: number | null }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn-ghost btn-sm ml-auto px-2"
        onClick={() => setAbierta(true)}
        title="El equipo en el formato de Showdown, para probar combates"
      >
        <Icono emoji="📤" />
        <span className="text-xs">Exportar a Showdown</span>
      </button>
      {abierta ? <HojaDeExportar equipo={equipo} nivelDelCap={nivel} onCerrar={() => setAbierta(false)} /> : null}
    </>
  );
}

function HojaDeExportar({
  equipo,
  nivelDelCap,
  onCerrar,
}: {
  equipo: PokemonDelTablero[];
  nivelDelCap: number | null;
  onCerrar: () => void;
}) {
  const [nivel, setNivel] = useState(nivelDelCap ? String(nivelDelCap) : "");
  const [conMotes, setConMotes] = useState(true);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);

  const numero = Number(nivel);
  const nivelValido = nivel !== "" && Number.isInteger(numero) && numero >= 1 && numero <= 100 ? numero : null;

  useEffect(() => {
    let vigente = true;
    escribir(equipo.map(paraShowdown), { nivel: nivelValido, conMotes }).then((t) => vigente && setTexto(t));
    return () => {
      vigente = false;
    };
  }, [equipo, nivelValido, conMotes]);

  async function copiar() {
    if (!texto || !(await alPortapapeles(texto))) return;
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const sinFicha = equipo.filter((p) => !p.combate.movimientos.length).length;

  return (
    <Hoja onCerrar={onCerrar} className="p-5 pt-3" ancho="max-w-lg" etiqueta="Exportar a Showdown">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-[Barlow_Condensed] text-2xl font-bold uppercase leading-tight tracking-wide text-white">
            Exportar a Showdown
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Cópialo y en el Teambuilder: <span className="text-slate-300">New Team → Import from text</span>.
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="btn-ghost btn-sm px-2" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="text-xs text-slate-400">
          Nivel
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={nivel}
            onChange={(evento) => setNivel(evento.target.value)}
            placeholder="—"
            className="input mt-1 block h-9 w-20 text-sm"
          />
        </label>
        <p className="mb-2 text-xs text-slate-500">
          {nivelDelCap
            ? nivel === String(nivelDelCap)
              ? "El de tu level cap."
              : nivelValido
                ? `Tu level cap es ${nivelDelCap}.`
                : "Sin nivel: Showdown pone el del formato."
            : nivelValido
              ? null
              : "Sin nivel: Showdown pone el del formato."}
        </p>
        <label className="mb-2 ml-auto flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={conMotes} onChange={(evento) => setConMotes(evento.target.checked)} />
          Con motes
        </label>
      </div>

      <textarea
        readOnly
        value={texto}
        rows={14}
        onFocus={(evento) => evento.currentTarget.select()}
        aria-label="El equipo en formato de Showdown"
        className="input block w-full resize-none font-mono text-xs leading-relaxed"
      />

      {sinFicha ? (
        <p className="mt-2 text-xs text-slate-500">
          {sinFicha === 1 ? "Uno no tiene" : `${sinFicha} no tienen`} movimientos apuntados: sale solo la especie.
          Se apuntan en su ficha, en la pestaña Combate.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary btn-sm" onClick={copiar} disabled={!texto}>
          <Icono emoji="📋" /> {copiado ? "Copiado" : "Copiar"}
        </button>
        <a href={TEAMBUILDER} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
          Abrir Showdown ↗
        </a>
      </div>
    </Hoja>
  );
}

/** En la ficha de uno: copiarlo solo, al nivel del cap, sin abrir nada más */
export function CopiarParaShowdown({ pokemon, nivel }: { pokemon: PokemonDelTablero; nivel: number | null }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    const texto = await escribir([paraShowdown(pokemon)], { nivel, conMotes: true });
    if (!(await alPortapapeles(texto))) return;
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <button type="button" className="btn-ghost btn-sm" onClick={copiar} title="Copiarlo en el formato de Showdown">
      {copiado ? "Copiado" : "Copiar para Showdown"}
    </button>
  );
}
