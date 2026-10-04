import Link from "next/link";
import { requireCreadorPage } from "@/lib/auth";
import { getMapa, getResumenDeMapas } from "@/lib/mapas";
import { REGIONES_DE_MAPA } from "@/lib/juegos";
import {
  rellenarRegionAction,
} from "@/app/actions/mapas";
import { PageHeader } from "@/components/page-header";
import { cx } from "@/lib/utils";
import {
  DetectarZonas,
  EditorDeMapa,
  FondoDelMapa,
  NuevaZona,
} from "./editor";
import { DibujoVacio } from "@/components/dibujo-vacio";

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
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">{mapa.name}</h2>
            <span className="text-xs text-slate-500">
              {mapa.zones.length} {mapa.zones.length === 1 ? "zona" : "zonas"} ·
              lienzo {mapa.width}×{mapa.height}
            </span>
          </div>

          {mapa.zones.length ? (
            <EditorDeMapa mapa={mapa} />
          ) : (
            <div className="px-4 py-6 text-center">
              <DibujoVacio dibujo="mapa" />
              <p className="mt-3 text-sm text-slate-300">Este mapa está vacío.</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Ponle abajo la imagen del mapa y saca las zonas de ella, o ve
                añadiéndolas a mano y colocándolas encima.
              </p>
              {resumen.find((region) => region.slug === elegida)
                ?.hayDeFabrica ? (
                <form action={rellenarRegionAction} className="mt-3">
                  <input type="hidden" name="slug" value={elegida} />
                  <button type="submit" className="btn-ghost btn-sm">
                    O usar los nombres de {mapa.name} que traigo escritos
                  </button>
                </form>
              ) : null}
            </div>
          )}

          <div className="space-y-3 border-t border-white/5 pt-4">
            <NuevaZona slug={mapa.slug} />
            <div className="border-t border-white/5 pt-3">
              <DetectarZonas
                slug={mapa.slug}
                hayImagen={Boolean(mapa.image)}
              />
            </div>
            <div className="border-t border-white/5 pt-3">
              <FondoDelMapa mapa={mapa} />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
