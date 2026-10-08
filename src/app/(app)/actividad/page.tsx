import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { getActivity } from "@/lib/activity";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ActivityFeed } from "@/components/activity-feed";

export const metadata = { title: "Actividad" };

/**
 * Cuántas cosas se enseñan de entrada y cuántas más con cada «Ver lo
 * anterior». Antes salían 80 de golpe y la pantalla pasaba de 5000 px en el
 * móvil; lo que se busca casi siempre es lo de los últimos días.
 */
const DE_ENTRADA = 40;
const CADA_VEZ = 60;
const COMO_MUCHO = 600;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const pedidas = Number((await searchParams).ver);
  const cuantas = Number.isInteger(pedidas) ? Math.min(Math.max(pedidas, DE_ENTRADA), COMO_MUCHO) : DE_ENTRADA;
  const entries = await getActivity(competition.id, cuantas);

  return (
    <>
      <PageHeader
        title="Actividad"
        subtitle={`Todo lo que ha ido pasando en ${competition.name}, de lo más reciente a lo más antiguo.`}
      />
      <section className="card">
        <ActivityFeed entries={entries} />
        {/* Si han salido todas las que se pidieron, puede haber más detrás */}
        {entries.length === cuantas && cuantas < COMO_MUCHO ? (
          <div className="mt-4 text-center">
            <Link href={`/actividad?ver=${cuantas + CADA_VEZ}`} scroll={false} className="btn-ghost btn-sm">
              Ver lo anterior
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}
