import { prisma } from "@/lib/db";
import { esCreador, requireCreadorPage } from "@/lib/auth";
import { firmaDeColumna } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { PageHeader } from "@/components/page-header";
import { Avatar, ConfirmSubmit } from "@/components/ui";
import { COMPETITION_STATUS, ROLES } from "@/lib/constants";
import { cx, formatDate } from "@/lib/utils";
import {
  cambiarPermisoDeLockesAction,
  deleteUserAction,
  updateUserRoleAction,
} from "@/app/actions/users";
import { NewUserForm, ResetPasswordForm } from "./user-forms";
import { Backups, type CopiaView } from "./backups";
import { Titles, type TituloAdmin } from "./titles";
import { getSolicitudesPendientes } from "@/lib/solicitudes";
import { SolicitudesPendientes } from "./solicitudes";
import {
  COPIAS_HECHAS,
  COPIAS_QUE_SE_GUARDAN,
  HORAS_ENTRE_COPIAS,
} from "@/lib/copias";
import { Icono } from "@/components/icono";
import Link from "next/link";
import { seccionActiva } from "@/components/menu-de-secciones";

export const metadata = { title: "Administración" };
/**
 * Restaurar una copia son varios megas de JSON viajando a la base de datos: con
 * los diez segundos de siempre no llega.
 */
export const maxDuration = 60;

type Seccion = "usuarios" | "titulos" | "copias";

