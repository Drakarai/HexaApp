import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { puedeVerLocke } from "@/lib/acceso";
import {
  canManageCompetition,
  getActiveCompetition,
  getStandings,
} from "@/lib/competition";
import { urlsDeImagen } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui";
import { AceBadge } from "@/components/ace-badge";
import { FavoritesGrid, type Favorito } from "@/components/favorites-grid";
import { HeadToHead } from "@/components/head-to-head";
import { getResumenDeCombates } from "@/lib/cara-a-cara";
import { getTitulosDeUsuario } from "@/lib/titulos";
import { TitleBadge } from "@/components/title-badge";
import { TitlesSection } from "@/components/titles-section";
import { comoEstaFuera } from "@/lib/wipeos";
import { Wipeos } from "./wipeos-client";
import { cx, formatDate } from "@/lib/utils";

export const metadata = { title: "Jugador" };

/** Cuántas bajas se enseñan antes de mandar al cementerio completo. */
const BAJAS_VISIBLES = 12;

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: { competition: { select: { id: true, name: true } } },
  });
  if (!participant) notFound();

  /**
   * A un perfil se llega por su identificador, sin pasar por la edición activa,
   * así que aquí hay que volver a preguntar si esa persona puede ver ese locke.
   * Sale un 404 y no un "no puedes": quien no tiene acceso tampoco tiene por
   * qué enterarse de que ese jugador existe.
   */
  if (!(await puedeVerLocke(participant.competitionId))) notFound();

  const competitionId = participant.competitionId;
  const [canManage, standings, deaths, clears, capsTotales, favoritos, wipeos] =
    await Promise.all([
      canManageCompetition(competitionId, user),
      getStandings(competitionId),
      prisma.death.findMany({
        where: { participantId: id },
        orderBy: [{ diedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.gymClear.count({ where: { participantId: id } }),
      prisma.levelCap.count({ where: { competitionId } }),
      prisma.favoritePokemon.findMany({
        where: { participantId: id },
        orderBy: { position: "asc" },
      }),
      prisma.wipeo.findMany({
        where: { participantId: id },
        orderBy: [{ ocurridoAt: "desc" }, { createdAt: "desc" }],
      }),
    ]);

  const fila = standings.find((row) => row.participantId === id);
  const combates = await getResumenDeCombates(competitionId, id);
  const esMio = participant.userId === user.id;
  const editable = esMio || canManage;

  // Los títulos son de la persona, no del participante: la siguen de una
  // edición a otra
  const titulos = await getTitulosDeUsuario(participant.userId);
  const tituloPuesto = titulos.find((titulo) => titulo.equipped) ?? null;

  // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts
  const [sprites, spritesFavoritos] = await Promise.all([
    urlsDeImagen(
      "baja",
      deaths.map((baja) => baja.id),
    ),
    urlsDeImagen(
      "favorito",
      favoritos.map((favorito) => favorito.id),
    ),
  ]);

  const misFavoritos: Favorito[] = favoritos.map((favorito) => ({
    id: favorito.id,
    species: favorito.species,
    nickname: favorito.nickname,
    image: spritesFavoritos(favorito.id),
  }));

  const activa = await getActiveCompetition();
  const esOtraEdicion = activa?.id !== competitionId;

  return (
    <>
      <PageHeader
        title={participant.displayName}
        subtitle={[
          participant.gameVersion,
          esOtraEdicion ? participant.competition.name : null,
          participant.isAdmin ? "Administrador de la edición" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {/* Cabecera con la foto grande y las cifras del jugador */}
      <section className="card mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            name={participant.displayName}
            color={participant.color}
            image={fila?.avatarImage ?? null}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h2 className="section-title">
              {participant.displayName}
              {comoEstaFuera(participant) ? (
                <span
                  className={cx(
                    "ml-2 align-middle text-xs font-semibold uppercase tracking-wide",
                    comoEstaFuera(participant)!.color,
                  )}
                  title={comoEstaFuera(participant)!.largo}
                >
                  {comoEstaFuera(participant)!.icono}{" "}
                  {comoEstaFuera(participant)!.etiqueta}
                </span>
              ) : null}
            </h2>
            {tituloPuesto ? (
              <p className="mt-0.5">
                <TitleBadge titulo={tituloPuesto} />
              </p>
            ) : null}
            <p className="muted mt-0.5">
              {fila
                ? `${fila.position}º de la clasificación`
                : "Fuera de la clasificación"}
            </p>
          </div>
          {fila?.ace.species ? (
            <div className="text-center">
              <AceBadge
                size={56}
                ace={{
                  participantId: id,
                  playerName: participant.displayName,
                  color: participant.color,
                  species: fila.ace.species,
                  nickname: fila.ace.nickname,
                  reason: fila.ace.reason,
                  image: fila.ace.image,
                  detailImage: fila.ace.detailImage,
                  editable,
                }}
              />
              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                Su as
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 items-start gap-2 sm:grid-cols-4">
          <Cifra valor={fila?.points ?? 0} etiqueta="Puntos" />
          <Cifra valor={deaths.length} etiqueta="Caídos" />
          <HeadToHead
            wins={combates.wins}
            losses={combates.losses}
            rivales={combates.rivales}
            presa={combates.presa}
            bestiaNegra={combates.bestiaNegra}
          />
          <Cifra
            valor={`${clears}/${capsTotales}`}
            etiqueta="Gimnasios superados"
          />
        </div>
      </section>

      <Wipeos
        participantId={id}
        nombre={participant.displayName}
        editable={editable}
        wipeos={wipeos.map((wipeo) => ({
          id: wipeo.id,
          ocurridoAt: formatDate(wipeo.ocurridoAt),
          contra: wipeo.contra,
          notas: wipeo.notas,
        }))}
      />

      <section className="card mb-4">
        <h2 className="section-title mb-1">Pokémon favoritos</h2>
        <p className="muted mb-4">
          {editable
            ? "Los que te han hecho el locke, vivos o muertos. Caben seis."
            : `Los pokémon del locke de ${participant.displayName}.`}
        </p>
        <FavoritesGrid
          participantId={id}
          favoritos={misFavoritos}
          editable={editable}
        />
      </section>

      <div className="mb-4">
        <TitlesSection
          userId={participant.userId}
          titulos={titulos}
          editable={editable}
          propio={esMio}
          nombre={participant.displayName}
        />
      </div>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Su cementerio</h2>
          <Link
            href={`/muertes?jugador=${id}`}
            className="text-xs text-brand-400 hover:underline"
          >
            Ver la caja completa →
          </Link>
        </div>

        {deaths.length === 0 ? (
          <p className="muted">Todavía no ha perdido a nadie. Qué suerte.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {deaths.slice(0, BAJAS_VISIBLES).map((baja) => (
              <li
                key={baja.id}
                title={`${baja.nickname ?? baja.species} · ${formatDate(baja.diedAt)}`}
                className="min-w-0 rounded-xl border border-white/5 bg-white/[0.03] p-1.5"
              >
                <div className="flex h-14 items-center justify-center">
                  {sprites(baja.id) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sprites(baja.id)!}
                      alt={baja.nickname ?? baja.species}
                      loading="lazy"
                      // En blanco y negro: son los caídos
                      className="h-full w-full object-contain opacity-80 grayscale"
                    />
                  ) : (
                    <span className="text-lg opacity-30" aria-hidden>
                      💀
                    </span>
                  )}
                </div>
                <p className="truncate text-center text-[11px] text-slate-400">
                  {baja.nickname ?? baja.species}
                </p>
              </li>
            ))}
          </ul>
        )}

        {deaths.length > BAJAS_VISIBLES ? (
          <p className="muted mt-3">
            Y {deaths.length - BAJAS_VISIBLES} más en la caja.
          </p>
        ) : null}
      </section>
    </>
  );
}

function Cifra({
  valor,
  etiqueta,
}: {
  valor: string | number;
  etiqueta: string;
}) {
  return (
    <div className={cx("rounded-xl border border-white/5 bg-white/[0.03] p-3")}>
      <p className="text-xl font-bold text-white tabular-nums">{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>
    </div>
  );
}
