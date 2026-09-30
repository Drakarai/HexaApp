import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
  soloLectura,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { cx, formatDate, toDateInputValue } from "@/lib/utils";
import { firmasDeDosImagenes } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { getZonasMasMortiferas, getZonasParaElegir } from "@/lib/mapas";
import { regionesDelJuego } from "@/lib/juegos";
import { colorDeZona } from "@/lib/zonas";
import { NewDeathForm } from "./death-form";
import { DeathBox, type BoxDeath } from "./death-box";

export const metadata = { title: "Cementerio" };

/**
 * Cuántas casillas se pintan de una tanda **por jugador**. La caja no se trae
 * entera: cada baja arrastra su ficha (mote, causa, notas, dos direcciones de
 * imagen…) hasta el navegador, y con la edición avanzada eso era una página que
 * crecía sola sin tope. Se piden de 60 en 60.
 *
 * Por jugador y no en total **a propósito**: cuando el tope era global, las 60
 * más recientes de todo el locke se repartían como cayera y al que más bajas
 * llevaba le faltaban casillas al final de su caja, sin avisar.
 */
const POR_TANDA = 60;

export default async function DeathsPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string; ver?: string; apuntar?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const { jugador, ver, apuntar } = await searchParams;
  // Con tope, para que nadie se cargue la página poniendo ?ver=999999 a mano
  const cuantas = Math.min(
    Math.max(Number(ver) || POR_TANDA, POR_TANDA),
    POR_TANDA * 20,
  );
  // De las más nuevas a las más viejas, que es el orden en el que se corta la
  // tanda: lo que acaba de pasar es lo que se quiere ver al entrar.
  const deLaMasNueva: Prisma.DeathOrderByWithRelationInput[] = [
    { diedAt: "desc" },
    { createdAt: "desc" },
  ];
  /** Primero solo quién y cuándo, que pesa nada, para saber **qué** casillas entran */
  const ordenDe = (soloDe?: string) =>
    prisma.death.findMany({
      where: { participant: { competitionId: competition.id, ...(soloDe ? { id: soloDe } : {}) } },
      orderBy: deLaMasNueva,
      select: { id: true, participantId: true },
    });

  /**
   * Todo lo que no depende de nada, **a la vez**. Antes las bajas esperaban a
   * tener los jugadores (solo para comprobar el `?jugador=`), luego se pedían
   * sus fichas y luego las firmas de sus imágenes: ocho idas y vueltas en fila
   * contra la base de datos, y ahora son cuatro. El filtro por jugador se usa
   * tal cual y se comprueba después (ver abajo).
   */
  // Todas las regiones del juego: en la 2ª generación se muere igual en Kanto
  const [canManage, participants, zonas, mortiferas, ordenPedido, counts] =
    await Promise.all([
      canManageCompetition(competition.id, user),
      getParticipants(competition.id),
      getZonasParaElegir(regionesDelJuego(competition.gameId)),
      getZonasMasMortiferas(competition.id),
      ordenDe(jugador),
      prisma.death.groupBy({
        by: ["participantId"],
        where: { participant: { competitionId: competition.id } },
        _count: { _all: true },
      }),
    ]);
  const nombreDeZona = new Map(zonas.map((zona) => [zona.id, zona.label]));
  const myParticipantId = participants.find((p) => p.userId === user.id)?.id ?? null;

  /**
   * Los pokémon vivos de la caja que se pueden dar por muertos desde aquí. En
   * un Soul Link, los de todos si administras (como en Equipo y PC); en los
   * demás lockes, **solo los tuyos**: la caja es privada y esta lista no puede
   * enseñarle a nadie lo que llevan los demás.
   */
  const deQuien =
    competition.estilo === "soullink" && canManage
      ? participants.map((p) => p.id)
      : myParticipantId
        ? [myParticipantId]
        : [];
  const pedirCapturasQueCaen = async () => {
    if (!deQuien.length) return [];
    const capturas = await prisma.capture.findMany({
      where: { participantId: { in: deQuien }, failed: false, deathId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        participantId: true,
        species: true,
        nickname: true,
        sitio: true,
        zone: { select: { name: true } },
      },
    });
    return capturas.map((c) => {
      const sitio = c.zone?.name ?? c.sitio;
      return {
        id: c.id,
        participantId: c.participantId,
        rotulo: `${c.nickname ? `${c.nickname} (${c.species})` : c.species}${sitio ? ` · ${sitio}` : ""}`,
      };
    });
  };

  const selected = participants.find((participant) => participant.id === jugador);
  const myParticipant = participants.find(
    (participant) => participant.userId === user.id,
  );

  // Un `?jugador=` que no es de este locke no filtra nada, como siempre: en
  // ese caso raro se vuelven a pedir todas
  const orden = jugador && !selected ? await ordenDe() : ordenPedido;

  // La tanda se corta por jugador: cada caja se llena hasta el tope con las
  // suyas, sin que las bajas de uno le quiten sitio a las de otro.
  const llevaPuestas = new Map<string, number>();
  const losDeLaTanda = orden
    .filter((baja) => {
      const van = llevaPuestas.get(baja.participantId) ?? 0;
      llevaPuestas.set(baja.participantId, van + 1);
      return van < cuantas;
    })
    .map((baja) => baja.id);

  const quedanMas = counts.some((row) => {
    if (selected && row.participantId !== selected.id) return false;
    return row._count._all > cuantas;
  });

  /**
   * Las fichas de la tanda, las firmas de sus dos imágenes y las capturas que
   * se pueden dar por muertas, a la vez: ya se sabe qué bajas son.
   *
   * Sin `include` del participante: los 6 jugadores ya están cargados arriba
   * y repetirlos en cada baja multiplicaba el peso de la página.
   */
  const [deLaMasNuevaALaMasVieja, [firmasCaja, firmasFicha], capturasQueCaen] =
    await Promise.all([
      prisma.death.findMany({
        where: { id: { in: losDeLaTanda } },
        orderBy: deLaMasNueva,
      }),
      // Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts
      firmasDeDosImagenes("baja", "baja-ficha", losDeLaTanda),
      pedirCapturasQueCaen(),
    ]);
  // Y se leen de la más antigua a la más nueva, como siempre
  const deaths = deLaMasNuevaALaMasVieja.reverse();
  const cajas = (id: string) => urlDeImagen("baja", id, firmasCaja.get(id));
  const fichas = (id: string) => urlDeImagen("baja-ficha", id, firmasFicha.get(id));
  const porId = new Map(participants.map((p) => [p.id, p]));

  const countFor = (participantId: string) =>
    counts.find((row) => row.participantId === participantId)?._count._all ?? 0;
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  /** Cuántas quedan sin pintar, sumando lo que le falta a cada caja */
  const faltan = counts.reduce((sum, row) => {
    if (selected && row.participantId !== selected.id) return sum;
    return sum + Math.max(0, row._count._all - cuantas);
  }, 0);

  // Archivada y sin administrarla: la caja se mira, pero no se toca
  const cerrada = soloLectura(competition, canManage);
  const esMio = (participantId: string) =>
    !cerrada && (canManage || porId.get(participantId)?.userId === user.id);

  const fichaDeJugador = (participantId: string) => {
    const jugador = porId.get(participantId)!;
    return {
      id: jugador.id,
      displayName: jugador.displayName,
      color: jugador.color,
      avatarImage: jugador.user.avatarImage,
      // Las que lleva **de verdad**, no las que caben en la tanda: la chapa
      // contaba las casillas pintadas y decía 10 cuando eran 12
      bajas: countFor(jugador.id),
      ace: {
        species: jugador.aceSpecies,
        nickname: jugador.aceNickname,
        reason: jugador.aceReason,
        image: jugador.aceImage,
        detailImage: jugador.aceDetailImage,
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

      {/* Escrita a mano, una baja no sabe de vínculos: la pareja no cae sola */}
      {competition.estilo === "soullink" ? (
        <p className="mb-5 rounded-xl border border-brand-400/30 bg-brand-600/10 px-3 py-2 text-sm text-slate-300">
          En un Soul Link, al registrar una baja elige el pokémon <strong>de la caja</strong>:
          así cae también su pareja y se puede deshacer desde{" "}
          <Link href="/equipo" className="text-brand-300 hover:underline">
            Equipo y PC
          </Link>
          .
        </p>
      ) : null}

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

      {participants.length && !cerrada && (myParticipant || canManage) ? (
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
            capturas={capturasQueCaen}
            enSoulLink={competition.estilo === "soullink"}
            abiertoDeEntrada={apuntar === "1"}
          />
        </div>
      ) : null}

      {boxDeaths.length === 0 ? (
        <EmptyState
          dibujo="lapida"
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
            {faltan ? ` · quedan ${faltan}` : ""}
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
