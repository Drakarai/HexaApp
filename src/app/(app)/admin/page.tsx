import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { ChallengeDiffToggle } from "./challenge-diff-toggle";
import { urlsDeImagen } from "@/lib/imagenes";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Avatar, ConfirmSubmit } from "@/components/ui";
import { ROLES } from "@/lib/constants";
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

export const metadata = { title: "Administración" };
/**
 * Restaurar una copia son varios megas de JSON viajando a la base de datos: con
 * los diez segundos de siempre no llega.
 */
export const maxDuration = 60;

export default async function AdminPage() {
  const me = await requireAdminPage();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
    include: { _count: { select: { participations: true } } },
  });

  const competition = await getActiveCompetition();

  // Las peticiones de locke en solitario que esperan respuesta
  const solicitudes = await getSolicitudesPendientes();

  // Sin el volcado: son varios megas por copia y aquí solo se listan
  const copias = await prisma.backup.findMany({
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
  });
  const copiasView: CopiaView[] = copias.map((copia) => ({
    ...copia,
    createdAt: copia.createdAt.toISOString(),
  }));

  const titulos = await prisma.title.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      awards: {
        orderBy: { awardedAt: "desc" },
        include: { user: { select: { id: true, displayName: true } } },
      },
    },
  });
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
  const avatares = await urlsDeImagen(
    "avatar",
    users.map((usuario) => usuario.id),
  );

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Usuarios de la aplicación. Cada jugador necesita una cuenta antes de poder apuntarse a una competición."
      />

      <SolicitudesPendientes solicitudes={solicitudes} />

      <section className="card mb-6">
        <h2 className="section-title mb-1">Mapas de las regiones</h2>
        <p className="muted mb-4">
          Las zonas de cada región, de donde sale el Mapa de capturas de cada
          jugador. Son globales: se puede preparar cualquiera desde cualquier
          locke.
        </p>
        <Link href="/admin/mapas" className="btn-ghost btn-sm">
          🗺️ Editar los mapas
        </Link>
      </section>

      <section className="card mb-6">
        <h2 className="section-title mb-1">Level caps de los juegos</h2>
        <p className="muted mb-4">
          Los gimnasios, pruebas y hitos que trae cada juego, para no
          escribirlos a mano en cada locke. También son globales, y dentro de
          una edición se traen con un botón y se ajustan allí.
        </p>
        <Link href="/admin/level-caps" className="btn-ghost btn-sm">
          🎯 Editar las plantillas
        </Link>
      </section>

      {/* Vive también en el perfil, pero aquí es donde se viene a buscarlo */}
      <section className="card mb-6">
        <h2 className="section-title mb-1">Diagnóstico</h2>
        <p className="muted mb-4">
          Cuánto ocupa la base de datos, en qué se va y cuántos lockes cabrían,
          más lo que tarda en contestar cuando la aplicación va lenta. Desde
          ahí se guarda también cada imagen una sola vez.
        </p>
        <Link href="/diagnostico" className="btn-ghost btn-sm">
          🩺 Ver el diagnóstico
        </Link>
      </section>

      {competition ? (
        <section className="card mb-6">
          <h2 className="section-title mb-1">Ajustes de la edición</h2>
          <p className="muted mb-4">
            Afectan solo a {competition.name}.
          </p>
          <ChallengeDiffToggle
            competitionId={competition.id}
            competitionName={competition.name}
            activo={competition.challengeDiffCounts}
          />
        </section>
      ) : null}

      <section className="card mb-6">
        <h2 className="section-title mb-4">Usuarios ({users.length})</h2>
        <ul className="space-y-2">
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
                    value={user.role === ROLES.ADMIN ? ROLES.PLAYER : ROLES.ADMIN}
                  />
                  <button type="submit" className="btn-ghost btn-sm">
                    {user.role === ROLES.ADMIN ? "⭐ Admin" : "Jugador"}
                  </button>
                </form>

                {/* La llave de montar lockes propios. Un admin ya la tiene */}
                {user.role === ROLES.ADMIN ? null : (
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
                      {user.puedeCrearLockes ? "🎪 Organiza" : "🎪 No organiza"}
                    </button>
                  </form>
                )}

                {user.id === me.id ? null : (
                  <form action={deleteUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <ConfirmSubmit
                      message={`¿Borrar a ${user.displayName}? Desaparece de todas las competiciones, con sus muertes y notas.`}
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

      <Titles
        titulos={titulosView}
        usuarios={users.map((usuario) => ({
          id: usuario.id,
          displayName: usuario.displayName,
        }))}
      />

      <Backups
        copias={copiasView}
        seGuardan={COPIAS_QUE_SE_GUARDAN}
        cadaHoras={HORAS_ENTRE_COPIAS}
      />
    </>
  );
}
