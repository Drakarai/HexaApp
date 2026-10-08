import { esCreador, requireUser } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  soloLectura,
} from "@/lib/competition";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { AceBadge } from "@/components/ace-badge";
import { FavoritesGrid, type Favorito } from "@/components/favorites-grid";
import { firmaDeColumna } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui";
import { RepararLaAplicacion } from "@/components/service-worker";
import { logoutAction } from "@/app/actions/auth";
import { ProfileForms } from "./profile-forms";
import { ThemePicker } from "./theme-picker";
import { getEstilo } from "@/lib/estilo";
import { cambiarEstiloAction } from "@/app/actions/estilo";
import { cx } from "@/lib/utils";
import { getTitulosDeUsuario } from "@/lib/titulos";
import { TitleBadge } from "@/components/title-badge";
import { TitlesSection } from "@/components/titles-section";
import { findSpecies } from "@/lib/pokedex";
import { PreferenciaDeBips, PreferenciaDeGritosPicker } from "./gritos";
import { PreferenciaDeSpritesPicker } from "./sprites";
import { InterruptorDelCompanero } from "./companero";
import { COOKIE_DEL_COMPANERO } from "@/lib/companero";
import { Icono } from "@/components/icono";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { MarcaPokeBall } from "@/components/marca-poke-ball";
import { Atajo, MenuDeSecciones, seccionActiva } from "@/components/menu-de-secciones";

export const metadata = { title: "Mi perfil" };

/**
 * **Mi perfil**, en dos partes:
 *
 * - Arriba, la **ficha de entrenador**, como la de los juegos: quién eres, tu
 *   título, tu as y cuatro cifras. Es lo que se viene a mirar.
 * - Debajo, **pestañas**: tu locke (as, compañero y favoritos), títulos,
 *   personalizar (tema, aspecto, sprites y sonido) y la cuenta (datos,
 *   contraseña, gestionar y reparar). Antes eran diez tarjetas seguidas y en
 *   el móvil el perfil medía casi cinco mil píxeles.
 *
 * Cada pestaña es una dirección (`?seccion=`), como en Diagnóstico: se puede
 * volver atrás o recargar y se queda donde estaba, y guardar algo no te saca
 * de ella.
 */
