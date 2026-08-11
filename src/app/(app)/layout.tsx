import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition, listCompetitions } from "@/lib/competition";
import { logoutAction } from "@/app/actions/auth";
import { CompetitionSwitcher } from "@/components/competition-switcher";
import { Nav, type NavEntry, type NavGroup, type NavItem } from "@/components/nav";
import { MobileTabBar } from "@/components/mobile-nav";
import { Avatar } from "@/components/ui";
import { ROLES } from "@/lib/constants";

/**
 * Las secciones, escritas una sola vez. La barra lateral y el menú del móvil
 * enseñan exactamente lo mismo y en el mismo orden; lo único que cambia es la
 * forma (una columna que se despliega frente a una hoja que sube). Así no se
 * puede añadir una sección en un sitio y olvidarla en el otro.
 */
const S = {
  resumen: { href: "/", label: "Resumen", icon: "🏠" },
  caja: { href: "/muertes", label: "Caja", icon: "💀" },
  puntos: { href: "/puntos", label: "Puntos", icon: "🏆" },
  ruleta: { href: "/ruleta", label: "Ruleta", icon: "🎡" },
  jornadas: { href: "/jornadas", label: "Jornadas", icon: "📅" },
  retos: { href: "/retos", label: "Retos", icon: "🔥" },
  finalFour: { href: "/final-four", label: "Final Four", icon: "🏆" },
  hall: { href: "/hall-de-la-fama", label: "Hall de la fama", icon: "🏅" },
  actividad: { href: "/actividad", label: "Actividad", icon: "📰" },
  reglas: { href: "/reglas", label: "Reglas", icon: "📜" },
  levelCaps: { href: "/level-caps", label: "Level caps", icon: "🎯" },
  notas: { href: "/notas", label: "Mis notas", icon: "🗒️" },
  perfil: { href: "/perfil", label: "Mi perfil", icon: "👤" },
  ediciones: { href: "/competiciones", label: "Ediciones", icon: "🗂️" },
  admin: { href: "/admin", label: "Administración", icon: "⚙️" },
} satisfies Record<string, NavItem>;

/**
 * Lo que se abre todos los días, siempre a la vista: son las pestañas de abajo
 * en el móvil y los primeros enlaces de la barra lateral en el PC.
 */
const PRIMARY_ITEMS: NavItem[] = [S.resumen, S.caja, S.puntos, S.ruleta];

/**
 * El resto, por grupos. El orden es el de la pregunta que trae a cada uno:
 * "qué se ha jugado", "cómo va la edición", "lo mío" y, al final, lo de
 * gestionar, que se toca de uvas a peras.
 */
const GRUPOS: NavGroup[] = [
  {
    label: "Combates",
    icon: "⚔️",
    children: [S.jornadas, S.retos, S.finalFour, S.hall],
  },
  {
    label: "La edición",
    icon: "📚",
    children: [S.reglas, S.levelCaps, S.actividad],
  },
  { label: "Lo mío", icon: "👤", children: [S.notas, S.perfil] },
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

  // El diagnóstico no ocupa sitio en la navegación: vive dentro de Mi perfil,
  // que es donde se busca cuando algo va raro y no todos los días.
  const gestion: NavItem[] = isAdmin(user)
    ? [S.ediciones, S.admin]
    : [S.ediciones];

  const grupos: NavGroup[] = [
    ...GRUPOS,
    { label: "Gestión", icon: "🗂️", children: gestion },
  ];
  const sidebarItems: NavEntry[] = [...PRIMARY_ITEMS, ...grupos];

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

      <MobileTabBar
        primary={PRIMARY_ITEMS}
        groups={grupos}
        user={{
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          avatarImage: user.avatarImage,
          subtitle: `@${user.username} · ${
            user.role === ROLES.ADMIN ? "Administrador" : "Jugador"
          }`,
        }}
      />
    </div>
  );
}