/**
 * Administración, en tres partes: arriba lo urgente (las peticiones de locke)
 * y un panel con las cifras de la casa y los accesos a las herramientas de
 * todos; debajo, en pestañas, cuentas, títulos y copias. Antes era una sola
 * columna de casi 3500 px en el móvil con todo seguido.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const me = await requireCreadorPage();
  const { seccion: pedida } = await searchParams;

  /**
   * Las cinco cosas de la pantalla **a la vez**: ninguna necesita a otra. Iban
   * una detrás de otra, cinco idas y vueltas a la base de datos; las fotos de
   * perfil se piden de toda la tabla, que es lo que se lista.
   */
  const [users, solicitudes, copias, titulos, firmasAvatar, lockesEnMarcha] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
      include: { _count: { select: { participations: true } } },
    }),
    // Las peticiones de locke en solitario que esperan respuesta
    getSolicitudesPendientes(),
    // Sin el volcado: son varios megas por copia y aquí solo se listan
    prisma.backup.findMany({
      where: COPIAS_HECHAS,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        kind: true,
        authorName: true,
        summary: true,
        rawSize: true,
      },
    }),
    prisma.title.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        awards: {
          orderBy: { awardedAt: "desc" },
          include: { user: { select: { id: true, displayName: true } } },
        },
      },
    }),
    prisma.$queryRaw<{ id: string; v: string | null }[]>`
      select "id", ${firmaDeColumna(`"avatarImage"`)} as v from "User"
    `,
    prisma.competition.count({ where: { status: COMPETITION_STATUS.ACTIVE } }),
  ]);
  const copiasView: CopiaView[] = copias.map((copia) => ({
    ...copia,
    createdAt: copia.createdAt.toISOString(),
  }));

  const titulosView: TituloAdmin[] = titulos.map((titulo) => ({
    id: titulo.id,
    name: titulo.name,
    description: titulo.description,
    icon: titulo.icon,
    color: titulo.color,
    concedidos: titulo.awards.map((concesion) => ({
      awardId: concesion.id,
      userId: concesion.user.id,
      displayName: concesion.user.displayName,
      note: concesion.note,
      awardedAt: concesion.awardedAt.toISOString(),
      equipped: concesion.equipped,
    })),
  }));

  // Direcciones de las fotos de perfil: ver lib/imagen-url.ts
  const firmaDeAvatar = new Map(firmasAvatar.map((fila) => [fila.id, fila.v]));
  const avatares = (userId: string) => urlDeImagen("avatar", userId, firmaDeAvatar.get(userId));

  const secciones: { valor: Seccion; rotulo: string; icono: string; cuenta?: number }[] = [
    { valor: "usuarios", rotulo: "Cuentas", icono: "🤼", cuenta: users.length },
    { valor: "titulos", rotulo: "Títulos", icono: "🏅", cuenta: titulos.length },
    { valor: "copias", rotulo: "Copias", icono: "📦", cuenta: copias.length },
  ];
  const activa = seccionActiva(secciones, pedida);
  const ultimaCopia = copias[0]?.createdAt ?? null;
  const creadores = users.filter((usuario) => esCreador(usuario)).length;
  /**
   * La luz de las copias: verde si la última es de hace menos de dos tandas,
   * ámbar si se ha quedado vieja (nadie ha entrado o algo falla) y roja si no
   * hay ninguna.
   */
  const horasDesdeLaCopia = ultimaCopia ? (Date.now() - ultimaCopia.getTime()) / 3_600_000 : null;
  const estadoDeLasCopias =
    horasDesdeLaCopia === null ? "roja" : horasDesdeLaCopia < HORAS_ENTRE_COPIAS * 2 ? "verde" : "ambar";

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="La casa entera: las cuentas, los títulos, las copias y lo que es de todos."
      />

      <SolicitudesPendientes solicitudes={solicitudes} />

      {/**
       * Arriba, cómo está la casa: una fila de indicadores con su luz —verde si
       * va bien, ámbar si pide atención— y la caja de herramientas de todos.
       */}
      <section
        aria-label="Cómo está la casa"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4"
      >
        <Indicador luz="neutra" rotulo="Cuentas" valor={users.length} detalle={`${creadores} ${creadores === 1 ? "creador" : "creadores"}`} />
        <Indicador
          luz={lockesEnMarcha ? "verde" : "apagada"}
          rotulo="En marcha"
          valor={lockesEnMarcha}
          detalle={lockesEnMarcha === 1 ? "locke" : "lockes"}
        />
        <Indicador luz="neutra" rotulo="Títulos" valor={titulos.length} detalle="repartibles" />
        <Indicador
          luz={estadoDeLasCopias}
          rotulo="Copias"
          valor={copias.length}
          detalle={ultimaCopia ? `la última, ${formatDate(ultimaCopia)}` : "ninguna todavía"}
        />
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Tecla href="/admin/mapas" icono="🗺️" nombre="Mapas" detalle="Las zonas de cada región" />
        <Tecla href="/admin/level-caps" icono="🎯" nombre="Level caps" detalle="Las plantillas de cada juego" />
        {/* Vive también en el perfil, pero aquí es donde se viene a buscarlo */}
        <Tecla href="/diagnostico" icono="🩺" nombre="Diagnóstico" detalle="Espacio, velocidad y errores" />
      </div>

      {/* Debajo, las tres partes: el menú a un lado en el ordenador y en pastillas en el móvil */}
      <div className="mt-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
        <nav
          aria-label="Partes de Administración"
          className="mb-4 flex gap-2 overflow-x-auto lg:sticky lg:top-6 lg:mb-0 lg:flex-col lg:self-start"
        >
          {secciones.map((s) => (
            <Link
              key={s.valor}
              href={`/admin?seccion=${s.valor}`}
              aria-current={s.valor === activa ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition lg:rounded-lg lg:px-3 lg:py-2",
                s.valor === activa
                  ? "border-white bg-white text-ink-950 lg:border-white/10 lg:bg-white/10 lg:text-white lg:shadow-[inset_3px_0_0_var(--color-brand-500)]"
                  : "border-white/10 text-slate-300 hover:bg-white/5 lg:border-transparent",
              )}
            >
              <Icono emoji={s.icono} tamano={16} />
              {s.rotulo}
              <span className="text-xs tabular-nums opacity-60 lg:ml-auto">{s.cuenta}</span>
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          {activa === "usuarios" ? (
            <>
              <section className="card mb-4">
                <h2 className="section-title mb-4">Cuentas ({users.length})</h2>
                <ul className="grid gap-2 2xl:grid-cols-2">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Avatar
                          name={user.displayName}
                          color={user.avatarColor}
                          image={avatares(user.id)}
                          size={32}
                        />
                        {/**
                         * `min-w-44` y no `min-w-0`: con tres botones al lado, en un
                         * móvil el nombre se quedaba en "A..". Con un ancho mínimo, lo
                         * que se va a la línea de abajo son los botones.
                         */}
                        <div className="min-w-44 flex-1">
                          <p className="truncate font-medium text-white">
                            {user.displayName}
                            {user.id === me.id ? (
                              <span className="ml-2 text-xs text-slate-500">(tú)</span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            @{user.username} · {user._count.participations} competiciones
                            · alta {formatDate(user.createdAt)}
                          </p>
                        </div>

                        <form action={updateUserRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            type="hidden"
                            name="role"
                            value={esCreador(user) ? ROLES.PLAYER : ROLES.CREADOR}
                          />
                          <button
                            type="submit"
                            className="btn-ghost btn-sm"
                            title={
                              esCreador(user)
                                ? "Lo ve y lo toca todo en la aplicación"
                                : "Hacerle Creador: le da acceso a todo"
                            }
                          >
                            {esCreador(user) ? <><Icono emoji="👑" /> Creador</> : "Jugador"}
                          </button>
                        </form>

                        {/* La llave de montar lockes propios. El Creador ya la tiene */}
                        {esCreador(user) ? null : (
                          <form action={cambiarPermisoDeLockesAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <button
                              type="submit"
                              className={cx(
                                "btn-ghost btn-sm",
                                user.puedeCrearLockes && "text-emerald-300",
                              )}
                              title={
                                user.puedeCrearLockes
                                  ? "Puede montar sus propios lockes y dar de alta a su gente"
                                  : "Darle permiso para montar sus propios lockes"
                              }
                            >
                              <Icono emoji="🎪" />{user.puedeCrearLockes ? " Organiza" : " No organiza"}
                            </button>
                          </form>
                        )}

                        {user.id === me.id ? null : (
                          <form action={deleteUserAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmSubmit
                              message={`¿Borrar a ${user.displayName}? Desaparece de todas las competiciones, con sus muertes y notas. En los lockes de antes se queda por su nombre.`}
                            >
                              ✕
                            </ConfirmSubmit>
                          </form>
                        )}
                      </div>

                      <ResetPasswordForm userId={user.id} username={user.username} />
                    </li>
                  ))}
                </ul>
              </section>

              <NewUserForm />
            </>
          ) : null}

          {activa === "titulos" ? (
            <Titles
              titulos={titulosView}
              usuarios={users.map((usuario) => ({
                id: usuario.id,
                displayName: usuario.displayName,
              }))}
            />
          ) : null}

          {activa === "copias" ? (
            <Backups
              copias={copiasView}
              seGuardan={COPIAS_QUE_SE_GUARDAN}
              cadaHoras={HORAS_ENTRE_COPIAS}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

const LUCES = {
  verde: "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/70",
  ambar: "bg-amber-400 shadow-[0_0_8px] shadow-amber-400/70",
  roja: "bg-red-500 shadow-[0_0_8px] shadow-red-500/70",
  neutra: "bg-brand-400",
  apagada: "bg-slate-600",
} as const;

/** Un indicador de la fila de arriba: su luz, su rótulo y su cifra */
function Indicador({
  luz,
  rotulo,
  valor,
  detalle,
}: {
  luz: keyof typeof LUCES;
  rotulo: string;
  valor: number;
  detalle: string;
}) {
  return (
    <div className="bg-ink-900 px-4 py-3">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
        <span className={cx("h-2 w-2 rounded-full", LUCES[luz])} />
        {rotulo}
      </p>
      <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums leading-none text-white">{valor}</p>
      <p className="mt-1 truncate text-[11px] text-slate-500">{detalle}</p>
    </div>
  );
}

/** Una herramienta de la caja: una tecla que se hunde al pulsarla */
function Tecla({ href, icono, nombre, detalle }: { href: string; icono: string; nombre: string; detalle: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 border-b-4 border-b-black/50 bg-ink-800 px-2 py-3 text-center transition hover:bg-ink-700 active:translate-y-0.5 active:border-b-2"
    >
      <span className="text-brand-400">
        <Icono emoji={icono} tamano={22} />
      </span>
      <span className="text-sm font-semibold text-white">{nombre}</span>
      <span className="hidden text-xs text-slate-400 sm:block">{detalle}</span>
    </Link>
  );
}
