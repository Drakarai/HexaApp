import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Avatar, ConfirmSubmit } from "@/components/ui";
import { ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { deleteUserAction, updateUserRoleAction } from "@/app/actions/users";
import { NewUserForm, ResetPasswordForm } from "./user-forms";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  const me = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
    include: { _count: { select: { participations: true } } },
  });

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Usuarios de la aplicación. Cada jugador necesita una cuenta antes de poder apuntarse a una competición."
      />

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
                  image={user.avatarImage}
                  size={32}
                />
                <div className="min-w-0 flex-1">
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
    </>
  );
}
