import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { getActivity } from "@/lib/activity";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ActivityFeed } from "@/components/activity-feed";

export const metadata = { title: "Actividad" };

export default async function ActivityPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const entries = await getActivity(competition.id, 80);

  return (
    <>
      <PageHeader
        title="Actividad"
        subtitle={`Todo lo que ha ido pasando en ${competition.name}, de lo más reciente a lo más antiguo.`}
      />
      <section className="card">
        <ActivityFeed entries={entries} />
      </section>
    </>
  );
}
