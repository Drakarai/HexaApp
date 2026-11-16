"use client";

import { equiparTituloAction } from "@/app/actions/titulos";
import type { TituloView } from "@/lib/titulos";
import { TitleBadge } from "@/components/title-badge";
import { cx, formatDate } from "@/lib/utils";

type Grupo = { clave: string; titulo: string; ayuda?: string; titulos: TituloView[] };

/**
 * Los títulos en grupos: **los del locke que se está mirando primero**, luego
 * los generales y después los de cada uno de los otros lockes, del más nuevo
 * al más viejo. Un general ganado en un locke va en el grupo de ese locke (con
 * su etiqueta de general): es donde se ganó.
 */
function agrupar(titulos: TituloView[], locke: { id: string; name: string } | null): Grupo[] {
  const grupos: Grupo[] = [];
  if (locke) {
    const aqui = titulos.filter((t) => t.locke?.id === locke.id);
    if (aqui.length) grupos.push({ clave: locke.id, titulo: `En ${locke.name}`, titulos: aqui });
  }
  const generales = titulos.filter((t) => !t.locke);
  if (generales.length) grupos.push({ clave: "generales", titulo: "Generales", titulos: generales });
  const otros = new Map<string, TituloView[]>();
  for (const t of titulos) {
    if (!t.locke || t.locke.id === locke?.id) continue;
    otros.set(t.locke.id, [...(otros.get(t.locke.id) ?? []), t]);
  }
  [...otros.values()]
    .sort((a, b) => b[0].locke!.startedAt.localeCompare(a[0].locke!.startedAt))
    .forEach((lista) =>
      grupos.push({ clave: lista[0].locke!.id, titulo: `En ${lista[0].locke!.name}`, titulos: lista }),
    );
  return grupos;
}

/**
 * Todos los títulos de alguien, con el porqué de cada uno, de cualquier locke.
 * Si es tu perfil —o lo administras— cada uno lleva sus botones: llevarlo
 * **en este locke** (uno general o uno de aquí) y llevarlo **en general** (el
 * que sale fuera de los lockes y donde no has elegido otro).
 */
export function TitlesSection({
  userId,
  titulos,
  editable,
  propio = false,
  nombre,
  locke = null,
  soloEnElLocke = false,
}: {
  userId: string;
  titulos: TituloView[];
  /** El dueño o quien administra: los dos pueden cambiar el que se lleva */
  editable: boolean;
  /** Si es tu propio perfil. Solo cambia cómo se habla: de tú o de él. */
  propio?: boolean;
  /** El nombre del dueño, para cuando no es el tuyo */
  nombre?: string;
  /** El locke que se está mirando */
  locke?: { id: string; name: string } | null;
  /**
   * Quien administra el locke pero no es el dueño: le elige el de este locke,
   * pero el general es cosa de cada uno (y del Creador).
   */
  soloEnElLocke?: boolean;
}) {
  const puestoAqui = titulos.find((t) => t.puestoAqui) ?? null;
  const puestoGeneral = titulos.find((t) => t.puestoGeneral) ?? null;
  const grupos = agrupar(titulos, locke);
  const nombreDelLocke = locke?.name ?? "este locke";

  return (
    <section className="card" data-titulos>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">Títulos</h2>
        {editable ? (
          <div className="flex flex-wrap gap-3">
            {/* Lo elegido para el locke se quita y vuelve a salir el general */}
            {locke && puestoAqui && puestoAqui !== puestoGeneral ? (
              <BotonDePoner userId={userId} competitionId={locke.id} texto={`Quitar el de ${nombreDelLocke}`} enlace />
            ) : null}
            {puestoGeneral && !soloEnElLocke ? (
              <BotonDePoner userId={userId} texto={propio ? "Quitarme el general" : "Quitarle el general"} enlace />
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="muted mb-4">
        {propio
          ? "Los reparten la organización y quien administra cada locke. En cada locke llevas el que elijas para él; fuera, y donde no hayas elegido, el general."
          : editable
            ? `Los títulos de ${nombre ?? "este jugador"}. Puedes elegirle cuál lleva.`
            : `Los títulos que ha ido ganando ${nombre ?? "este jugador"}.`}
      </p>

      {titulos.length === 0 ? (
        <p className="muted">
          {propio ? "Todavía no tienes ninguno. Todo se andará." : "Todavía no tiene ninguno. Todo se andará."}
        </p>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.clave} data-grupo-de-titulos={grupo.titulo}>
              <h3 className="rotulo mb-2">{grupo.titulo}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {grupo.titulos.map((titulo) => (
                  <li
                    key={titulo.awardId}
                    className={cx(
                      "rounded-xl border p-3 transition",
                      titulo.puestoAqui || titulo.puestoGeneral
                        ? "border-white/15 bg-white/[0.06]"
                        : "border-white/5 bg-white/[0.03]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <TitleBadge titulo={titulo} />
                      {titulo.puestoAqui ? <Etiqueta>puesto aquí</Etiqueta> : null}
                      {titulo.puestoGeneral ? <Etiqueta>puesto en general</Etiqueta> : null}
                    </div>

                    {titulo.note ? (
                      <p className="mt-2 text-sm text-slate-300">{titulo.note}</p>
                    ) : titulo.description ? (
                      <p className="mt-2 text-sm text-slate-400">{titulo.description}</p>
                    ) : null}

                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {titulo.soloEnElLocke ? "Solo de ese locke" : "General"} · {formatDate(titulo.awardedAt)}
                      {titulo.awardedBy ? ` · lo dio ${titulo.awardedBy}` : ""}
                    </p>

                    {editable ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {locke && titulo.valeAqui && !titulo.puestoAqui ? (
                          <BotonDePoner
                            userId={userId}
                            awardId={titulo.awardId}
                            competitionId={locke.id}
                            texto={`Llevarlo en ${nombreDelLocke}`}
                          />
                        ) : null}
                        {!titulo.soloEnElLocke && !titulo.puestoGeneral && !soloEnElLocke ? (
                          <BotonDePoner userId={userId} awardId={titulo.awardId} texto="Llevarlo en general" />
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-wide text-brand-300">{children}</span>;
}

/** Poner (con `awardId`) o quitar (sin él) el título, aquí o en general */
function BotonDePoner({
  userId,
  awardId,
  competitionId,
  texto,
  enlace = false,
}: {
  userId: string;
  awardId?: string;
  competitionId?: string;
  texto: string;
  enlace?: boolean;
}) {
  return (
    <form action={equiparTituloAction}>
      <input type="hidden" name="userId" value={userId} />
      {awardId ? <input type="hidden" name="awardId" value={awardId} /> : null}
      {competitionId ? <input type="hidden" name="competitionId" value={competitionId} /> : null}
      <button type="submit" className={enlace ? "text-xs text-slate-500 hover:underline" : "btn-ghost btn-sm"}>
        {texto}
      </button>
    </form>
  );
}
