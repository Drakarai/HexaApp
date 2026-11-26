import Link from "next/link";
import { requireUser, esCreador } from "@/lib/auth";
import { getActiveCompetition } from "@/lib/competition";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { Icono } from "@/components/icono";
import { sePuedeTenerGts } from "@/lib/gts";
import { prodigiosoDelLocke } from "@/lib/prodigioso-servidor";
import { cx } from "@/lib/utils";

export const metadata = { title: "Intercambios" };

/**
 * **Intercambios**: la puerta de la GTS y del Intercambio Prodigioso, con un
 * botón grande para cada uno. Lo que no está encendido en el locke (o está en
 * obras) sale apagado y dice por qué, en vez de desaparecer.
 */
export default async function IntercambiosPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  const gts = competition.gts && sePuedeTenerGts(competition);
  const prodigioso = prodigiosoDelLocke(competition);
  const opciones = [
    {
      href: "/gts",
      icono: "🔁",
      titulo: "GTS",
      texto:
        "Pon un pokémon y los demás te ofrecen los suyos; tú eliges con cuál te quedas. Se abre en cada checkpoint de jornada.",
      abierto: gts,
      cerrado: sePuedeTenerGts(competition)
        ? "No está encendida en este locke."
        : "Solo en lockes de tres o más, y no en un Soul Link.",
      color: "from-brand-500/25 to-brand-500/5 border-brand-400/30",
    },
    {
      href: "/prodigioso",
      icono: "✨",
      titulo: "Intercambio Prodigioso",
      texto: "Das uno de tu caja y te llega otro al azar, al mismo nivel. No se sabe qué hasta que sale de la ball.",
      abierto: prodigioso.abierto,
      cerrado: prodigioso.abierto ? "" : prodigioso.enObras ? `En obras. ${prodigioso.porQue}` : prodigioso.porQue,
      color: "from-teal-500/25 to-teal-500/5 border-teal-400/30",
    },
  ];

  return (
    <>
      <PageHeader title="Intercambios" subtitle="Cambiar pokémon con los demás o a ciegas." />
      <div className="grid gap-4 md:grid-cols-2" data-intercambios>
        {opciones.map((o) => {
          const tarjeta = (
            <div
              className={cx(
                "flex h-full flex-col gap-3 rounded-2xl border bg-gradient-to-br p-6 transition",
                o.color,
                o.abierto ? "hover:-translate-y-0.5 hover:brightness-110" : "opacity-60",
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl text-white">
                <Icono emoji={o.icono} />
              </span>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">{o.titulo}</h2>
              <p className="text-sm text-slate-300">{o.texto}</p>
              {!o.abierto ? <p className="mt-auto text-xs text-amber-200/90">{o.cerrado}</p> : null}
            </div>
          );
          // Apagado también se puede abrir: dentro dice qué falta (y a quien administra, dónde se enciende)
          return (
            <Link key={o.href} href={o.href} className="block" data-intercambio-opcion={o.titulo}>
              {tarjeta}
            </Link>
          );
        })}
      </div>
    </>
  );
}
