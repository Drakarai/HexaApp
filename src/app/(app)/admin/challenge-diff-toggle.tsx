"use client";

import { setChallengeDiffCountsAction } from "@/app/actions/challenges";
import { SubmitButton } from "@/components/ui";
import { cx } from "@/lib/utils";

/**
 * Los retos nunca dan puntos. Lo único que se puede decidir aquí es si su
 * diferencia de pokémon entra en el **tercer** criterio de desempate de la
 * clasificación, cuando dos van igualados a puntos y a caídos.
 */
export function ChallengeDiffToggle({
  competitionId,
  competitionName,
  activo,
}: {
  competitionId: string;
  competitionName: string;
  activo: boolean;
}) {
  return (
    <form action={setChallengeDiffCountsAction} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />

      <label
        className={cx(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
          activo
            ? "border-brand-500/40 bg-brand-600/10"
            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
        )}
      >
        <input
          type="checkbox"
          name="cuenta"
          defaultChecked={activo}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">
            La diferencia de los retos cuenta para el desempate
          </span>
          <span className="mt-0.5 block text-xs text-slate-400">
            En {competitionName}. Los retos no dan puntos nunca; esto solo
            decide si su diferencia de pokémon entra en el tercer criterio de la
            clasificación, después de los puntos y los caídos.
          </span>
        </span>
      </label>

      <SubmitButton className="btn-ghost btn-sm">Guardar ajuste</SubmitButton>
    </form>
  );
}
