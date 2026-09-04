import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isAdmin } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { cx, formatDate, toDateInputValue } from "@/lib/utils";
import { urlsDeImagen } from "@/lib/imagenes";
import { getZonasMasMortiferas, getZonasParaElegir } from "@/lib/mapas";
import { regionesDelJuego } from "@/lib/juegos";
import { colorDeZona } from "@/lib/zonas";
import { NewDeathForm } from "./death-form";
import { DeathBox, type BoxDeath } from "./death-box";

export const metadata = { title: "Cementerio" };

/**
 * Cuántas casillas se pintan de una tanda. La caja no se trae entera: cada baja
 * arrastra su ficha (mote, causa, notas, dos direcciones de imagen…) hasta el
 * navegador, y con la edición avanzada eso era una página que crecía sola sin
 * tope. Se piden de 60 en 60.
 */
const POR_TANDA = 60;

export default async function DeathsPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string; ver?: string; apuntar?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const { jugador, ver, apuntar } = await searchParams;
  // Con tope, para que nadie se cargue la página poniendo ?ver=999999 a mano
  const cuantas = Math.min(
    Math.max(Number(ver) || POR_TANDA, POR_TANDA),
    POR_TANDA * 20,
  );
  // Todas las regiones del juego: en la 2ª generación se muere igual en Kanto
  const [canManage, participants, zonas, mortiferas] = await Promise.all([
    canManageCompetition(competition.id, user),
    getParticipants(competition.id),
    getZonasParaElegir(regionesDelJuego(competition.gameId)),
    getZonasMasMortiferas(competition.id),
  ]);
  const nombreDeZona = new Map(zonas.map((zona) => [zona.id, zona.label]));

  const selected = participants.find((participant) => participant.id === jugador);
  const myParticipant = participants.find(
    (participant) => participant.userId === user.id,
  );

  const deathsWhere = {
    participant: {
      competitionId: competition.id,
      ...(selected ? { id: selected.id } : {}),
    },
  };

  const [recientes, counts] = await Promise.all([
    // Sin `include` del participante: los 6 jugadores ya están cargados arriba
    // y repetirlos en cada baja multiplicaba el peso de la página.
    //
    // Se piden **las últimas**, no las primeras: lo que acaba de pasar es lo
    // que se quiere ver al entrar. Una de más para saber si queda alguna fuera.
    prisma.death.findMany({
      where: deathsWhere,
      orderBy: [{ diedAt: "desc" }, { createdAt: "desc" }],
      take: cuantas + 1,
    }),
    prisma.death.groupBy({
      by: ["participantId"],
      where: { participant: { competitionId: competition.id } },
      _count: { _all: true },
    }),
  ]);

  const quedanMas = recientes.length > cuantas;
  // Y se les da la vuelta: la caja se sigue leyendo de la más antigua a la más
  // nueva, como siempre
  const deaths = recientes.slice(0, cuantas).reverse();

  // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts
  const ids = deaths.map((death) => death.id);
  const [cajas, fichas, asesFicha] = await Promise.all([
    urlsDeImagen("baja", ids),
    urlsDeImagen("baja-ficha", ids),
    urlsDeImagen(
      "as-ficha",
      participants.map((participante) => participante.id),
    ),
  ]);
  const porId = new Map(participants.map((p) => [p.id, p]));

  const countFor = (participantId: string) =>
    counts.find((row) => row.participantId === participantId)?._count._all ?? 0;
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  /** Las que hay de lo que se está mirando: la caja entera o la de un jugador */
  const enTotal = selected ? countFor(selected.id) : total;

  const esMio = (participantId: string) =>
    canManage || porId.get(participantId)?.userId === user.id;

  const fichaDeJugador = (participantId: string) => {
    const jugador = porId.get(participantId)!;
    return {
      id: jugador.id,
      displayName: jugador.displayName,
      color: jugador.color,
      avatarImage: jugador.user.avatarImage,
      ace: {
        species: jugador.aceSpecies,
        nickname: jugador.aceNickname,
        reason: jugador.aceReason,
        image: jugador.aceImage,
        detailImage: asesFicha(jugador.id),
        editable: esMio(jugador.id),
      },
    };
  };

  const boxDeaths: BoxDeath[] = deaths.map((death) => ({
    id: death.id,
    species: death.species,
    nickname: death.nickname,
    cause: death.cause,
    level: death.level,
    zoneId: death.zoneId,
    // Manda la zona; lo escrito a mano solo se usa cuando no hay ninguna
    sitio: (death.zoneId ? nombreDeZona.get(death.zoneId) : null) ?? death.location,
    location: death.location,
    notes: death.notes,
    boxImage: cajas(death.id),
    detailImage: fichas(death.id),
    diedAtLabel: formatDate(death.diedAt),
    diedAtInput: toDateInputValue(death.diedAt),
    editable: esMio(death.participantId),
    participant: fichaDeJugador(death.participantId),
  }));

  return (
    <>
      <PageHeader
        title="Cementerio"
        subtitle="La caja de los caídos. Pincha en cualquier casilla para abrir su ficha y ponerle imagen."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/muertes"
          className={cx(
            "chip",
            !selected && "border-brand-500/40 bg-brand-600/20 text-white",
          )}
        >
          Todos ({total})
        </Link>
        {participants.map((participant) => (
          <Link
            key={participant.id}
            href={`/muertes?jugador=${participant.id}`}
            className={cx(
              "chip",
              selected?.id === participant.id &&
                "border-brand-500/40 bg-brand-600/20 text-white",
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: participant.color }}
              aria-hidden
            />
            {participant.displayName} ({countFor(participant.id)})
          </Link>
        ))}
      </div>

      {mortiferas.length ? <RutasMortiferas zonas={mortiferas} /> : null}

      {participants.length && (myParticipant || canManage) ? (
        <div className="mb-6">
          <NewDeathForm
            participants={participants.map((participant) => ({
              id: participant.id,
              displayName: participant.displayName,
            }))}
            defaultParticipantId={
              selected?.id ?? myParticipant?.id ?? participants[0].id
            }
            lockedToParticipantId={canManage ? null : (myParticipant?.id ?? null)}
            zonas={zonas}
            abiertoDeEntrada={apuntar === "1"}
          />
        </div>
      ) : null}

      {boxDeaths.length === 0 ? (
        <EmptyState
          title={
            selected
              ? `${selected.displayName} no ha perdido a nadie`
              : "La caja está vacía"
          }
          hint="De momento todo bien."
        />
      ) : (
        <DeathBox deaths={boxDeaths} grouped={!selected} zonas={zonas} />
      )}

      {quedanMas ? (
        <div className="mt-5 text-center">
          <Link
            href={`/muertes?${new URLSearchParams({
              ...(selected ? { jugador: selected.id } : {}),
              ver: String(cuantas + POR_TANDA),
            })}`}
            className="btn-ghost"
            // Al añadir casillas la página cambia de alto; sin esto el
            // navegador salta al principio y hay que volver a bajar
            scroll={false}
          >
            Ver {POR_TANDA} más antiguas
            {enTotal > cuantas ? ` · quedan ${enTotal - cuantas}` : ""}
          </Link>
        </div>
      ) : null}
    </>
  );
}

/**
 * Dónde se está cebando el locke, sumando las bajas de todos.
 *
 * Sale de que el sitio de la baja se elige del mapa: con el texto libre de
 * antes no había forma de contar esto, porque cada uno escribía la misma ruta
 * de una manera. Solo aparece cuando alguien ha puesto zona a alguna baja.
 */
function RutasMortiferas({
  zonas,
}: {
  zonas: { id: string; name: string; kind: string; bajas: number }[];
}) {
  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
        Dónde cae más gente
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {zonas.map((zona) => (
          <li key={zona.id} className="chip">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: colorDeZona(zona.kind) }}
              aria-hidden
            />
            {zona.name}
            <span className="ml-1 font-bold text-slate-300">{zona.bajas}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
