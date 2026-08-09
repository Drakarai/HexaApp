import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";
import { ROLES } from "@/lib/constants";
import { ProfileForms } from "./profile-forms";

export const metadata = { title: "Mi perfil — HexaApp" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Mi perfil" />

      <div className="card mb-6 flex items-center gap-4">
        <Avatar name={user.displayName} color={user.avatarColor} size={56} />
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
      />

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="btn-ghost">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
