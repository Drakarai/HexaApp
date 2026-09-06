import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  listCompetitions,
} from "@/lib/competition";
import { logoutAction } from "@/app/actions/auth";
import { CompetitionSwitcher } from "@/components/competition-switcher";
import { Nav, type NavEntry, type NavGroup, type NavItem } from "@/components/nav";
import { MobileTabBar } from "@/components/mobile-nav";
import { BotonApuntar, type AtajoDeApunte } from "@/components/boton-apuntar";
import { MarcarVisto } from "@/components/marcar-visto";
import { Avatar } from "@/components/ui";
import { ROLES } from "@/lib/constants";
import { regionDelJuego } from "@/lib/juegos";
import { getFormatoFinal, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
import { getAvisos } from "@/lib/novedades";

/**
 * Las secciones, escritas una sola vez. La barra lateral y el menú del móvil
 * enseñan exactamente lo mismo y en el mismo orden; lo único que cambia es la
 * forma (una columna que se despliega frente a una hoja que sube). Así no se
 * puede añadir una sección en un sitio y olvidarla en el otro.
 */
const S = {
  resumen: { href: "/", label: "Resumen", icon: "🏠" },
  caja: { href: "/muertes", label: "Caja", icon: "💀" },
  // 📊 y no 🏆 desde que la clasificación lleva su gráfico: el trofeo se lo
  // queda la Final Four, que es la que reparte de verdad
  puntos: { href: "/puntos", label: "Puntos", icon: "📊" },
  ruleta: { href: "/ruleta", label: "Ruleta", icon: "🎡" },
  jornadas: { href: "/jornadas", label: "Jornadas", icon: "📅" },
  retos: { href: "/retos", label: "Retos", icon: "🔥" },
  finalFour: { href: "/final-four", label: "Final Four", icon: "🏆" },
  hall: { href: "/hall-de-la-fama", label: "Hall de la fama", icon: "🏅" },
  actividad: { href: "/actividad", label: "Actividad", icon: "📰" },
  reglas: { href: "/reglas", label: "Reglas", icon: "📜" },
  levelCaps: { href: "/level-caps", label: "Level caps", icon: "🎯" },
  bolsa: { href: "/bolsa", label: "Bolsa", icon: "🎒" },
  mapa: { href: "/mapa", label: "Mapa de capturas", icon: "🗺️" },
  notas: { href: "/notas", label: "Mis notas", icon: "🗒️" },
  perfil: { href: "/perfil", label: "Mi perfil", icon: "👤" },
  ediciones: { href: "/competiciones", label: "Ediciones", icon: "🗂️" },
  admin: { href: "/admin", label: "Administración", icon: "⚙️" },
} satisfies Record<string, NavItem>;

/**
 * Lo único suelto: el resumen. Es la pestaña de la izquierda en el móvil y el
 * primer enlace de la barra lateral en el PC.
 */
const PRIMARY_ITEMS: NavItem[] = [S.resumen];

/**
 * Todo lo demás, en tres grupos, y **cada grupo es una pestaña**: ya no hay un
 * cajón de "Más" con lo que sobra. Dentro de cada uno, primero lo que más se
 * abre.
 */
const GRUPOS: NavGroup[] = [
  {
    label: "Combates",
    icon: "⚔️",
    children: [S.jornadas, S.retos, S.ruleta, S.finalFour, S.hall],
  },
  {
    label: "La edición",
    icon: "📚",
    children: [S.puntos, S.caja, S.actividad, S.levelCaps, S.reglas],
  },
  {
    label: "Lo mío",
    icon: "👤",
    personal: true,
    children: [S.mapa, S.bolsa, S.notas, S.perfil],
  },
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

  /**
   * Lo que hace falta para el botón de apuntar y el punto de novedades: quién
   * es uno en esta edición y si puede tocar cosas de los demás. Sin edición
   * activa no hay ni una cosa ni la otra.
   */
  const yo = active ? await getMyParticipant(active.id, user.id) : null;
  /**
   * El final del locke no siempre se llama igual: "Final Four" de cuatro
   * jugadores para arriba y "Jornada Final" de tres para abajo. El menú tiene
   * que decir lo mismo que la pantalla.
   */
  const formatoFinal = active ? await getFormatoFinal(active.id) : null;
  const [puedeGestionar, avisos] = active
    ? await Promise.all([
        canManageCompetition(active.id, user),
        getAvisos({
          userId: user.id,
          competitionId: active.id,
          participantId: yo?.id ?? null,
        }),
      ])
    : [false, {} as Record<string, boolean>];

  /**
   * Los atajos de apuntar: solo los que esa persona puede usar de verdad. Un
   * administrador que no juega registra bajas de otros, pero no tiene mapa ni
   * gimnasios propios que marcar.
   */
  const atajos: AtajoDeApunte[] = [];
  if (active && (yo || puedeGestionar)) {
    atajos.push({
      href: "/muertes?apuntar=1",
      icon: "💀",
      label: "Registrar una baja",
      hint: "Se abre el formulario de la Caja",
    });
  }
  if (yo && regionDelJuego(active?.gameId)) {
    atajos.push({
      href: "/mapa?apuntar=1",
      icon: "🗺️",
      label: "Apuntar una captura",
      hint: "Busca la ruta y apunta lo que salió",
    });
  }
  if (yo) {
    atajos.push({
      href: "/level-caps?apuntar=1",
      icon: "🎯",
      label: "Marcar un gimnasio",
      hint: "Te lleva al que te toca",
    });
  }

  /**
   * Ediciones y Administración van al final de "La edición": son de gestionar,
   * se tocan de uvas a peras y no merecen una pestaña propia. El diagnóstico no
   * está en ninguna: vive dentro de Mi perfil.
   */
  const finalConSuNombre: NavItem = {
    ...S.finalFour,
    label: formatoFinal?.nombre ?? NOMBRE_POR_DEFECTO,
  };

  const grupos: NavGroup[] = GRUPOS.map((grupo) =>
    grupo.label === "Combates"
      ? {
          ...grupo,
          children: grupo.children.map((item) =>
            item.href === S.finalFour.href ? finalConSuNombre : item,
          ),
        }
      : grupo.label === "La edición"
      ? {
          ...grupo,
          children: [
            ...grupo.children,
            S.ediciones,
            ...(isAdmin(user) ? [S.admin] : []),
          ],
        }
      : grupo,
  );
  const sidebarItems: NavEntry[] = [...PRIMARY_ITEMS, ...grupos];

  /**
   * De qué grupo es cada dirección. Se saca del propio menú para que una
   * sección nueva entre sola en el aviso de novedades con solo aparecer ahí.
   */
  const rutasDeGrupo = Object.fromEntries(
    grupos.flatMap((grupo) =>
      grupo.children.map((item) => [item.href, grupo.label]),
    ),
  );

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
          <Nav items={sidebarItems} avisos={avisos} />
          <form action={logoutAction} className="mt-4">
            <button type="submit" className="btn-ghost btn-sm w-full">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-24 lg:pb-16">{children}</main>

      <BotonApuntar atajos={atajos} />

      <MobileTabBar
        primary={PRIMARY_ITEMS}
        groups={grupos}
        avisos={avisos}
        user={{
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          avatarImage: user.avatarImage,
          subtitle: `@${user.username} · ${
            user.role === ROLES.ADMIN ? "Administrador" : "Jugador"
          }`,
        }}
      />

      <MarcarVisto rutas={rutasDeGrupo} avisos={avisos} />
    </div>
  );
}
