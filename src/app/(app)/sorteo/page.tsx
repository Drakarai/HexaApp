import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getMyParticipant,
  getParticipants,
  soloActivos,
  soloLectura,
} from "@/lib/competition";
import { firmaDeColumna } from "@/lib/imagenes";
import { urlDeImagen } from "@/lib/imagen-url";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { CrearSorteo, Sorteo } from "./sorteo-client";

export const metadata = { title: "Sorteo de préstamos" };

/**
 * El bote de pokémon que se reparte al azar.
 *
 * Nació para las jornadas de **Pokémon de Préstamo** —cada uno echa bichos al
 * bote y la aplicación reparte— pero no cuelga de ninguna jornada a propósito:
 * un sorteo sirve para lo que se quiera, y lo que salga se usa donde haga
 * falta.
 */
export default async function SorteoPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const [canManage, yo, participants, sorteos, firmas] = await Promise.all([
    canManageCompetition(competition.id, user),
    getMyParticipant(competition.id, user.id),
    getParticipants(competition.id),
    prisma.sorteo.findMany({
      where: { competitionId: competition.id },
      orderBy: { createdAt: "desc" },
      include: {
        participantes: { select: { participantId: true } },
        pokemon: { orderBy: [{ tocaAId: "asc" }, { position: "asc" }] },
      },
    }),
    // Las firmas de los sprites, por el locke: a la vez, no después
    prisma.$queryRaw<{ id: string; v: string | null }[]>`
      select sp."id", ${firmaDeColumna(`sp."boxImage"`)} as v
      from "SorteoPokemon" sp join "Sorteo" s on s."id" = sp."sorteoId"
      where s."competitionId" = ${competition.id}
    `,
  ]);

  // Los sprites, por dirección y no metidos en la página: ver lib/imagen-url.ts
  const firmaDe = new Map(firmas.map((fila) => [fila.id, fila.v]));
  const sprites = (id: string) => urlDeImagen("sorteo", id, firmaDe.get(id));

  const activos = soloActivos(participants);

  return (
    <>
      <PageHeader
        title="Sorteo de préstamos"
        subtitle="Un bote de pokémon que se reparte al azar entre los que entren. Cada uno echa los suyos y la aplicación hace el reparto: seis por persona como mucho, y lo que sobre se queda en el bote."
      />

      {sorteos.length === 0 ? (
        <EmptyState
          title="No hay ningún sorteo"
          hint={
            canManage
              ? "Crea uno abajo y empezad a echar pokémon."
              : "Un administrador tiene que crear el primero."
          }
        />
      ) : (
        <div className="space-y-4">
          {sorteos.map((sorteo) => {
            const entran = new Set(
              sorteo.participantes.map((fila) => fila.participantId),
            );
            return (
              <Sorteo
                key={sorteo.id}
                canManage={canManage}
                miParticipantId={
                  // Archivada: el bote se queda como quedó
                  soloLectura(competition, canManage) ? null : (yo?.id ?? null)
                }
                sorteo={{
                  id: sorteo.id,
                  label: sorteo.label,
                  repartidoAt: sorteo.repartidoAt,
                  pokemon: sorteo.pokemon.map((pokemon) => ({
                    id: pokemon.id,
                    species: pokemon.species,
                    nickname: pokemon.nickname,
                    boxImage: sprites(pokemon.id),
                    aportadoPor: pokemon.aportadoPor,
                    tocaAId: pokemon.tocaAId,
                  })),
                  gente: activos.map((participant) => ({
                    participantId: participant.id,
                    displayName: participant.displayName,
                    color: participant.color,
                    avatarImage: participant.user.avatarImage,
                    entra: entran.has(participant.id),
                  })),
                }}
              />
            );
          })}
        </div>
      )}

      {canManage ? (
        <div className="mt-6">
          <CrearSorteo competitionId={competition.id} />
        </div>
      ) : null}
    </>
  );
}
