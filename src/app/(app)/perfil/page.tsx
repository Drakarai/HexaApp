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

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  /**
   * En dos tandas y no en ocho: antes cada dato esperaba al anterior aunque no
   * lo necesitara (las dos imágenes del as, una detrás de otra; los títulos, al
   * final de todo). Lo tuyo del locke (el as y los favoritos) se busca por tu
   * cuenta dentro de él, sin esperar a saber qué participante eres.
   */
  const [estilo, competition, titulos] = await Promise.all([
    getEstilo(),
    getActiveCompetition(),
    getTitulosDeUsuario(user.id),
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

  const misFavoritos: Favorito[] = favoritos.map((favorito) => ({
    id: favorito.id,
    species: favorito.species,
    nickname: favorito.nickname,
    image: spritesFavoritos(favorito.id),
  }));

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
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{user.displayName}</p>
          {tituloPuesto ? (
            <p className="mt-0.5">
              <TitleBadge titulo={tituloPuesto} />
            </p>
          ) : null}
          <p className="muted mt-0.5">
            @{user.username} ·{" "}
            {/* Lo mismo que dice el menú de Lo mío: qué eres aquí ahora */}
            {esCreador(user)
              ? "Creador"
              : !competition
                ? "Sin locke todavía"
                : myParticipant
                  ? "Jugador"
                  : "Espectador"}
          </p>
        </div>
      </div>

      <ProfileForms
        displayName={user.displayName}
        avatarColor={user.avatarColor}
        avatarImage={user.avatarImage}
        sinLocke={!competition}
      />

      {/* En pantalla ancha, de dos en dos: son seis tarjetas cortas y en una
          sola columna el perfil medía dos mil quinientos píxeles */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {myParticipant && competition ? (
        <section className="card">
          <h2 className="section-title mb-1">Tu pokémon as</h2>
          <p className="muted mb-4">
            Tu representante en {competition.name}, elegido de tu Equipo y PC:
            si evoluciona o le cambias el mote, tu as también. Se ve en la
            clasificación y en tu cementerio; al pincharlo se abre su ficha.
          </p>
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
          <p className="mt-2 text-xs text-slate-500">
            {cerrada
              ? "La edición está archivada: se queda como estaba."
              : myParticipant.aceSpecies
                ? `${myParticipant.aceNickname ?? myParticipant.aceSpecies} · pincha para cambiarlo`
                : "Pincha en el hueco para elegirlo"}
          </p>
          <InterruptorDelCompanero
            puesto={companeroPuesto}
            cookie={COOKIE_DEL_COMPANERO}
          />
        </section>
      ) : null}

      {myParticipant ? (
        <section className="card">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="section-title">Pokémon favoritos</h2>
            <Link
              href={`/jugador/${myParticipant.id}`}
              className="text-xs text-brand-400 hover:underline"
            >
              Ver mi perfil público →
            </Link>
          </div>
          <p className="muted mb-4">
            Los que te han hecho el locke, vivos o muertos. Caben seis y los ve
            todo el mundo.
          </p>
          <FavoritesGrid
            participantId={myParticipant.id}
            favoritos={misFavoritos}
            editable={!cerrada}
          />
        </section>
      ) : null}

      <div className="mt-4">
        <TitlesSection userId={user.id} titulos={titulos} editable propio />
      </div>

      <section className="card">
        <h2 className="section-title mb-1">Aspecto</h2>
        <p className="muted mb-4">
          La forma de la aplicación: letras, tarjetas e iconos. Solo cambia en
          este dispositivo.
        </p>
        <form action={cambiarEstiloAction} className="grid gap-3 sm:grid-cols-2">
          <BotonDeAspecto
            valor="nuevo"
            actual={estilo}
            nombre="Actual"
            detalle="El de ahora: letras de marcador, superficies planas e iconos de línea."
          />
          <BotonDeAspecto
            valor="clasico"
            actual={estilo}
            nombre="Clásico"
            detalle="El de antes: tarjetas redondeadas, brillos y emojis."
          />
        </form>
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Sprites</h2>
        <p className="muted mb-4">
          Cómo se ven los pokémon en cajas, equipos y listas. En la ficha de
          cada uno salen siempre los de Blanco y Negro, que se mueven. Solo
          cambia en este dispositivo.
          <span className="mt-1 block text-xs text-slate-500">
            Los animados de la 6ª generación en adelante y los iconos que no son
            de Espada y Escudo son de la comunidad de Pokémon Essentials.
          </span>
        </p>
        <PreferenciaDeSpritesPicker
          muestra={(myParticipant?.aceSpecies && findSpecies(myParticipant.aceSpecies)?.dex) || 25}
        />
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Sonido</h2>
        <p className="muted mb-4">
          Los pokémon gritan al abrir su ficha, al evolucionar y al caer. Solo
          cambia en este dispositivo, y con el móvil en silencio no suena nada.
        </p>
        <PreferenciaDeGritosPicker
          muestra={
            // De muestra, tu as si lo tienes; si no, el de siempre
            (myParticipant?.aceSpecies && findSpecies(myParticipant.aceSpecies)?.dex) || 25
          }
        />
        <PreferenciaDeBips />
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Tema</h2>
        <p className="muted mb-4">
          Un color por juego. Pincha en cualquiera para verlo al momento.
        </p>
        <ThemePicker current={user.theme} />
      </section>

      {/**
       * Las pantallas de gestionar viven aquí, a un toque del avatar, y **no en
       * el menú**: se abren de uvas a peras y al final de "La edición" la
       * dejaban en ocho entradas. Lo de todos los días no tiene por qué
       * compartir sitio con lo de montar el tinglado.
       */}
      <section className="card">
        <h2 className="section-title mb-1">Gestionar</h2>
        <p className="muted mb-4">
          Lo que se toca de vez en cuando. Ediciones está también en el menú,
          en «Lo mío», y al lado del selector de lockes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/competiciones" className="btn-ghost">
            <Icono emoji="🗂️" /> Ediciones
          </Link>
          {esCreador(user) ? (
            <>
              <Link href="/admin" className="btn-ghost">
                <Icono emoji="⚙️" /> Administración
              </Link>
              <Link href="/diagnostico" className="btn-ghost">
                <Icono emoji="🩺" /> Diagnóstico
              </Link>
            </>
          ) : null}
        </div>
        {esCreador(user) ? (
          <p className="muted mt-3 text-xs">
            En <strong>Ediciones</strong> están los jugadores y los ajustes de
            cada locke. En <strong>Administración</strong>, lo que vale para
            toda la aplicación: mapas, catálogo, cuentas y copias. El{" "}
            <strong>diagnóstico</strong> dice cuánto ocupa la base de datos y
            cuántos lockes cabrían.
          </p>
        ) : (
          <p className="muted mt-3 text-xs">
            {competition ? (
              <>
                En <strong>Ediciones</strong> ves quién juega cada locke y puedes
                cambiar de uno a otro.
              </>
            ) : (
              // Sin locke, Ediciones es donde se pide uno y se ve cómo va
              <>
                En <strong>Ediciones</strong> pides tu locke y ves cómo va la
                petición.
              </>
            )}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Cuando algo va mal</h2>
        <p className="muted mb-4">
          La aplicación guarda pantallas en el móvil para poder verlas sin
          conexión. Si alguna vez se hace un lío —se queda en blanco, no cambia
          de pantalla o enseña cosas de ayer—, esto lo tira todo y empieza de
          cero.
        </p>
        <RepararLaAplicacion />
      </section>
      </div>

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="btn-ghost">
          Cerrar sesión
        </button>
      </form>
    </>
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
