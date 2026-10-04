import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition, getParticipants } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { cx, formatDateTime } from "@/lib/utils";
import { CoberturaDeTipos } from "@/components/cobertura-de-tipos";
import type { MiembroDelEquipo } from "@/app/actions/tipos";
import { getMyParticipant } from "@/lib/competition";
import { generacionDeTipos, nombreDelJuego } from "@/lib/juegos";
import { GENERACION_POR_DEFECTO } from "@/lib/tipos";
import { queEs } from "@/lib/evoluciones";
import { NewNoteForm, NoteCard } from "./note-forms";
import { getAcceso } from "@/lib/acceso";
import { Icono } from "@/components/icono";

export const metadata = { title: "Mis notas" };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ sobre?: string; planificar?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const { sobre, planificar } = await searchParams;
  // Solo se leen notas cuyo autor es el usuario actual: privacidad total.
  const mias = (subjectId: string | null) =>
    prisma.note.findMany({
      where: { competitionId: competition.id, authorId: user.id, subjectId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
  const sobreAlguien = sobre && sobre !== "general" ? sobre : null;

  /**
   * **Todo a la vez**: el equipo de la calculadora se busca por tu cuenta en
   * el locke, sin esperar a tu participante, y las notas también. Las de
   * `?sobre=` y las generales van juntas porque hasta tener a los jugadores no
   * se sabe si ese `sobre` es de verdad uno de ellos (si no, se enseñan las
   * generales). Antes eran tres idas y vueltas en fila.
   */
  const [participants, yo, acceso, equipo, notasSobre, notasGenerales, counts, vivos] = await Promise.all([
    getParticipants(competition.id),
    getMyParticipant(competition.id, user.id),
    getAcceso(competition.id),
    /**
     * El equipo de la calculadora de tipos. Se pide por participante, igual
     * que las notas: no hay forma de leer el de otro.
     */
    prisma.typeTeam.findFirst({
      where: { participant: { competitionId: competition.id, userId: user.id } },
    }),
    sobreAlguien ? mias(sobreAlguien) : null,
    mias(null),
    prisma.note.groupBy({
      by: ["subjectId"],
      where: { competitionId: competition.id, authorId: user.id },
      _count: { _all: true },
    }),
    // Lo vivo de tu Equipo y PC, para montar el equipo de la calculadora con ello
    prisma.capture.findMany({
      where: {
        participant: { competitionId: competition.id, userId: user.id },
        failed: false,
        deathId: null,
      },
      orderBy: [{ lugar: "desc" }, { hueco: "asc" }],
      select: { id: true, species: true, nickname: true, pokemonId: true, lugar: true, shiny: true },
    }),
  ]);

  // De la caja a la calculadora: con su número de pokédex para saber sus tipos
  const deMiCaja = vivos.flatMap((c) => {
    const quien = queEs(c.pokemonId, c.species);
    return quien
      ? [{ id: quien.pokemonId, nombre: c.nickname ?? c.species, enEquipo: c.lugar === "equipo", shiny: c.shiny, captura: c.id }]
      : [];
  });

  /**
   * Un espectador mira y no escribe: el servidor ya le rechaza la nota, pero
   * se le enseñaba el formulario entero para luego decirle que no. Como con el
   * mapa y la bolsa, se le dice de entrada.
   */
  if (acceso === "ESPECTADOR") {
    return (
      <>
        <PageHeader
          title="Mis notas"
          subtitle="Cuaderno privado para planear estrategias. Nadie más puede leer estas notas, ni siquiera los administradores."
        />
        <EmptyState
          dibujo="libreta"
          title="No juegas esta edición"
          hint="Las notas son de quien juega el locke; tú lo estás mirando."
        />
      </>
    );
  }

  let miEquipo: MiembroDelEquipo[] = [];
  try {
    // Es JSON escrito por nosotros, pero si alguna vez se corrompe es mejor
    // salir con el equipo vacío que reventar la pantalla de las notas
    const leido = equipo ? JSON.parse(equipo.members) : [];
    if (Array.isArray(leido)) miEquipo = leido;
  } catch {
    miEquipo = [];
  }
  const selected = participants.find((participant) => participant.id === sobre);
  const scope = sobre === "general" || !selected ? "general" : selected.id;

  const notes = scope === "general" ? notasGenerales : (notasSobre ?? []);

  const countFor = (subjectId: string | null) =>
    counts.find((row) => row.subjectId === subjectId)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title="Mis notas"
        subtitle="Cuaderno privado para planear estrategias. Nadie más puede leer estas notas, ni siquiera los administradores."
      />

      {/* Va antes que las notas y plegada: se abre cuando toca planear, y al
          cerrarla el cuaderno vuelve a estar arriba del todo */}
      {yo ? (
        <details id="cobertura" className="card group mb-5" open={planificar !== undefined}>
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
            <span className="mr-2 inline-block transition group-open:rotate-90">
              ▸
            </span>
            <Icono emoji="🛡️" /> Planificar equipo
            <span className="ml-2 font-normal text-slate-500">
              — elige 6 de tu caja y mira qué le hace daño y a qué le pega
            </span>
          </summary>
          <div className="mt-4">
            <CoberturaDeTipos
              generacionDelLocke={
                generacionDeTipos(competition) ?? GENERACION_POR_DEFECTO
              }
              juego={nombreDelJuego(competition.gameId, competition.game, competition.juegoNoOficial)}
              inicial={miEquipo}
              deMiCaja={deMiCaja}
              tablaInicial={equipo?.tabla === "ahora" ? "ahora" : "juego"}
            />
          </div>
        </details>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/notas?sobre=general"
          className={cx(
            "chip",
            scope === "general" && "border-brand-500/40 bg-brand-600/20 text-white",
          )}
        >
          <Icono emoji="📋" /> Generales ({countFor(null)})
        </Link>
        {participants.map((participant) => (
          <Link
            key={participant.id}
            href={`/notas?sobre=${participant.id}`}
            className={cx(
              "chip",
              scope === participant.id &&
                "border-brand-500/40 bg-brand-600/20 text-white",
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: participant.color }}
              aria-hidden
            />
            {participant.displayName}
            {participant.userId === user.id ? " (yo)" : ""} (
            {countFor(participant.id)})
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <NewNoteForm
          competitionId={competition.id}
          subjectId={scope}
          subjectLabel={
            scope === "general"
              ? "notas generales"
              : (selected?.displayName ?? "jugador")
          }
        />
      </div>

      {notes.length === 0 ? (
        <EmptyState
          dibujo="libreta"
          title="Aquí no hay nada escrito todavía"
          hint={
            scope === "general"
              ? "Usa este apartado para ideas de equipo, rutas o recordatorios."
              : `Apunta debilidades, equipos vistos o planes contra ${selected?.displayName ?? "este jugador"}.`
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={{
                id: note.id,
                title: note.title,
                body: note.body,
                pinned: note.pinned,
                updatedLabel: formatDateTime(note.updatedAt),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
