import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import { canManageCompetition, getActiveCompetition, getMyParticipant, soloLectura } from "@/lib/competition";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { findSpecies } from "@/lib/pokedex";
import { urlDeContenido } from "@/lib/imagen-url";
import { esPokemonAnil } from "@/lib/anil-basico";
import { asegurarBonoProdigioso, bonosProdigiososDe, prodigiosoDelLocke } from "@/lib/prodigioso-servidor";
import type { CapturaParaElegir } from "@/lib/gts-servidor";
import { PanelDelProdigioso, type ProdigiosoHecho } from "./prodigioso-client";

export const metadata = { title: "Intercambio Prodigioso" };

/**
 * **El Intercambio Prodigioso**: das uno de tu caja y te llega uno al azar.
 * Las reglas, en lib/prodigioso.ts; lo que lo hace, en actions/prodigioso.ts.
 */
export default async function ProdigiosoPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [puedeGestionar, yo] = await Promise.all([
    canManageCompetition(competition.id, user),
    getMyParticipant(competition.id, user.id),
  ]);
  const cabecera = (
    <PageHeader
      title="Intercambio Prodigioso"
      subtitle="Das uno de tu caja y te llega otro al azar, al mismo nivel. No se sabe qué hasta que sale de la ball."
    />
  );
  const volver = (
    <Link href="/intercambios" className="mt-4 inline-block text-sm text-slate-400 hover:underline">
      ← Intercambios
    </Link>
  );
  const estado = prodigiosoDelLocke(competition);
  if (!estado.abierto) {
    return (
      <>
        {cabecera}
        <EmptyState
          title={estado.enObras ? "En obras" : "Cerrado en este locke"}
          hint={
            estado.enObras
              ? estado.porQue
              : puedeGestionar
                ? "Se enciende en Ediciones → Editar datos de la competición."
                : "Quien administra el locke puede encenderlo."
          }
        />
        {volver}
      </>
    );
  }

  const juego = yo && !yo.retiredAt && !soloLectura(competition, puedeGestionar) ? yo : null;
  if (!juego) {
    return (
      <>
        {cabecera}
        <EmptyState title="Solo para quien juega" hint="El Intercambio Prodigioso es con tu propia caja." />
        {volver}
      </>
    );
  }

  await asegurarBonoProdigioso();
  const conAnil = esPokemonAnil(competition);
  const [bonos, capturas, hechos] = await Promise.all([
    bonosProdigiososDe(competition.id, juego.id),
    prisma.capture.findMany({
      where: { participantId: juego.id, failed: false, deathId: null },
      orderBy: [{ lugar: "desc" }, { hueco: "asc" }],
      select: { id: true, species: true, nickname: true, pokemonId: true, shiny: true, image: true, lugar: true },
    }),
    prisma.intercambioProdigioso.findMany({
      where: { participantId: juego.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const misCapturas: CapturaParaElegir[] = capturas.map((c) => ({
    id: c.id,
    especie: c.species,
    mote: c.nickname,
    pokemonId: c.pokemonId,
    dex: findSpecies(c.species, conAnil)?.dex ?? null,
    shiny: c.shiny,
    imagen: c.image?.startsWith("ref:") ? urlDeContenido(c.image) : null,
    enElEquipo: c.lugar === "equipo",
  }));

  return (
    <>
      {cabecera}
      <PanelDelProdigioso
        participantId={juego.id}
        bonos={{ porJornadas: bonos.porJornadas, enLaBolsa: bonos.enLaBolsa }}
        modo={{
          porBst: competition.prodigiosoPorBst,
          legendarios: competition.prodigiosoLegendarios,
          porNivel: competition.prodigiosoPorNivel,
        }}
        capturas={misCapturas}
        hechos={hechos.map((h) => ({
          id: h.id,
          fecha: h.createdAt.toISOString(),
          sale: h.sale as ProdigiosoHecho["sale"],
          llega: h.llega as ProdigiosoHecho["llega"],
        }))}
      />
      {volver}
    </>
  );
}
