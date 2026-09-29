import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador, puedeCrearLockes } from "@/lib/auth";
import { abrirCompeticionAction } from "@/app/actions/competitions";
import { borrarLockeDeAntesAction } from "@/app/actions/lockes-de-antes";
import { ConfirmSubmit } from "@/components/ui";
import { ApuntarLockeDeAntesForm, EditarLockeDeAntes } from "./apuntar-form";
import { cuentasQuePuedeApuntar } from "@/lib/lockes-de-antes";
import { CuentaDeCadaUno } from "./cuenta-de-cada-uno";
import { getPalmares, type CampeonDeUnLocke } from "@/lib/palmares";
import { getActiveCompetition } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { Avatar, EmptyState } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";

export const metadata = { title: "Palmarés" };

/** La categoría de cada edición, dicha corta junto a su fecha */
const DE_QUE_TAMANO = {
  grupo: "De grupo",
  dual: "Dualocke",
  solitario: "En solitario",
  soullink: "Soul Link",
} as const;

export default async function PalmaresPage({
  searchParams,
}: {
  searchParams: Promise<{ historial?: string }>;
}) {
  // No hace falta edición activa: esta pantalla va por encima de todas
  const user = await requireUser();
  const soloMias = (await searchParams).historial === "mias";
  const [{ ediciones: todas, gente }, preferencias] = await Promise.all([
    getPalmares(),
    // A quién ha quitado de su palmarés: ver cuenta-de-cada-uno.tsx
    prisma.user.findUnique({ where: { id: user.id }, select: { palmaresOcultos: true } }),
  ]);
  const ocultos = preferencias?.palmaresOcultos ?? [];

  /**
   * El historial respeta a quién has quitado de tu palmarés: los títulos de
   * fuera de alguien quitado no salen, y si el subcampeón de uno de fuera es
   * alguien quitado, tampoco se le nombra.
   */
  const quitado = new Set(ocultos);
  const conMiGente = todas
    .filter((e) => !e.deFuera || e.ganadoresUserIds.some((id) => !quitado.has(id)))
    .map((e) =>
      e.deFuera && quitado.has(e.subcampeonUserId ?? "") ? { ...e, subcampeon: null } : e,
    );
  const deFuera = conMiGente.filter((e) => e.deFuera).length;
  const ediciones = soloMias ? conMiGente.filter((e) => !e.deFuera) : conMiGente;

  /** Apuntar lockes de antes lo puede hacer quien puede montarlos */
  const puedeApuntar = esCreador(user) || puedeCrearLockes(user);
  const [cuentas, jugandoAhora] = puedeApuntar
    ? await Promise.all([
        // Las que puede poner: todas el Creador, las suyas un organizador
        cuentasQuePuedeApuntar(user),
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

  if (!conMiGente.length) {
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

  const mias = conMiGente.filter((edicion) => !edicion.deFuera);
  const terminadas = mias.filter((edicion) => edicion.terminado);

  return (
    <>
      <PageHeader
        title="Palmarés"
        subtitle="Todos tus lockes juntos: quién ha ganado más, quién ha enterrado más y cómo acabó cada edición."
      />

      <CuentaDeCadaUno gente={gente} yoId={user.id} ocultosDeEntrada={ocultos} />

      <section className="card">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Las ediciones</h2>
          <span className="text-sm text-slate-500">
            {terminadas.length} de {mias.length}{" "}
            {terminadas.length === 1 ? "terminada" : "terminadas"}
          </span>
        </div>
        <p className="muted mb-4">
          De la más nueva a la más vieja. Las tuyas se abren tocándolas; las{" "}
          <em>de fuera</em> son títulos que ha ganado tu gente en otros lockes.
        </p>

        {/* Solo hace falta elegir si hay algo de fuera que quitar */}
        {deFuera ? (
          <div className="mb-3 flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {(
              [
                [false, `Con mi gente (${deFuera})`],
                [true, "Mías"],
              ] as const
            ).map(([cual, rotulo]) => (
              <Link
                key={rotulo}
                href={cual ? "/palmares?historial=mias" : "/palmares"}
                scroll={false}
                aria-current={soloMias === cual ? "true" : undefined}
                className={cx(
                  "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition",
                  soloMias === cual
                    ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                {rotulo}
              </Link>
            ))}
          </div>
        ) : null}

        <ul className="space-y-2">
          {ediciones.map((edicion) => (
            <li key={edicion.competitionId}>
              {/**
               * Un locke de antes no se puede abrir: no hay nada suyo
               * guardado, solo esta línea. Así que se pinta igual pero sin
               * formulario, y con su botón de quitarlo si es tuyo.
               */}
              {edicion.deFuera ? (
                // De fuera: no se abre, no estás en él
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Ficha edicion={edicion} />
                  </div>
                </div>
              ) : edicion.deAntes ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Ficha edicion={edicion} />
                  </div>
                  {/* El botón debajo y no al lado: al lado apretaba el nombre
                      del juego y la fecha hasta dejarlos en puntos suspensivos */}
                  {edicion.paraEditar && puedeApuntar ? (
                    <EditarLockeDeAntes
                      id={edicion.competitionId}
                      datos={edicion.paraEditar}
                      cuentas={cuentas}
                    />
                  ) : null}
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

/**
 * La línea de una edición: su logo (o su icono), nombre, descripción, juego,
 * fecha y quién la ganó. Las de fuera dicen "ha ganado" en vez de "ganó a",
 * porque del rival solo se sabe el nombre si también es de tu gente.
 */
function Ficha({ edicion }: { edicion: CampeonDeUnLocke }) {
  return (
    <>
      {edicion.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- el logo ya viene reducido de la base de datos
        <img
          src={edicion.logo}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] object-contain p-1"
        />
      ) : (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl"
          aria-hidden
        >
          <Icono emoji={edicion.deAntes ? "📜" : edicion.terminado ? "🏆" : "⏳"} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{edicion.nombre}</p>
        <p className="truncate text-xs text-slate-500">
          {/* "De fuera" aquí y no junto al nombre: al lado, en el móvil, el
              nombre se quedaba en dos palabras y puntos suspensivos */}
          {edicion.deFuera ? (
            <span className="mr-1 rounded border border-amber-400/30 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-300/80">
              De fuera
            </span>
          ) : null}
          {/* La categoría delante: es corta, y detrás el nombre del juego la cortaba */}
          {DE_QUE_TAMANO[edicion.categoria]} · {edicion.game ? `${edicion.game} · ` : ""}
          {formatDate(edicion.startedAt)}
          {edicion.deAntes ? " · a mano" : ""}
        </p>
        {edicion.descripcion || edicion.notas ? (
          <p className="line-clamp-2 text-[11px] text-slate-500">
            {edicion.descripcion ?? edicion.notas}
          </p>
        ) : null}
      </div>
      {edicion.juntos && edicion.juntos.length > 1 ? (
        // Un Soul Link: lo superaron todos, así que salen todos
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex -space-x-2">
            {edicion.juntos.map((quien) => (
              <Avatar
                key={quien.displayName}
                name={quien.displayName}
                color={quien.color}
                image={quien.avatarImage}
                size={26}
              />
            ))}
          </div>
          <div className="max-w-[9rem] text-right">
            <p className="truncate text-sm font-semibold text-amber-200">
              {edicion.juntos.map((quien) => quien.displayName).join(" y ")}
            </p>
            <p className="text-[11px] text-slate-500">
              {edicion.deFuera ? "lo han superado" : "lo superaron juntos"}
            </p>
          </div>
        </div>
      ) : edicion.campeon ? (
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
            <p className="text-[11px] text-slate-500">
              {edicion.subcampeon
                ? `ganó a ${edicion.subcampeon.displayName}`
                : edicion.deFuera
                  ? "ha ganado"
                  : null}
            </p>
          </div>
        </div>
      ) : (
        <span className="shrink-0 text-xs text-slate-500">En marcha</span>
      )}
    </>
  );
}
