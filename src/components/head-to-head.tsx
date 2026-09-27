"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";

export type RivalView = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  wins: number;
  losses: number;
};

export type Destacado = { nombre: string; veces: number; varios: boolean } | null;

/**
 * El balance de combates del jugador. La cifra grande es el total; debajo, a
 * quién le gana más y quién le gana a él. Al pincharlo se abre el detalle
 * contra cada rival, uno a uno.
 *
 * Cuentan las jornadas y los retos: los dos son combates. Los puntos son otra
 * cosa y solo salen de las jornadas.
 */
export function HeadToHead({
  wins,
  losses,
  rivales,
  presa,
  bestiaNegra,
}: {
  wins: number;
  losses: number;
  rivales: RivalView[];
  presa: Destacado;
  bestiaNegra: Destacado;
}) {
  const [abierto, setAbierto] = useState(false);
  const jugados = wins + losses;
  /**
   * En un locke de dos, la presa favorita y la bestia negra son **la misma
   * persona**: la única contra la que se juega. Enseñar las dos etiquetas ahí
   * no dice nada, así que se cambian por el marcador de la serie.
   */
  const unicoRival = rivales.length === 1 ? rivales[0] : null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-expanded={abierto}
        disabled={!jugados || Boolean(unicoRival)}
        className={cx(
          "w-full p-3 text-left transition",
          jugados > 0 && !unicoRival && "hover:bg-white/[0.04]",
        )}
      >
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold tabular-nums text-white">
            {wins}-{losses}
          </p>
          {jugados > 0 && !unicoRival ? (
            <span
              aria-hidden
              className={cx(
                "ml-auto text-xs text-slate-500 transition",
                abierto && "rotate-90",
              )}
            >
              ▸
            </span>
          ) : null}
        </div>
        {/* Con un solo rival el total y el cara a cara son el mismo número, así
            que se dice contra quién en vez de repetirlo debajo */}
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          {unicoRival
            ? `Contra ${unicoRival.displayName}`
            : "Victorias-derrotas"}
        </p>

        {jugados > 0 && !unicoRival ? (
          <dl className="mt-2 space-y-1 border-t border-white/5 pt-2 text-xs">
            <Destaque
              icono="🎯"
              etiqueta="Presa favorita"
              valor={presa}
              tono="text-emerald-300"
            />
            <Destaque
              icono="💀"
              etiqueta="Bestia negra"
              valor={bestiaNegra}
              tono="text-red-300"
            />
          </dl>
        ) : null}
      </button>

      {abierto ? (
        <ul className="space-y-1 border-t border-white/5 p-2">
          {rivales.map((rival) => (
            <li
              key={rival.participantId}
              className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5"
            >
              <Avatar
                name={rival.displayName}
                color={rival.color}
                image={rival.avatarImage}
                size={24}
                participantId={rival.participantId}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {rival.displayName}
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums">
                <span
                  className={cx(
                    rival.wins > rival.losses ? "text-emerald-300" : "text-slate-400",
                  )}
                >
                  {rival.wins}
                </span>
                <span className="text-slate-600">-</span>
                <span
                  className={cx(
                    rival.losses > rival.wins ? "text-red-300" : "text-slate-400",
                  )}
                >
                  {rival.losses}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Destaque({
  icono,
  etiqueta,
  valor,
  tono,
}: {
  icono: string;
  etiqueta: string;
  valor: Destacado;
  tono: string;
}) {
  // Etiqueta arriba y nombre debajo: en una casilla estrecha, uno al lado del
  // otro dejaba el nombre cortado a la mitad
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        <span aria-hidden>
          <Icono emoji={icono} />
        </span>
        {etiqueta}
      </dt>
      <dd
        className={cx(
          "truncate font-semibold",
          valor ? tono : "text-slate-600",
        )}
      >
        {valor ? `${valor.nombre} · ${valor.veces}` : "—"}
      </dd>
    </div>
  );
}
