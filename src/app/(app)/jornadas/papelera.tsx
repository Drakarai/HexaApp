"use client";

import { useActionState } from "react";
import { restaurarJornadaAction, vaciarDeLaPapeleraAction } from "@/app/actions/matchdays";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { Icono } from "@/components/icono";

type Borrada = { id: string; label: string; quien: string | null; cuando: string; quedan: number };

/**
 * Las jornadas borradas en los últimos días, para devolverlas si fue sin
 * querer. Solo la ve quien administra, que es quien puede borrarlas.
 */
export function PapeleraDeJornadas({ borradas }: { borradas: Borrada[] }) {
  if (!borradas.length) return null;
  return (
    <section className="card mt-6">
      <h2 className="section-title mb-1 flex items-center gap-2">
        <Icono emoji="🗑️" /> Papelera
      </h2>
      <p className="muted mb-3">
        Las jornadas borradas se quedan aquí unos días, con sus combates, equipos,
        votos y puntos. Devolverla la deja exactamente como estaba.
      </p>
      <ul className="space-y-2">
        {borradas.map((b) => (
          <Fila key={b.id} borrada={b} />
        ))}
      </ul>
    </section>
  );
}

function Fila({ borrada }: { borrada: Borrada }) {
  const [state, formAction] = useActionState<FormState, FormData>(restaurarJornadaAction, null);
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">{borrada.label}</p>
          <p className="text-xs text-slate-500">
            Borrada {borrada.cuando}
            {borrada.quien ? ` por ${borrada.quien}` : ""} · se va del todo en{" "}
            {borrada.quedan === 1 ? "1 día" : `${borrada.quedan} días`}
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="borradaId" value={borrada.id} />
          <SubmitButton className="btn-primary btn-sm">
            <Icono emoji="↩️" /> Devolver
          </SubmitButton>
        </form>
        <form action={vaciarDeLaPapeleraAction}>
          <input type="hidden" name="borradaId" value={borrada.id} />
          <ConfirmSubmit
            message={`¿Borrar "${borrada.label}" para siempre? Ya no se podrá devolver.`}
            className="btn-ghost btn-sm"
          >
            Borrar para siempre
          </ConfirmSubmit>
        </form>
      </div>
      <FormMessage state={state} />
    </li>
  );
}
