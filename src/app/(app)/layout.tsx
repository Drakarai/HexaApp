import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition, listCompetitions } from "@/lib/competition";
import { logoutAction } from "@/app/actions/auth";
import { CompetitionSwitcher } from "@/components/competition-switcher";
import { Nav, type NavItem } from "@/components/nav";
import { MobileTabBar } from "@/components/mobile-nav";
import { Avatar } from "@/components/ui";

/** Las 4 primeras salen en la barra inferior del móvil; el resto, en "Más". */
const PRIMARY_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: "🏠" },
  { href: "/muertes", label: "Caja", icon: "💀" },
  { href: "/puntos", label: "Puntos", icon: "🏆" },
  { href: "/ruleta", label: "Ruleta", icon: "🎡" },
];

const SECONDARY_ITEMS: NavItem[] = [
  { href: "/actividad", label: "Actividad", icon: "📰" },
  { href: "/reglas", label: "Reglas", icon: "📜" },
  { href: "/level-caps", label: "Level caps", icon: "🎯" },
  { href: "/jornadas", label: "Jornadas", icon: "⚔️" },
  { href: "/final-four", label: "Final Four", icon: "🏆" },
  { href: "/hall-de-la-fama", label: "Hall de la fama", icon: "🏅" },
  { href: "/notas", label: "Mis notas", icon: "🗒️" },
  { href: "/competiciones", label: "Ediciones", icon: "🗂️" },
  { href: "/perfil", label: "Mi perfil", icon: "👤" },
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

  const adminItem: NavItem = {
    href: "/admin",
    label: "Administración",
    icon: "⚙️",
  };
  const secondary = isAdmin(user)
    ? [...SECONDARY_ITEMS, adminItem]
    : SECONDARY_ITEMS;
  const sidebarItems = [...PRIMARY_ITEMS, ...secondary];

  const switcher = (
    <CompetitionSwitcher
      competitions={competitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        status: competition.status,
      }))}
      currentId={active?.id ?? null}
    />
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] lg:flex-row lg:gap-8 lg:px-6 lg:py-8">
      {/* Cabecera compacta en móvil */}
      <header className="flex items-center justify-between gap-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            ⬢
          </span>
          <span className="text-base font-black tracking-tight text-white">
            HexaApp
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="min-w-0 max-w-44 flex-1 [&_.label]:sr-only">
            {switcher}
          </div>
          <Link href="/perfil" aria-label="Mi perfil">
            <Avatar
              name={user.displayName}
              color={user.avatarColor}
              image={user.avatarImage}
              size={32}
            />
          </Link>
        </div>
      </header>

      {/* Barra lateral en pantallas grandes */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
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

        <div className="mt-5">{switcher}</div>

        <div className="mt-5 lg:sticky lg:top-6">
          <Nav items={sidebarItems} />
          <form action={logoutAction} className="mt-4">
            <button type="submit" className="btn-ghost btn-sm w-full">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-24 lg:pb-16">{children}</main>

      <MobileTabBar primary={PRIMARY_ITEMS} secondary={secondary} />
    </div>
  );
}
