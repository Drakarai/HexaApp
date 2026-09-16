import { esCreador, requireUser } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { AceBadge } from "@/components/ace-badge";
import { FavoritesGrid, type Favorito } from "@/components/favorites-grid";
import { urlsDeImagen } from "@/lib/imagenes";
import { firmaDeImagen } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui";
import { RepararLaAplicacion } from "@/components/service-worker";
import { logoutAction } from "@/app/actions/auth";
import { ROLES } from "@/lib/constants";
import { ProfileForms } from "./profile-forms";
import { ThemePicker } from "./theme-picker";
import { getTitulosDeUsuario } from "@/lib/titulos";
import { TitleBadge } from "@/components/title-badge";
import { TitlesSection } from "@/components/titles-section";

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  const myParticipant = competition
    ? await getMyParticipant(competition.id, user.id)
    : null;

  // Direcciones de las imágenes del as, que ya no viajan dentro de la página
  const miAs = myParticipant
    ? {
        image: urlDeImagen(
          "as",
          myParticipant.id,
          await firmaDeImagen("as", myParticipant.id),
        ),
        detailImage: urlDeImagen(
          "as-ficha",
          myParticipant.id,
          await firmaDeImagen("as-ficha", myParticipant.id),
        ),
      }
    : { image: null, detailImage: null };

  // Los favoritos de esta edición, con la dirección de cada sprite
  const favoritos = myParticipant
    ? await prisma.favoritePokemon.findMany({
        where: { participantId: myParticipant.id },
        orderBy: { position: "asc" },
      })
    : [];
  const spritesFavoritos = await urlsDeImagen(
    "favorito",
    favoritos.map((favorito) => favorito.id),
  );
  const titulos = await getTitulosDeUsuario(user.id);
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
            {esCreador(user) ? "Creador" : "Jugador"}
          </p>
        </div>
      </div>

      <ProfileForms
        displayName={user.displayName}
        avatarColor={user.avatarColor}
        avatarImage={user.avatarImage}
      />

      {myParticipant && competition ? (
        <section className="card mt-4">
          <h2 className="section-title mb-1">Tu pokémon as</h2>
          <p className="muted mb-4">
            Tu representante en {competition.name}. Se ve en la clasificación y
            en tu cementerio; al pincharlo se abre su ficha.
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
              editable: true,
            }}
          />
          <p className="mt-2 text-xs text-slate-500">
            {myParticipant.aceSpecies
              ? `${myParticipant.aceNickname ?? myParticipant.aceSpecies} · pincha para cambiarlo`
              : "Pincha en el hueco para elegirlo"}
          </p>
        </section>
      ) : null}

      {myParticipant ? (
        <section className="card mt-4">
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
            editable
          />
        </section>
      ) : null}

      <div className="mt-4">
        <TitlesSection userId={user.id} titulos={titulos} editable propio />
      </div>

      <section className="card mt-4">
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
      <section className="card mt-4">
        <h2 className="section-title mb-1">Gestionar</h2>
        <p className="muted mb-4">
          Lo que se toca de vez en cuando. No está en el menú de abajo para no
          llenarlo: se llega desde aquí, tocando tu foto.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/competiciones" className="btn-ghost">
            🗂️ Ediciones
          </Link>
          {esCreador(user) ? (
            <>
              <Link href="/admin" className="btn-ghost">
                ⚙️ Administración
              </Link>
              <Link href="/diagnostico" className="btn-ghost">
                🩺 Diagnóstico
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
            En <strong>Ediciones</strong> ves quién juega cada locke y puedes
            cambiar de uno a otro.
          </p>
        )}
      </section>

      <section className="card mt-4">
        <h2 className="section-title mb-1">Cuando algo va mal</h2>
        <p className="muted mb-4">
          La aplicación guarda pantallas en el móvil para poder verlas sin
          conexión. Si alguna vez se hace un lío —se queda en blanco, no cambia
          de pantalla o enseña cosas de ayer—, esto lo tira todo y empieza de
          cero.
        </p>
        <RepararLaAplicacion />
      </section>

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="btn-ghost">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
