import Link from "next/link";
import { requireCreadorPage } from "@/lib/auth";
import { getMapa, getResumenDeMapas } from "@/lib/mapas";
import { REGIONES_DE_MAPA } from "@/lib/juegos";
import { PageHeader } from "@/components/page-header";
import { cx } from "@/lib/utils";
import { RegionEnEdicion } from "./editor";

export const metadata = { title: "Mapas de las regiones" };

/**
 * Los mapas de las regiones.
 *
 * **Se editan desde aquí estés en el locke que estés**: el mapa de Johto es el
 * mismo para un locke en Oro que en HeartGold, así que no cuelga de ninguna
 * edición y se puede preparar Kanto mientras se juega en Johto.
 *
 * Una pestaña no es siempre una región: Alola no tiene mapa propio y en su
 * sitio están sus **cuatro islas**, que es como se juega y como caben en una
 * pantalla.
 */
export default async function MapasPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  await requireCreadorPage();

  const { region: pedida } = await searchParams;
  const resumen = await getResumenDeMapas();
  const elegida =
    REGIONES_DE_MAPA.find((region) => region.slug === pedida)?.slug ??
    REGIONES_DE_MAPA[1].slug;
  const mapa = await getMapa(elegida);

  return (
    <>
      <PageHeader
        title="Mapas de las regiones"
        subtitle="De aquí sale el Mapa de capturas de todos. Son globales: el de Johto vale para Oro y para HeartGold."
        actions={
          <Link href="/admin" className="btn-ghost btn-sm">
            ← Administración
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {resumen.map((region) => (
          <Link
            key={region.slug}
            href={`/admin/mapas?region=${region.slug}`}
            className={cx(
              "chip",
              region.slug === elegida &&
                "border-brand-500/40 bg-brand-600/20 text-white",
            )}
          >
            {region.nombre}
            <span className="text-xs text-slate-500">{region.zonas || "—"}</span>
          </Link>
        ))}
      </div>

      {mapa ? (
        <RegionEnEdicion
          // Otra región es otro editor: nada de lo elegido en una pasa a la siguiente
          key={mapa.slug}
          mapa={mapa}
          hayDeFabrica={Boolean(resumen.find((region) => region.slug === elegida)?.hayDeFabrica)}
        />
      ) : null}
    </>
  );
}
