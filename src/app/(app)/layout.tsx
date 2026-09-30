import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
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
import { EstadoDeConexion } from "@/components/estado-conexion";
import { Avatar } from "@/components/ui";
import { generacionDelJuego, regionDelJuego } from "@/lib/juegos";
import { getFormatoFinal, NOMBRE_POR_DEFECTO } from "@/lib/final-four";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { APARTADOS_CON_AVISO, getAvisos } from "@/lib/novedades";
import { Logo } from "@/components/logo";
import { Icono } from "@/components/icono";
import { COMPETITION_STATUS } from "@/lib/constants";
import { GritosDelLocke } from "@/components/gritos-del-locke";

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
  sorteo: { href: "/sorteo", label: "Sorteo de préstamos", icon: "🎁" },
  finalFour: { href: "/final-four", label: "Final Four", icon: "🏆" },
  hall: { href: "/hall-de-la-fama", label: "Hall de la fama", icon: "🏅" },
  // En un Soul Link, el equipo y la caja de todos, con sus vínculos; en los
  // demás lockes, los tuyos y privados (ver `equipo`, en "Lo mío")
  soulLink: { href: "/equipo", label: "Equipo y PC", icon: "🔗" },
  equipo: { href: "/equipo", label: "Equipo y PC", icon: "📦" },
  // Va con las ediciones y no con los combates: no es de este locke, es de
  // todos los que esa persona puede abrir
  palmares: { href: "/palmares", label: "Palmarés", icon: "👑" },
  actividad: { href: "/actividad", label: "Actividad", icon: "📰" },
  reglas: { href: "/reglas", label: "Reglas", icon: "📜" },
  levelCaps: { href: "/level-caps", label: "Level caps", icon: "🎯" },
  bolsa: { href: "/bolsa", label: "Bolsa", icon: "🎒" },
  mapa: { href: "/mapa", label: "Mapa de capturas", icon: "🗺️" },
  notas: { href: "/notas", label: "Mis notas", icon: "🗒️" },
  perfil: { href: "/perfil", label: "Mi perfil", icon: "👤" },
  guia: { href: "/guia", label: "Guía de uso", icon: "❓" },
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
    children: [S.jornadas, S.retos, S.sorteo, S.ruleta, S.finalFour, S.hall],
  },
  {
    label: "La edición",
    icon: "📚",
    children: [S.puntos, S.caja, S.actividad, S.levelCaps, S.reglas, S.palmares],
  },
  {
    label: "Lo mío",
    icon: "👤",
    personal: true,
    // La guía va la última y **no se cae nunca**: es de la aplicación, no del
    // locke, así que la ve igual quien juega, quien mira y quien acaba de
    // entrar sin saber dónde se aprieta
    children: [S.mapa, S.bolsa, S.notas, S.perfil, S.guia],
  },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * La cuenta, los lockes y el activo **a la vez**: los dos últimos ya no
   * esperan a la cuenta (ver `getActiveCompetition`). Van con `cache()`, así
   * que la página, que los pide también, se encuentra estos mismos en marcha.
   */
  const [user, competitions, active] = await Promise.all([
    requireUser(),
    listCompetitions(),
    getActiveCompetition(),
  ]);

  /**
   * Lo que hace falta para el botón de apuntar, el punto de novedades y los
   * rótulos del menú. Sin edición activa no hace falta nada de esto.
   *
   * **Las cuatro de una vez.** Ninguna necesita a las otras, y pedidas en fila
   * eran tres idas y vueltas en **todas** las pantallas, que esto es el layout:
   * contra una base de datos en internet, eso es lo que se paga.
   *
   * El nombre del final sale de la tercera: no siempre se llama igual —"Final
   * Four" de cuatro jugadores para arriba y "Jornada Final" de tres para
   * abajo—, y el menú tiene que decir lo mismo que la pantalla.
   */
  const [yo, formatoFinal, puedeGestionar, avisos] = active
    ? await Promise.all([
        getMyParticipant(active.id, user.id),
        getFormatoFinal(active.id),
        canManageCompetition(active.id, user),
        getAvisos({
          userId: user.id,
          competitionId: active.id,
          esAdmin: esCreador(user),
        }),
      ])
    : [null, null, false, {} as Record<string, boolean>];
  /** Sin locke, el palmarés solo sale si hay algún locke de antes con esta persona */
  const tienePalmares =
    !active &&
    (await prisma.lockeDeAntes.count({ where: { jugadoresIds: { has: user.id } } })) > 0;
  /** Para cuánta gente se montó este locke: de ahí salen sus rótulos */
  const perfil = perfilDeLocke(active?.maxPlayers ?? 6, active?.estilo);

  /**
   * Los atajos de apuntar: solo los que esa persona puede usar de verdad. Un
   * administrador que no juega registra bajas de otros, pero no tiene mapa ni
   * gimnasios propios que marcar.
   */
  const atajos: AtajoDeApunte[] = [];
  /**
   * Una edición archivada es de solo lectura para quien no la administra (ver
   * assertEdicionAbierta): sin atajos de apuntar, y con un aviso arriba para
   * que se note antes de rellenar nada.
   */
  const archivadaParaMi =
    active?.status === COMPETITION_STATUS.ARCHIVED && !puedeGestionar;
  if (archivadaParaMi) {
    // nada que apuntar
  } else if (active && (yo || puedeGestionar)) {
    atajos.push({
      href: "/muertes?apuntar=1",
      icon: "💀",
      label: "Registrar una baja",
      hint: "Se abre el formulario de la Caja",
    });
  }
  if (!archivadaParaMi && yo && regionDelJuego(active?.gameId)) {
    atajos.push({
      href: "/mapa?apuntar=1",
      icon: "🗺️",
      label: "Apuntar una captura",
      hint: "Busca la ruta y apunta lo que salió",
    });
  } else if (!archivadaParaMi && yo) {
    // Sin mapa (un fangame desde cero), las capturas se apuntan en Equipo y PC
    atajos.push({
      href: "/equipo?apuntar=1",
      icon: perfil.cooperativo ? "🔗" : "📦",
      label: "Apuntar una captura",
      hint: perfil.cooperativo
        ? "Va a tu equipo o a tu caja, y se vincula por la ruta"
        : "Va a tu equipo o a tu caja",
    });
  }
  if (!archivadaParaMi && yo) {
    atajos.push({
      href: "/level-caps?apuntar=1",
      icon: "🎯",
      label: "Marcar un gimnasio",
      hint: "Te lleva al que te toca",
    });
  }

  /**
   * **Ediciones, Administración y Diagnóstico no salen en el menú**: viven
   * dentro de *Mi perfil*, a un toque del avatar de arriba.
   *
   * Es lo que hacía ya el diagnóstico y se extendió a los otros dos: son
   * pantallas de gestionar, se abren de uvas a peras, y al final de "La
   * edición" la dejaban en ocho entradas. Lo de todos los días —clasificación,
   * caja, actividad, level caps, reglas— no tiene por qué compartir sitio con
   * lo de montar el tinglado.
   */
  const finalConSuNombre: NavItem = {
    ...S.finalFour,
    label: formatoFinal?.nombre ?? NOMBRE_POR_DEFECTO,
  };

  /**
   * El mapa, la bolsa y las notas son de **tu** ficha de jugador, así que a
   * quien no juega esta edición —un espectador, o un administrador que solo
   * mira— no le llevan a ninguna parte: se quedan fuera y en "Lo mío" queda su
   * cuenta, que sí es suya.
   */
  const grupos: NavGroup[] = !active
    ? /**
       * **Sin ningún locke, el menú se queda en lo que sirve**: antes salían
       * Combates y La edición con doce pantallas, y todas decían lo mismo, que
       * ahí no había nada tuyo. Queda tu cuenta, Ediciones —que es donde se
       * pide un locke— y la guía; el palmarés, solo si jugaste alguno de antes
       * de la aplicación. En cuanto te apunten a uno, vuelve todo solo.
       */
      [
        {
          ...GRUPOS[GRUPOS.length - 1],
          children: [
            S.perfil,
            S.ediciones,
            ...(tienePalmares ? [S.palmares] : []),
            S.guia,
          ],
        },
      ]
    : GRUPOS.flatMap((grupo) =>
    grupo.label === "Combates"
      ? /**
         * En solitario el grupo entero desaparece: no hay jornadas, ni retos,
         * ni final. La ruleta y la bolsa tampoco se quedan —la bolsa la llenan
         * los administradores con premios de combates y sortearse cosas a uno
         * mismo no aporta—, así que lo único que se salva es el hall de la
         * fama, y se muda a "La edición" en vez de dejar un grupo con un
         * enlace suelto.
         */
        perfil.enSolitario
        ? []
        : perfil.cooperativo
        ? /**
           * En un Soul Link no se compite: fuera jornadas y final. Se quedan los
           * retos, por si se quiere echar alguno de risas, el sorteo y la
           * ruleta; el hall se muda a "La edición", como en solitario.
           */
          [
            {
              ...grupo,
              children: [S.retos, S.sorteo, S.ruleta],
            },
          ]
        : [
            {
              ...grupo,
              children: grupo.children.map((item) =>
                item.href === S.finalFour.href ? finalConSuNombre : item,
              ),
            },
          ]
      : grupo.label === "La edición"
      ? [
          {
            ...grupo,
            children: [
              // En un Soul Link, lo primero es el equipo y la caja de todos
              ...(perfil.cooperativo ? [S.soulLink] : []),
              // En un locke de dos, "Puntos" es en realidad el marcador de
              // jornadas ganadas: el menú tiene que decir lo mismo que la
              // pantalla. Y sin jornadas no hay clasificación que enseñar.
              ...grupo.children
                .filter(
                  (item) => !(perfil.sinJornadas && item.href === S.puntos.href),
                )
                .map((item) =>
                  item.href === S.puntos.href
                    ? { ...item, label: perfil.rotuloDeLaTabla }
                    : item,
                ),
              ...(perfil.sinJornadas ? [S.hall] : []),
            ],
          },
        ]
      : grupo.label === "Lo mío"
      ? [
          {
            ...grupo,
            children: !yo
              ? [S.perfil, S.guia]
              : // La bolsa es de los premios que se reparten en un locke de
                // varios: en solitario no la llena nadie. Y el equipo y la
                // caja van aquí, al lado del mapa, cuando son privados: en
                // un Soul Link están en "La edición", a la vista de todos
                grupo.children.flatMap((item) =>
                  perfil.enSolitario && item.href === S.bolsa.href
                    ? []
                    : item.href === S.mapa.href && !perfil.cooperativo
                      ? [item, S.equipo]
                      : [item],
                ),
          },
        ]
      : [grupo],
  );
  const sidebarItems: NavEntry[] = [...PRIMARY_ITEMS, ...grupos];

  /**
   * Qué eres **en este locke**, que no siempre es lo que eres en la aplicación:
   * una cuenta normal que solo tiene acceso de mirar es "Espectador" aquí
   * aunque su rol sea el de jugador de siempre.
   */
  const comoEstoyAqui = esCreador(user)
    ? "Administrador"
    : !active
    ? "Sin locke todavía"
    : active && !yo
    ? "Espectador"
    : "Jugador";

  /**
   * De qué grupo es cada dirección. Se saca del propio menú para que una
   * sección nueva entre sola en el aviso de novedades con solo aparecer ahí.
   */
  const rutasDeGrupo = Object.fromEntries(
    grupos.flatMap((grupo) =>
      grupo.children.map((item) => [item.href, grupo.label]),
    ),
  );

  /**
   * Las pantallas que se dejan guardadas para poder verlas sin cobertura: las
   * del menú de cada uno, que son las suyas. Sale de aquí y no de una lista
   * aparte para que una sección nueva entre sola.
   */
  const rutasParaGuardar = [
    "/",
    ...Object.keys(rutasDeGrupo),
    /**
     * Ediciones va aparte porque ya no está en el menú: es de donde sale la
     * lista de quién juega, y sin ella se dejaba de guardar para verla sin
     * conexión, que es un paso atrás que nadie pidió.
     */
    S.ediciones.href,
  ];

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
          <Logo id="logo-movil" tamano={26} />
          <span className="logo text-base font-black tracking-tight text-white">
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
            <Logo id="logo-pc" tamano={30} />
            <span className="logo text-lg font-black tracking-tight text-white">
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

      {/**
       * El hueco de abajo cuenta con la barra de pestañas **y con el botón de
       * apuntar**, que sobresale por encima de ella: con el `pb-24` de antes
       * el botón se comía la última fila de la pantalla.
       */}
      <main className="min-w-0 flex-1 pb-32 lg:pb-16">
        {/* Los gritos clásicos van con los juegos que los tenían: hasta la 5ª */}
        <GritosDelLocke clasicos={(generacionDelJuego(active?.gameId) ?? 99) <= 5} />
        {archivadaParaMi ? (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <Icono emoji="🗄️" className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              <strong className="text-white">{active?.name} está archivada.</strong>{" "}
              Se puede mirar entera, pero ya no se apunta nada. Para jugar, cambia
              de edición en el selector de arriba.
            </p>
          </div>
        ) : null}
        {children}
      </main>

      <EstadoDeConexion rutas={rutasParaGuardar} />

      <BotonApuntar atajos={atajos} />

      <MobileTabBar
        primary={PRIMARY_ITEMS}
        groups={grupos}
        avisos={avisos}
        atajos={atajos}
        user={{
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          avatarImage: user.avatarImage,
          subtitle: `@${user.username} · ${comoEstoyAqui}`,
        }}
      />

      <MarcarVisto
        rutas={rutasDeGrupo}
        apartados={APARTADOS_CON_AVISO}
        avisos={avisos}
      />
    </div>
  );
}
