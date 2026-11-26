import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  getParticipants,
  soloActivos,
  soloLectura,
} from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { sePuedeTenerGts } from "@/lib/gts";
import { getGts, partidaDeLaGts } from "@/lib/gts-servidor";
import { PanelDeLaGts } from "./gts-client";

export const metadata = { title: "GTS" };

/**
 * La GTS del locke: intercambios entre jugadores en la ventana de cada
 * checkpoint de jornada, con boletos. Las reglas, en lib/gts.ts.
 */
export default async function GtsPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [puedeGestionar, yo, participantes] = await Promise.all([
    canManageCompetition(competition.id, user),
    getMyParticipant(competition.id, user.id),
    getParticipants(competition.id),
  ]);

  const cabecera = (
    <PageHeader title="GTS" subtitle="Pon un pokémon, recibe ofertas y elige con cuál te quedas." />
  );
  if (!sePuedeTenerGts(competition) || !competition.gts) {
    return (
      <>
        {cabecera}
        <EmptyState
          title="Este locke no tiene GTS"
          hint={
            !sePuedeTenerGts(competition)
              ? "La GTS es para lockes de tres o más, y no para un Soul Link."
              : puedeGestionar
                ? "Se enciende en Ediciones → Editar datos de la competición."
                : "Quien administra el locke puede encenderla."
          }
        />
      </>
    );
  }

  // Quien ya no juega (fuera del locke) mira, como un espectador
  const juego = yo && !yo.retiredAt && !soloLectura(competition, puedeGestionar) ? yo.id : null;
  const jugadores = soloActivos(participantes).map((p) => ({
    participantId: p.id,
    nombre: p.displayName,
    color: p.color,
  }));
  const gts = await getGts(competition, juego, jugadores);

  return (
    <>
      {cabecera}
      {!gts.momento.hayCheckpoints ? (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          No hay ningún checkpoint de jornada: la GTS no se abre hasta que se marque «Jornada después» en algún level cap.
        </p>
      ) : null}
      <PanelDeLaGts
        yo={juego}
        puedeGestionar={puedeGestionar}
        familia={partidaDeLaGts(competition)}
        ventana={gts.momento.ventana}
        aVista={competition.gtsAVista}
        veto={competition.gtsVeto}
        misBoletos={juego ? (gts.boletos.find((b) => b.participantId === juego)?.quedan ?? 0) : null}
        boletos={gts.boletos}
        depositos={gts.depositos}
        intercambios={gts.intercambios}
        misCapturas={gts.misCapturas}
      />
    </>
  );
}
