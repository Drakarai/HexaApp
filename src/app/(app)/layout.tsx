import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition, listCompetitions } from "@/lib/competition";
import { logoutAction } from "@/app/actions/auth";
import { CompetitionSwitcher } from "@/components/competition-switcher";
import { Nav, type NavItem } from "@/components/nav";
import { Avatar } from "@/components/ui";

const BASE_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: "🏠" },
  { href: "/reglas", label: "Reglas", icon: "📜" },
  { href: "/level-caps", label: "Level caps", icon: "🎯" },
  { href: "/muertes", label: "Muertes", icon: "💀" },
  { href: "/jornadas", label: "Jornadas", icon: "⚔️" },
  { href: "/puntos", label: "Puntos", icon: "🏆" },
  { href: "/ruleta", label: "Ruleta", icon: "🎡" },
  { href: "/notas", label: "Mis notas", icon: "🗒️" },
  { href: "/competiciones", label: "Competiciones", icon: "🗂️" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [competitions, active] = await Promise.all([
    listCompetitions(),
    getActiveCompetition(),
  ]);

  const items = isAdmin(user)
    ? [...BASE_ITEMS, { href: "/admin", label: "Administración", icon: "⚙️" }]
    : BASE_ITEMS;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:flex-row lg:gap-8 lg:px-6 lg:py-8">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              ⬢
            </span>
            <span className="text-lg font-black tracking-tight text-white">
              HexaApp
            </span>
          </Link>
          <Link
            href="/perfil"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-xs text-slate-300 transition hover:bg-white/10"
          >
            <Avatar
              name={user.displayName}
              color={user.avatarColor}
              image={user.avatarImage}
              size={26}
            />
            <span className="max-w-24 truncate">{user.displayName}</span>
          </Link>
        </div>

        <div className="mt-5">
          <CompetitionSwitcher
            competitions={competitions.map((competition) => ({
              id: competition.id,
              name: competition.name,
              status: competition.status,
            }))}
            currentId={active?.id ?? null}
          />
        </div>

        <div className="mt-5 lg:sticky lg:top-6">
          <Nav items={items} />
          <form action={logoutAction} className="mt-4 hidden lg:block">
            <button type="submit" className="btn-ghost btn-sm w-full">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-16">{children}</main>
    </div>
  );
}
