import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";
import { ROLES } from "@/lib/constants";
import { ProfileForms } from "./profile-forms";
import { ThemePicker } from "./theme-picker";

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Mi perfil" />

      <div className="card mb-6 flex items-center gap-4">
        <Avatar
          name={user.displayName}
          color={user.avatarColor}
          image={user.avatarImage}
          size={56}
        />
        <div>
          <p className="text-lg font-semibold text-white">{user.displayName}</p>
          <p className="muted">
            @{user.username} ·{" "}
            {user.role === ROLES.ADMIN ? "Administrador" : "Jugador"}
          </p>
        </div>
      </div>

      <ProfileForms
        displayName={user.displayName}
        avatarColor={user.avatarColor}
        avatarImage={user.avatarImage}
      />

      <section className="card mt-4">
        <h2 className="section-title mb-1">Tema</h2>
        <p className="muted mb-4">
          Un color por juego. Pincha en cualquiera para verlo al momento.
        </p>
        <ThemePicker current={user.theme} />
      </section>

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="btn-ghost">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
