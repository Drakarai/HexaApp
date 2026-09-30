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
import { NewNoteForm, NoteCard } from "./note-forms";
import { getAcceso } from "@/lib/acceso";
import { Icono } from "@/components/icono";

export const metadata = { title: "Mis notas" };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ sobre?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const { sobre } = await searchParams;
  const [participants, yo, acceso] = await Promise.all([
    getParticipants(competition.id),
    getMyParticipant(competition.id, user.id),
    getAcceso(competition.id),
  ]);

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
          title="No juegas esta edición"
          hint="Las notas son de quien juega el locke; tú lo estás mirando."
        />
      </>
    );
  }

  /**
   * El equipo de la calculadora de tipos. Se pide por participante, igual que
   * las notas: no hay forma de leer el de otro.
   */
  const equipo = yo
    ? await prisma.typeTeam.findUnique({ where: { participantId: yo.id } })
    : null;
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

  // Solo se leen notas cuyo autor es el usuario actual: privacidad total.
  const [notes, counts] = await Promise.all([
    prisma.note.findMany({
      where: {
        competitionId: competition.id,
        authorId: user.id,
        subjectId: scope === "general" ? null : scope,
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.note.groupBy({
      by: ["subjectId"],
      where: { competitionId: competition.id, authorId: user.id },
      _count: { _all: true },
    }),
  ]);

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
        <details className="card group mb-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
            <span className="mr-2 inline-block transition group-open:rotate-90">
              ▸
            </span>
            <Icono emoji="🛡️" /> Cobertura de tipos
            <span className="ml-2 font-normal text-slate-500">
              — monta un equipo de 6 y mira qué le hace daño
            </span>
          </summary>
          <div className="mt-4">
            <CoberturaDeTipos
              generacionDelLocke={
                generacionDeTipos(competition) ?? GENERACION_POR_DEFECTO
              }
              juego={nombreDelJuego(competition.gameId, competition.game, competition.juegoNoOficial)}
              inicial={miEquipo}
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
