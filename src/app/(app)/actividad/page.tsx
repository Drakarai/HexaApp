import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition, getParticipants, soloActivos } from "@/lib/competition";
import { getActivity } from "@/lib/activity";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ActivityFeed, TIPOS_DE_ACTIVIDAD } from "@/components/activity-feed";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";

export const metadata = { title: "Actividad" };

/**
 * Cuántas cosas se enseñan de entrada y cuántas más con cada «Ver lo
 * anterior». Antes salían 80 de golpe y la pantalla pasaba de 5000 px en el
 * móvil; lo que se busca casi siempre es lo de los últimos días.
 */
const DE_ENTRADA = 40;
const CADA_VEZ = 60;
const COMO_MUCHO = 600;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ ver?: string; tipo?: string }> }) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const consulta = await searchParams;
  const pedidas = Number(consulta.ver);
  // Uno que no existe es como no filtrar: un enlace viejo no deja la página vacía
  const tipo = TIPOS_DE_ACTIVIDAD.find((t) => t.tipo === consulta.tipo) ?? null;
  const cuantas = Number.isInteger(pedidas) ? Math.min(Math.max(pedidas, DE_ENTRADA), COMO_MUCHO) : DE_ENTRADA;
  const [todas, participantes] = await Promise.all([
    getActivity(competition.id, cuantas),
    getParticipants(competition.id),
  ]);
  /**
   * Se filtra después de pedir: cada fuente trae ya hasta `cuantas` de lo
   * suyo, así que filtrando por un tipo no se queda corto.
   */
  const entries = tipo ? todas.filter((entrada) => entrada.tipo === tipo.tipo) : todas;
  const conTipo = (t: string | null, ver?: number) => {
    const partes = [t ? `tipo=${t}` : null, ver ? `ver=${ver}` : null].filter(Boolean);
    return partes.length ? `/actividad?${partes.join("&")}` : "/actividad";
  };

  return (
    <>
      <PageHeader
        title="Actividad"
        subtitle={`Todo lo que ha ido pasando en ${competition.name}, de lo más reciente a lo más antiguo.`}
      />
      {/* Filtrar por lo que ha pasado: «solo las muertes» es lo que más se busca */}
      <nav aria-label="Filtrar por tipo" className="fila-de-filtros mb-4">
        <FiltroDeTipo href={conTipo(null)} activo={!tipo}>
          Todo
        </FiltroDeTipo>
        {TIPOS_DE_ACTIVIDAD.map((t) => (
          <FiltroDeTipo key={t.tipo} href={conTipo(t.tipo)} activo={tipo?.tipo === t.tipo} color={t.color}>
            <Icono emoji={t.icono} /> {t.nombre}
          </FiltroDeTipo>
        ))}
      </nav>
      <section className="card">
        <ActivityFeed entries={entries} jugadores={soloActivos(participantes).length} />
        {/* Si han salido todas las que se pidieron, puede haber más detrás */}
        {todas.length === cuantas && cuantas < COMO_MUCHO ? (
          <div className="mt-4 text-center">
            <Link href={conTipo(tipo?.tipo ?? null, cuantas + CADA_VEZ)} scroll={false} className="btn-ghost btn-sm">
              Ver lo anterior
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}

function FiltroDeTipo({
  href,
  activo,
  color,
  children,
}: {
  href: string;
  activo: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={activo ? "page" : undefined}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        activo ? "text-white" : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200",
      )}
      style={activo ? { borderColor: `${color ?? "#818cf8"}99`, background: `${color ?? "#818cf8"}26` } : undefined}
    >
      {children}
    </Link>
  );
}