type Seccion = "locke" | "titulos" | "personalizar" | "cuenta";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const user = await requireUser();
  /**
   * En dos tandas y no en ocho: antes cada dato esperaba al anterior aunque no
   * lo necesitara (las dos imágenes del as, una detrás de otra; los títulos, al
   * final de todo). Lo tuyo del locke (el as y los favoritos) se busca por tu
   * cuenta dentro de él, sin esperar a saber qué participante eres.
   */
  const [estilo, competition, titulos, lockesJugados, { seccion: pedida }] = await Promise.all([
    getEstilo(),
    getActiveCompetition(),
    getTitulosDeUsuario(user.id),
    prisma.participant.count({ where: { userId: user.id } }),
    searchParams,
  ]);
  const tuyo = competition ? { competitionId: competition.id, userId: user.id } : null;
  const [myParticipant, gestiona, firmasAs, favoritos, firmasFavoritos] = tuyo
    ? await Promise.all([
        getMyParticipant(tuyo.competitionId, user.id),
        canManageCompetition(tuyo.competitionId, user),
        prisma.$queryRaw<{ id: string; va: string | null; vb: string | null }[]>`
          select "id",
                 ${firmaDeColumna(`"aceImage"`)} as va,
                 ${firmaDeColumna(`"aceDetailImage"`)} as vb
          from "Participant"
          where "competitionId" = ${tuyo.competitionId} and "userId" = ${user.id}
        `,
        prisma.favoritePokemon.findMany({
          where: { participant: tuyo },
          orderBy: { position: "asc" },
        }),
        prisma.$queryRaw<{ id: string; v: string | null }[]>`
          select f."id", ${firmaDeColumna(`f."image"`)} as v
          from "FavoritePokemon" f join "Participant" p on p."id" = f."participantId"
          where p."competitionId" = ${tuyo.competitionId} and p."userId" = ${user.id}
        `,
      ])
    : [null, false, [], [], []];
  const companeroPuesto = (await cookies()).get(COOKIE_DEL_COMPANERO)?.value !== "no";
  // Archivada y sin administrarla: el as y los favoritos de esa edición se ven
  // pero se quedan como estaban
  const cerrada = competition ? soloLectura(competition, gestiona) : false;

  // Las imágenes del as y de cada favorito, que ya no viajan dentro de la página
  const miAs = myParticipant
    ? {
        image: urlDeImagen("as", myParticipant.id, firmasAs[0]?.va),
        detailImage: urlDeImagen("as-ficha", myParticipant.id, firmasAs[0]?.vb),
      }
    : { image: null, detailImage: null };
  const firmaDeFavorito = new Map(firmasFavoritos.map((fila) => [fila.id, fila.v]));
  const spritesFavoritos = (id: string) => urlDeImagen("favorito", id, firmaDeFavorito.get(id));
  const tituloPuesto = titulos.find((titulo) => titulo.equipped) ?? null;
  // De muestra en sprites y sonido, tu as si lo tienes; si no, el de siempre
  const dexDelAs = (myParticipant?.aceSpecies && findSpecies(myParticipant.aceSpecies)?.dex) || null;

  const misFavoritos: Favorito[] = favoritos.map((favorito) => ({
    id: favorito.id,
    species: favorito.species,
    nickname: favorito.nickname,
    image: spritesFavoritos(favorito.id),
  }));

  const papel = esCreador(user)
    ? "Creador"
    : !competition
      ? "Sin locke todavía"
      : myParticipant
        ? "Jugador"
        : "Espectador";

  const secciones: { valor: Seccion; rotulo: string; icono: string; cuenta?: number }[] = [
    // Sin ficha en el locke no hay as ni favoritos que tocar
    ...(myParticipant ? [{ valor: "locke" as const, rotulo: "Tu locke", icono: "🎮" }] : []),
    { valor: "titulos", rotulo: "Títulos", icono: "🏅", cuenta: titulos.length },
    { valor: "personalizar", rotulo: "Personalizar", icono: "🎨" },
    { valor: "cuenta", rotulo: "Cuenta", icono: "🔑" },
  ];
  const activa = seccionActiva(secciones, pedida);

  return (
    <>
      <PageHeader title="Mi perfil" />

      <FichaDeEntrenador
        userId={user.id}
        nombre={user.displayName}
        usuario={user.username}
        papel={papel}
        avatar={{ color: user.avatarColor, image: user.avatarImage }}
        titulo={tituloPuesto}
        as={
          myParticipant?.aceSpecies
            ? {
                nombre: myParticipant.aceNickname ?? myParticipant.aceSpecies,
                especie: myParticipant.aceSpecies,
                imagen: miAs.image,
                pokemonId: dexDelAs,
              }
            : null
        }
        cifras={[
          { valor: lockesJugados, rotulo: lockesJugados === 1 ? "locke" : "lockes" },
          { valor: titulos.length, rotulo: titulos.length === 1 ? "título" : "títulos" },
          ...(myParticipant
            ? [{ valor: misFavoritos.length, rotulo: misFavoritos.length === 1 ? "favorito" : "favoritos" }]
            : []),
        ]}
        perfilPublico={myParticipant ? `/jugador/${myParticipant.id}` : null}
      />

      <MenuDeSecciones ruta="/perfil" secciones={secciones} activa={activa} etiqueta="Partes de tu perfil" />

      {activa === "locke" && myParticipant && competition ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="card">
            <h2 className="section-title mb-1">Tu pokémon as</h2>
            <p className="muted mb-4">
              Tu representante en {competition.name}, elegido de tu Equipo y PC: si evoluciona o le
              cambias el mote, tu as también.
            </p>
            <div className="flex items-center gap-4">
              <AceBadge
                size={64}
                showEmpty
                ace={{
                  participantId: myParticipant.id,
                  playerName: myParticipant.displayName,
                  color: myParticipant.color,
                  species: myParticipant.aceSpecies,
                  nickname: myParticipant.aceNickname,
                  reason: myParticipant.aceReason,
                  image: miAs.image,
                  detailImage: miAs.detailImage,
                  editable: !cerrada,
                }}
              />
              <p className="text-sm text-slate-400">
                {cerrada
                  ? "La edición está archivada: se queda como estaba."
                  : myParticipant.aceSpecies
                    ? `${myParticipant.aceNickname ?? myParticipant.aceSpecies} · tócalo para cambiarlo`
                    : "Toca el hueco para elegirlo"}
              </p>
            </div>
            <InterruptorDelCompanero puesto={companeroPuesto} cookie={COOKIE_DEL_COMPANERO} />
          </section>

          <section className="card">
            <h2 className="section-title mb-1">Pokémon favoritos</h2>
            <p className="muted mb-4">
              Los que te han hecho el locke, vivos o muertos. Caben seis y los ve todo el mundo en tu
              perfil público.
            </p>
            <FavoritesGrid participantId={myParticipant.id} favoritos={misFavoritos} editable={!cerrada} />
          </section>
        </div>
      ) : null}

      {activa === "titulos" ? <TitlesSection userId={user.id} titulos={titulos} editable propio /> : null}

      {activa === "personalizar" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="card">
            <h2 className="section-title mb-1">Tema</h2>
            <p className="muted mb-4">Un color por juego. Toca cualquiera para verlo al momento.</p>
            <ThemePicker current={user.theme} />
          </section>

          <section className="card">
            <h2 className="section-title mb-1">Aspecto</h2>
            <p className="muted mb-4">Letras, tarjetas e iconos. Solo en este dispositivo.</p>
            <form action={cambiarEstiloAction} className="grid gap-3 sm:grid-cols-2">
              <BotonDeAspecto
                valor="nuevo"
                actual={estilo}
                nombre="Actual"
                detalle="Letras de marcador, superficies planas e iconos de línea."
              />
              <BotonDeAspecto
                valor="clasico"
                actual={estilo}
                nombre="Clásico"
                detalle="Tarjetas redondeadas, brillos y emojis."
              />
            </form>
          </section>

          <section className="card">
            <h2 className="section-title mb-1">Sprites</h2>
            <p className="muted mb-4">
              Cómo se ven los pokémon en cajas, equipos y listas; en su ficha, siempre los de Blanco y
              Negro, que se mueven. Solo en este dispositivo.
            </p>
            <PreferenciaDeSpritesPicker muestra={dexDelAs || 25} />
            <p className="mt-3 text-xs text-slate-500">
              Los animados de la 6ª generación en adelante y los iconos que no son de Espada y Escudo
              son de la comunidad de Pokémon Essentials.
            </p>
          </section>

          <section className="card">
            <h2 className="section-title mb-1">Sonido</h2>
            <p className="muted mb-4">
              Los gritos al abrir una ficha, al evolucionar y al caer. Con el móvil en silencio no
              suena nada.
            </p>
            <PreferenciaDeGritosPicker muestra={dexDelAs || 25} />
            <PreferenciaDeBips />
          </section>
        </div>
      ) : null}

      {activa === "cuenta" ? (
        <div className="space-y-4">
          <ProfileForms
            displayName={user.displayName}
            avatarColor={user.avatarColor}
            avatarImage={user.avatarImage}
            sinLocke={!competition}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {/**
             * Las pantallas de gestionar viven aquí, a un toque del avatar, y **no
             * en el menú**: se abren de uvas a peras y al final de "La edición" la
             * dejaban en ocho entradas.
             */}
            <section className="card">
              <h2 className="section-title mb-1">Gestionar</h2>
              <p className="muted mb-4">Lo que se toca de vez en cuando.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Atajo
                  href="/competiciones"
                  icono="🗂️"
                  nombre="Ediciones"
                  detalle={
                    esCreador(user)
                      ? "Los jugadores y los ajustes de cada locke."
                      : competition
                        ? "Quién juega cada locke, y cambiar de uno a otro."
                        : "Pedir tu locke y ver cómo va la petición."
                  }
                />
                {esCreador(user) ? (
                  <>
                    <Atajo
                      href="/admin"
                      icono="⚙️"
                      nombre="Administración"
                      detalle="Mapas, catálogo, cuentas y copias: lo de toda la app."
                    />
                    <Atajo
                      href="/diagnostico"
                      icono="🩺"
                      nombre="Diagnóstico"
                      detalle="Cuánto ocupa la base de datos, errores y registro de cambios."
                    />
                  </>
                ) : null}
              </div>
            </section>

            <section className="card">
              {/* El recuadro ya dice qué hace: aquí sobra repetirlo */}
              <h2 className="section-title mb-3">Cuando algo va mal</h2>
              <RepararLaAplicacion />
            </section>
          </div>

          <form action={logoutAction}>
            <button type="submit" className="btn-ghost w-full border-red-500/30 text-red-300 hover:border-red-500/60 sm:w-auto">
              <Icono emoji="🚪" /> Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

/** El número de entrenador de la ficha: sale de la cuenta, siempre el mismo, como el ID de los juegos */
function numeroDeEntrenador(id: string) {
  let h = 0;
  for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return String(h % 100000).padStart(5, "0");
}

/**
 * La **ficha de entrenador**, como la tarjeta de los juegos: tu foto, tu nombre
 * con tu título, tu número de entrenador y tu as a la derecha, y abajo tus
 * cifras. Va teñida del color de tu tema, con una Poké Ball de marca de agua.
 */
function FichaDeEntrenador({
  userId,
  nombre,
  usuario,
  papel,
  avatar,
  titulo,
  as,
  cifras,
  perfilPublico,
}: {
  userId: string;
  nombre: string;
  usuario: string;
  papel: string;
  avatar: { color: string; image: string | null };
  titulo: Parameters<typeof TitleBadge>[0]["titulo"] | null;
  as: { nombre: string; especie: string; imagen: string | null; pokemonId: number | null } | null;
  cifras: { valor: number; rotulo: string }[];
  perfilPublico: string | null;
}) {
  return (
    <section className="ficha-de-entrenador relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6">
      <MarcaPokeBall />

      <div className="relative flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
        <span>Ficha de entrenador</span>
        <span className="tabular-nums text-slate-400">ID Nº {numeroDeEntrenador(userId)}</span>
      </div>

      <div className="relative mt-4 flex items-center gap-4">
        <div className="flex shrink-0 rounded-full p-1 ring-2 ring-brand-500/50">
          <Avatar name={nombre} color={avatar.color} image={avatar.image} size={72} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-[Barlow_Condensed] text-3xl font-bold uppercase leading-none tracking-wide text-white">
            {nombre}
          </p>
          {titulo ? (
            <p className="mt-1.5">
              <TitleBadge titulo={titulo} />
            </p>
          ) : null}
          <p className="mt-1.5 text-sm text-slate-400">
            @{usuario} · <span className="text-slate-300">{papel}</span>
          </p>
        </div>
        {as ? (
          <div className="hidden shrink-0 flex-col items-center rounded-xl border border-white/10 bg-black/20 px-3 py-2 sm:flex">
            <SpritePokemon
              src={as.imagen}
              pokemonId={as.pokemonId}
              alt={as.especie}
              className="h-16 w-16 object-contain"
            />
            <span className="mt-1 max-w-24 truncate text-xs font-semibold text-white">{as.nombre}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Tu as</span>
          </div>
        ) : null}
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-2">
        {cifras.map((cifra) => (
          <span
            key={cifra.rotulo}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-slate-300"
          >
            <strong className="mr-1 tabular-nums text-white">{cifra.valor}</strong>
            {cifra.rotulo}
          </span>
        ))}
        {as ? (
          // En el móvil el as no cabe a la derecha: va con las cifras
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 py-0.5 pl-1 pr-3 text-sm text-slate-300 sm:hidden">
            <SpritePokemon src={as.imagen} pokemonId={as.pokemonId} alt={as.especie} className="h-7 w-7 object-contain" />
            <strong className="text-white">{as.nombre}</strong>
          </span>
        ) : null}
        {perfilPublico ? (
          <Link href={perfilPublico} className="ml-auto text-sm text-brand-400 hover:underline">
            Ver mi perfil público →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Una de las dos opciones de aspecto. Cada una se enseña **con su propia
 * pinta** —la muestra de arriba lleva la tipografía y las esquinas de ese
 * aspecto—, porque "clásico" y "nuevo" escritos no dicen nada.
 */
function BotonDeAspecto({
  valor,
  actual,
  nombre,
  detalle,
}: {
  valor: "clasico" | "nuevo";
  actual: string;
  nombre: string;
  detalle: string;
}) {
  const elegido = actual === valor;
  return (
    <button
      type="submit"
      name="estilo"
      value={valor}
      aria-pressed={elegido}
      className={cx(
        "rounded-xl border p-3 text-left transition",
        elegido
          ? "border-brand-500/60 bg-brand-600/15"
          : "border-white/10 bg-white/[0.03] hover:border-white/20",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "mb-3 flex h-16 items-end justify-between border px-3 pb-2",
          valor === "clasico"
            ? "rounded-2xl border-white/10 bg-gradient-to-br from-indigo-500/25 to-emerald-500/10 font-sans text-2xl font-black text-white"
            : "rounded-md border-white/15 bg-[#141418] font-[Barlow_Condensed] text-3xl font-bold uppercase tracking-wide text-white",
        )}
      >
        {valor === "clasico" ? "Aa ✨" : "AA 01"}
        <span
          className={cx(
            "mb-1 h-2 w-8",
            valor === "clasico" ? "rounded-full bg-indigo-400" : "rounded-sm bg-brand-500",
          )}
        />
      </span>
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
        {nombre}
        {elegido ? <span className="text-xs font-medium text-brand-400">✓ En uso</span> : null}
      </span>
      <span className="mt-0.5 block text-xs text-slate-400">{detalle}</span>
    </button>
  );
}
