import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getMapa, getResumenDeMapas } from "@/lib/mapas";
import { REGIONES } from "@/lib/juegos";
import {
  borrarZonaAction,
  editarZonaAction,
  rellenarRegionAction,
} from "@/app/actions/mapas";
import { PageHeader } from "@/components/page-header";
import { TIPOS_DE_ZONA } from "@/lib/zonas";
import { ConfirmSubmit } from "@/components/ui";
import { cx } from "@/lib/utils";
import {
  EditorDeMapa,
  FondoDelMapa,
  ListaDeZonas,
  NuevaZona,
} from "./editor";

export const metadata = { title: "Mapas de las regiones" };

/**
 * Los mapas de las siete regiones.
 *
 * **Se editan desde aquí estés en el locke que estés**: el mapa de Johto es el
 * mismo para un locke en Oro que en HeartGold, así que no cuelga de ninguna
 * edición y se puede preparar Kanto mientras se juega en Johto.
 */
export default async function MapasPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  await requireAdminPage();

  const { region: pedida } = await searchParams;
  const resumen = await getResumenDeMapas();
  const elegida =
    REGIONES.find((region) => region.slug === pedida)?.slug ?? REGIONES[1].slug;
  const mapa = await getMapa(elegida);

  return (
    <>
      <PageHeader
        title="Mapas de las regiones"
        subtitle="De aquí sale el Mapa de capturas de cada jugador. Son globales: el de Johto vale igual para Oro que para HeartGold, y se puede preparar cualquiera desde cualquier locke."
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
            <span className="text-xs text-slate-500">
              {region.zonas || "—"}
            </span>
          </Link>
        ))}
      </div>

      {mapa ? (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">{mapa.name}</h2>
            <span className="text-xs text-slate-500">
              {mapa.zones.length}{" "}
              {mapa.zones.length === 1 ? "zona" : "zonas"} · lienzo{" "}
              {mapa.width}×{mapa.height}
            </span>
          </div>

          {mapa.zones.length ? (
            <EditorDeMapa mapa={mapa} />
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
              <p className="text-sm text-slate-300">
                Este mapa está vacío.
              </p>
              {resumen.find((region) => region.slug === elegida)
                ?.hayDeFabrica ? (
                <>
                  <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                    Tengo sus zonas escritas con los nombres en español y
                    colocadas. Se pueden renombrar y mover después.
                  </p>
                  <form action={rellenarRegionAction} className="mt-3">
                    <input type="hidden" name="slug" value={elegida} />
                    <button type="submit" className="btn-primary btn-sm">
                      Rellenar con las zonas de {mapa.name}
                    </button>
                  </form>
                </>
              ) : (
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                  Esta región todavía no viene hecha de fábrica. Ve añadiéndole
                  zonas ahí abajo y colócalas arrastrando.
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 border-t border-white/5 pt-4">
            <NuevaZona slug={mapa.slug} />
            <FondoDelMapa mapa={mapa} />

            {mapa.zones.length ? (
              <ListaDeZonas>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {mapa.zones.map((zona) => (
                    <li
                      key={zona.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
                    >
                      <form
                        action={editarZonaAction}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="zoneId" value={zona.id} />
                        <input
                          name="name"
                          className="input min-w-32 flex-1"
                          maxLength={60}
                          defaultValue={zona.name}
                        />
                        <select
                          name="kind"
                          className="input w-36"
                          defaultValue={zona.kind}
                        >
                          {TIPOS_DE_ZONA.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>
                              {tipo.nombre}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn-ghost btn-sm">
                          Guardar
                        </button>
                      </form>
                      <form action={borrarZonaAction} className="mt-1.5">
                        <input type="hidden" name="zoneId" value={zona.id} />
                        <ConfirmSubmit
                          className="btn-ghost btn-sm text-red-300"
                          message={`¿Borrar "${zona.name}" del mapa? Las capturas que hubiera apuntadas ahí pasan a capturas extra.`}
                        >
                          Borrar
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              </ListaDeZonas>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
