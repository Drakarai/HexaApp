import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, esCreador } from "@/lib/auth";
import {
  canManageCompetition,
  soloLectura,
  getActiveCompetition,
  getMyParticipant,
} from "@/lib/competition";
import { getBolsa, getCatalogo } from "@/lib/bolsa";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { Bolsa } from "./bolsa-client";
import { Icono } from "@/components/icono";

export const metadata = { title: "Bolsa" };

export default async function BolsaPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const participant = await getMyParticipant(competition.id, user.id);
  // Repartir objetos es de quien administra el locke, no solo del Creador
  const admin = await canManageCompetition(competition.id, user);

  if (!participant) {
    return (
      <>
        <Cabecera admin={admin} />
        <EmptyState
          title="No juegas esta edición"
          hint="La bolsa es de cada participante, así que aquí no hay nada tuyo."
        />
      </>
    );
  }

  const catalogo = await getCatalogo();
  const [objetos, usos] = await Promise.all([
    getBolsa(participant.id, catalogo),
    prisma.bagUse.findMany({
      where: { participantId: participant.id },
      orderBy: { usedAt: "desc" },
      take: 12,
    }),
  ]);

  const unidades = objetos.reduce((suma, objeto) => suma + objeto.quantity, 0);

  return (
    <>
      <Cabecera admin={admin} />

      {objetos.length ? (
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">
          {objetos.length} {objetos.length === 1 ? "objeto" : "objetos"} ·{" "}
          {unidades} {unidades === 1 ? "unidad" : "unidades"}
        </p>
      ) : null}
      {/* La bolsa se pinta también vacía: al gastar lo último, el aviso con el
          botón de deshacer vive dentro de ella y tiene que seguir ahí */}
      <Bolsa
        objetos={objetos}
        puedoUsar={!soloLectura(competition, admin)}
        vacia={
          <EmptyState
            title="La bolsa está vacía"
            hint="Los objetos los reparte quien administra el locke: pídeselos."
          />
        }
      />

      {usos.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Lo que ya te has gastado
          </h2>
          <ul className="space-y-1.5">
            {usos.map((uso) => (
              <li
                key={uso.id}
                className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-slate-200">{uso.itemName}</span>
                {uso.optionName ? (
                  <span className="text-slate-400">→ {uso.optionName}</span>
                ) : null}
                <span className="ml-auto text-xs text-slate-500">
                  {formatDateTime(uso.usedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Cabecera({ admin }: { admin: boolean }) {
  return (
    <PageHeader
      title="Bolsa"
      subtitle="Lo que llevas encima. Solo lo ves tú y quien administra el locke, que es quien la llena."
      actions={
        admin ? (
          <Link href="/bolsa/todas" className="btn-ghost btn-sm">
            <Icono emoji="🎒" /> Bolsas de todos
          </Link>
        ) : null
      }
    />
  );
}
