import { requireUser } from "@/lib/auth";
import { abrirCompeticionAction } from "@/app/actions/competitions";
import { getPalmares } from "@/lib/palmares";
import { PageHeader } from "@/components/page-header";
import { Avatar, EmptyState } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";

export const metadata = { title: "Palmarés" };

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function PalmaresPage() {
  // No hace falta edición activa: esta pantalla va por encima de todas
  await requireUser();
  const { ediciones, gente } = await getPalmares();

  if (!ediciones.length) {
    return (
      <>
        <PageHeader title="Palmarés" />
        <EmptyState
          title="Todavía no hay ninguna edición"
          hint="Aquí se juntarán todos los lockes que hayas jugado."
        />
      </>
    );
  }

  const terminadas = ediciones.filter((edicion) => edicion.terminado);

  return (
    <>
      <PageHeader
        title="Palmarés"
        subtitle="Todos tus lockes juntos: quién ha ganado más, quién ha enterrado más y cómo acabó cada edición."
      />

      <section className="card mb-6">
        <h2 className="section-title">La cuenta de cada uno</h2>
        <p className="muted mb-4">
          Sumando todas las ediciones. Las victorias y derrotas son de los
          combates de jornada.
        </p>

        <ul className="space-y-2">
          {gente.map((fila, index) => (
            <li
              key={fila.userId}
              className={cx(
                "rounded-xl border px-3 py-2.5",
                index === 0 && fila.ganados > 0
                  ? "border-amber-400/30 bg-amber-400/[0.05]"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-lg">
                  {fila.ganados > 0 && index < 3 ? (
                    MEDALS[index]
                  ) : (
                    <span className="text-sm text-slate-500">{index + 1}º</span>
                  )}
                </span>
                <Avatar
                  name={fila.displayName}
                  color={fila.color}
                  image={fila.avatarImage}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {fila.displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {fila.lockes} {fila.lockes === 1 ? "locke" : "lockes"}
                    {fila.ganados
                      ? ` · ${fila.ganados} ${fila.ganados === 1 ? "ganado" : "ganados"}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Las cifras debajo y no al lado: con cuatro columnas en un
                  móvil el nombre se quedaba en dos letras */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Cifra valor={fila.ganados} rotulo="🏆 Lockes" />
                <Cifra
                  valor={`${fila.victorias}-${fila.derrotas}`}
                  rotulo="V-D"
                />
                <Cifra valor={fila.bajas} rotulo="💀 Caídos" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Las ediciones</h2>
          <span className="text-sm text-slate-500">
            {terminadas.length} de {ediciones.length}{" "}
            {terminadas.length === 1 ? "terminada" : "terminadas"}
          </span>
        </div>
        <p className="muted mb-4">
          De la más nueva a la más vieja. Toca una para abrirla.
        </p>

        <ul className="space-y-2">
          {ediciones.map((edicion) => (
            <li key={edicion.competitionId}>
              {/**
               * Abrir una edición es cambiar la cookie de cuál se está
               * mirando, así que es un formulario y no un enlace; la acción
               * vuelve a comprobar en el servidor quién puede abrir cuál.
               */}
              <form action={abrirCompeticionAction}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={edicion.competitionId}
                />
                <button
                  type="submit"
                  className={cx(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:border-brand-500/40",
                    edicion.terminado
                      ? "border-white/5 bg-white/[0.03]"
                      : "border-dashed border-white/10 bg-white/[0.01]",
                  )}
                >
                  <span className="text-xl" aria-hidden>
                    {edicion.terminado ? "🏆" : "⏳"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {edicion.nombre}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {edicion.game ? `${edicion.game} · ` : ""}
                      {formatDate(edicion.startedAt)}
                    </p>
                  </div>
                  {edicion.campeon ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Avatar
                        name={edicion.campeon.displayName}
                        color={edicion.campeon.color}
                        image={edicion.campeon.avatarImage}
                        size={26}
                      />
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-200">
                          {edicion.campeon.displayName}
                        </p>
                        {edicion.subcampeon ? (
                          <p className="text-[11px] text-slate-500">
                            ganó a {edicion.subcampeon.displayName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-500">
                      En marcha
                    </span>
                  )}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Cifra({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
      <p className="text-base font-black text-white">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {rotulo}
      </p>
    </div>
  );
}
