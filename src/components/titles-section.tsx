"use client";

import { equiparTituloAction } from "@/app/actions/titulos";
import type { TituloView } from "@/lib/titulos";
import { TitleBadge } from "@/components/title-badge";
import { cx, formatDate } from "@/lib/utils";

/**
 * Todos los títulos de alguien, con el porqué de cada uno. Si es tu perfil —o
 * eres administrador— cada uno lleva su botón para ponértelo, y arriba uno para
 * quitártelos todos.
 */
export function TitlesSection({
  userId,
  titulos,
  editable,
  propio = false,
  nombre,
}: {
  userId: string;
  titulos: TituloView[];
  /** El dueño o un administrador: los dos pueden cambiar el que se lleva */
  editable: boolean;
  /** Si es tu propio perfil. Solo cambia cómo se habla: de tú o de él. */
  propio?: boolean;
  /** El nombre del dueño, para cuando no es el tuyo */
  nombre?: string;
}) {
  const puesto = titulos.find((titulo) => titulo.equipped) ?? null;

  return (
    <section className="card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">Títulos</h2>
        {editable && puesto ? (
          <form action={equiparTituloAction}>
            <input type="hidden" name="userId" value={userId} />
            <button type="submit" className="text-xs text-slate-500 hover:underline">
              {propio ? "Quitarme el título" : "Quitarle el título"}
            </button>
          </form>
        ) : null}
      </div>

      <p className="muted mb-4">
        {propio
          ? "Los reparte la organización. Ponte el que más te guste: el que lleves puesto sale debajo de tu nombre."
          : editable
            ? `Los títulos de ${nombre ?? "este jugador"}. Puedes elegirle cuál lleva puesto.`
            : `Los títulos que ha ido ganando ${nombre ?? "este jugador"}.`}
      </p>

      {titulos.length === 0 ? (
        <p className="muted">
          {propio
            ? "Todavía no tienes ninguno. Todo se andará."
            : "Todavía no tiene ninguno. Todo se andará."}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {titulos.map((titulo) => (
            <li
              key={titulo.awardId}
              className={cx(
                "rounded-xl border p-3 transition",
                titulo.equipped
                  ? "border-white/15 bg-white/[0.06]"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <TitleBadge titulo={titulo} />
                {titulo.equipped ? (
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    puesto
                  </span>
                ) : null}
              </div>

              {titulo.note ? (
                <p className="mt-2 text-sm text-slate-300">{titulo.note}</p>
              ) : titulo.description ? (
                <p className="mt-2 text-sm text-slate-400">{titulo.description}</p>
              ) : null}

              <p className="mt-1.5 text-[11px] text-slate-500">
                {formatDate(titulo.awardedAt)}
                {titulo.awardedBy ? ` · lo dio ${titulo.awardedBy}` : ""}
              </p>

              {editable && !titulo.equipped ? (
                <form action={equiparTituloAction} className="mt-2">
                  <input type="hidden" name="awardId" value={titulo.awardId} />
                  <button type="submit" className="btn-ghost btn-sm">
                    {propio ? "Ponérmelo" : "Ponérselo"}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
