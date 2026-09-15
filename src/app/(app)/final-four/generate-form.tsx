"use client";

import { useActionState } from "react";
import { generateBracketAction } from "@/app/actions/final-four";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

/**
 * Todas las jornadas están jugadas pero el cuadro no existe todavía: se enseña
 * cómo quedaría la siembra y un botón para congelarla.
 */
export function GenerateBracketForm({
  competitionId,
  canManage,
  nombre,
  esperan,
  standings,
}: {
  competitionId: string;
  canManage: boolean;
  /** "Final Four" o "Jornada Final", según cuántos queden */
  nombre: string;
  /** Cuántos se saltan la primera ronda, para decir a dónde va cada uno */
  esperan: number;
  standings: Array<{
    participantId: string;
    displayName: string;
    points: number;
    deaths: number;
  }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    generateBracketAction,
    null,
  );

  return (
    <section className="card">
      <p className="text-center text-4xl" aria-hidden>
        🎬
      </p>
      <h2 className="mt-3 text-center text-lg font-semibold text-white">
        Jornadas terminadas
      </h2>
      <p className="mx-auto mt-1 max-w-md text-center text-sm text-slate-400">
        Así queda la clasificación. Al generar el cuadro, estos puestos se
        congelan: si luego se corrige algún punto, la {nombre} no se recoloca.
      </p>

      <ol className="mx-auto mt-5 max-w-md space-y-1.5">
        {standings.map((row, index) => (
          <li
            key={row.participantId}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
          >
            <span className="w-5 shrink-0 font-bold text-slate-500">
              {index + 1}º
            </span>
            <span className="min-w-0 flex-1 truncate text-white">
              {row.displayName}
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {row.points} pts · {row.deaths} 💀
            </span>
            {/**
             * A dónde entra cada uno depende del formato: con seis esperan
             * dos, con cinco o tres espera el primero, y con cuatro o dos
             * empiezan todos jugando.
             *
             * En el móvil se baja a su propia línea (`w-full`): al lado del
             * nombre, "Juega la primera ronda" es tan largo que dejaba los
             * nombres en dos letras.
             */}
            <span className="chip w-full justify-center sm:w-auto sm:justify-start">
              {index < esperan ? "Espera turno" : "Juega la primera ronda"}
            </span>
          </li>
        ))}
      </ol>

      {canManage ? (
        <form action={formAction} className="mt-5 space-y-3 text-center">
          <input type="hidden" name="competitionId" value={competitionId} />
          <FormMessage state={state} />
          <SubmitButton>Generar el cuadro</SubmitButton>
        </form>
      ) : (
        <p className="mt-5 text-center text-xs text-slate-500">
          Un administrador tiene que generar el cuadro.
        </p>
      )}
    </section>
  );
}
