import { prisma } from "@/lib/db";
import { requireUser, esCreador, puedeCrearLockes } from "@/lib/auth";
import { abrirCompeticionAction } from "@/app/actions/competitions";
import { borrarLockeDeAntesAction } from "@/app/actions/lockes-de-antes";
import { ConfirmSubmit } from "@/components/ui";
import { ApuntarLockeDeAntesForm } from "./apuntar-form";
import { getPalmares, type CampeonDeUnLocke } from "@/lib/palmares";
import { getActiveCompetition } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { Avatar, EmptyState } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";

export const metadata = { title: "Palmarés" };

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function PalmaresPage() {
  // No hace falta edición activa: esta pantalla va por encima de todas
  const user = await requireUser();
  const { ediciones, gente } = await getPalmares();

  /** Apuntar lockes de antes lo puede hacer quien puede montarlos */
  const puedeApuntar = esCreador(user) || puedeCrearLockes(user);
  const [cuentas, jugandoAhora] = puedeApuntar
    ? await Promise.all([
        prisma.user.findMany({
          orderBy: { displayName: "asc" },
          select: { id: true, displayName: true, username: true },
        }),
        // Los del locke que se está jugando: son los que vienen marcados
        getActiveCompetition().then((activa) =>
          activa
            ? prisma.participant
                .findMany({
                  where: { competitionId: activa.id },
                  select: { userId: true },
                })
                .then((filas) => filas.map((fila) => fila.userId))
            : [],
        ),
      ])
    : [[], []];

  if (!ediciones.length) {
    return (
      <>
        <PageHeader title="Palmarés" />
        <EmptyState
          title="Todavía no hay ninguna edición"
          hint="Aquí se juntarán todos los lockes que hayas jugado."
        />
        {puedeApuntar ? <ApuntarLockeDeAntesForm cuentas={cuentas} deEntrada={jugandoAhora} /> : null}
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
                    <Icono emoji={MEDALS[index]} />
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
                <Cifra valor={fila.ganados} rotulo={<><Icono emoji="🏆" /> Lockes</>} />
                <Cifra
                  valor={`${fila.victorias}-${fila.derrotas}`}
                  rotulo="V-D"
                />
                <Cifra valor={fila.bajas} rotulo={<><Icono emoji="💀" /> Caídos</>} />
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
               * Un locke de antes no se puede abrir: no hay nada suyo
               * guardado, solo esta línea. Así que se pinta igual pero sin
               * formulario, y con su botón de quitarlo si es tuyo.
               */}
              {edicion.deAntes ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Ficha edicion={edicion} />
                  </div>
                  {/* El botón debajo y no al lado: al lado apretaba el nombre
                      del juego y la fecha hasta dejarlos en puntos suspensivos */}
                  {edicion.puedeBorrar ? (
                    <form
                      action={borrarLockeDeAntesAction}
                      className="mt-2 flex justify-end"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={edicion.competitionId}
                      />
                      <ConfirmSubmit
                        className="btn-ghost btn-sm text-slate-500"
                        message={`¿Quitar ${edicion.nombre} del palmarés?`}
                      >
                        ✕ Quitarlo del palmarés
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </div>
              ) : (
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
                  <Ficha edicion={edicion} />
                </button>
              </form>
              )}
            </li>
          ))}
        </ul>

        {puedeApuntar ? <ApuntarLockeDeAntesForm cuentas={cuentas} deEntrada={jugandoAhora} /> : null}
      </section>
    </>
  );
}

function Cifra({ valor, rotulo }: { valor: string | number; rotulo: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
      <p className="text-base font-black text-white">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {rotulo}
      </p>
    </div>
  );
}

/** La línea de una edición: nombre, juego, fecha y quién la ganó. */
function Ficha({ edicion }: { edicion: CampeonDeUnLocke }) {
  return (
    <>
      <span className="text-xl" aria-hidden>
        <Icono emoji={edicion.deAntes ? "📜" : edicion.terminado ? "🏆" : "⏳"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{edicion.nombre}</p>
        <p className="truncate text-xs text-slate-500">
          {edicion.game ? `${edicion.game} · ` : ""}
          {formatDate(edicion.startedAt)}
          {edicion.deAntes ? " · a mano" : ""}
        </p>
        {edicion.notas ? (
          <p className="truncate text-[11px] text-slate-600">{edicion.notas}</p>
        ) : null}
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
        <span className="shrink-0 text-xs text-slate-500">En marcha</span>
      )}
    </>
  );
}
