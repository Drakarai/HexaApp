"use client";

import { useActionState, useState } from "react";
import { guardarPuestosAction, repartirPremiosFinalesAction } from "@/app/actions/puestos";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { PremioDeUnPuesto } from "@/lib/puestos";

type Opcion = { id: string; nombre: string };

/**
 * **La clasificación por puestos**, para quien administra: los puntos de cada
 * puesto, lo que se lleva cada puesto (hasta dos objetos de la Bolsa y una
 * tirada de ruleta) y si cada uno tiene que jugar un reto por jornada.
 */
export function ConfigDePuestos({
  competitionId,
  puntos,
  premios,
  retoPorJornada,
  objetos,
  ruletas,
}: {
  competitionId: string;
  puntos: number[] | null;
  premios: PremioDeUnPuesto[];
  retoPorJornada: boolean;
  objetos: Opcion[];
  ruletas: Opcion[];
}) {
  const [estado, accion] = useActionState<FormState, FormData>(guardarPuestosAction, null);
  const [activo, setActivo] = useState(Boolean(puntos));
  const [texto, setTexto] = useState((puntos ?? [2, 2, 2, 1, 0, 0]).join(", "));
  const cuantos = Math.min(
    12,
    texto
      .split(/[,;\s]+/)
      .map((x) => x.trim())
      .filter(Boolean).length,
  );

  return (
    <details className="group card mt-4" data-config-puestos>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Clasificación por puestos {puntos ? "· puesta" : ""}
      </summary>
      <form action={accion} className="mt-4 space-y-4">
        <input type="hidden" name="competitionId" value={competitionId} />
        <label className="flex items-start gap-2.5 text-sm text-slate-200">
          <input
            type="checkbox"
            name="activo"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Puntuar cada jornada por puestos
            <span className="mt-0.5 block text-xs text-slate-400">
              Las victorias dejan de dar puntos sueltos. Al cerrarse cada jornada se hace su tabla (ganar, luego la
              diferencia de pokémon, luego los críticos hechos menos los recibidos, y luego la general) y cada puesto
              se lleva sus puntos, sumados a los iniciales, y sus premios.
            </span>
          </span>
        </label>

        {activo ? (
          <>
            <div>
              <label className="label" htmlFor="puntos-por-puesto">
                Puntos de cada puesto (el 1º primero)
              </label>
              <input
                id="puntos-por-puesto"
                name="puntos"
                className="input"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="2, 2, 2, 1, 0, 0"
              />
            </div>

            <div className="space-y-2">
              <p className="label">Premios de cada puesto (por jornada y en la clasificación final)</p>
              {Array.from({ length: cuantos }, (_, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[3rem_1fr_1fr_1fr] sm:items-center" data-premio-puesto={i + 1}>
                  <span className="text-sm font-semibold text-slate-300">{i + 1}º</span>
                  {[1, 2].map((n) => (
                    <select
                      key={n}
                      name={`objeto${n}-${i}`}
                      aria-label={`Objeto ${n} del ${i + 1}º`}
                      defaultValue={premios[i]?.objetos[n - 1] ?? ""}
                      className="input"
                    >
                      <option value="">{n === 1 ? "Sin objeto" : "Sin otro objeto"}</option>
                      {objetos.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nombre}
                        </option>
                      ))}
                    </select>
                  ))}
                  <select
                    name={`ruleta-${i}`}
                    aria-label={`Ruleta del ${i + 1}º`}
                    defaultValue={premios[i]?.ruleta ?? ""}
                    className="input"
                  >
                    <option value="">Sin ruleta</option>
                    {ruletas.map((r) => (
                      <option key={r.id} value={r.id}>
                        Tirada: {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                Los objetos van a la Bolsa y la ruleta da una tirada. Un objeto con opciones («recompensa intermedia a
                elección») se elige al gastarlo.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-200">
              <input type="checkbox" name="retoPorJornada" defaultChecked={retoPorJornada} className="mt-0.5" />
              <span>
                Cada uno tiene que jugar al menos un reto por jornada
                <span className="block text-xs text-slate-400">
                  Quien no lo juega sale avisado en la tabla de la jornada: le toca jugar con el equipo a la vista.
                </span>
              </span>
            </label>

            {!puntos ? (
              <label className="flex items-start gap-2 text-sm text-slate-200">
                <input type="checkbox" name="premiosDeAntes" className="mt-0.5" />
                <span>
                  Dar también los premios de las jornadas ya jugadas
                  <span className="block text-xs text-slate-400">
                    Sus puntos pasan a contar por puestos igualmente; los premios, solo si se marca (si ya se dieron a
                    mano, se darían dos veces).
                  </span>
                </span>
              </label>
            ) : null}
          </>
        ) : null}

        <FormMessage state={estado} />
        <SubmitButton>Guardar</SubmitButton>
      </form>
    </details>
  );
}

export function RepartirPremiosFinales({ competitionId, yaRepartidos }: { competitionId: string; yaRepartidos: boolean }) {
  const [estado, accion] = useActionState<FormState, FormData>(repartirPremiosFinalesAction, null);
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (
          !window.confirm(
            yaRepartidos
              ? "¿Volver a repartir los premios de la clasificación final con la tabla de ahora? A quien haya cambiado de puesto se le quita lo de antes."
              : "¿Repartir los premios de la clasificación final con la tabla de ahora?",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="mt-3"
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      <SubmitButton>{yaRepartidos ? "Volver a repartir" : "Repartir los premios finales"}</SubmitButton>
      <FormMessage state={estado} />
    </form>
  );
}
