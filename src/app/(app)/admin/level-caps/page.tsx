import Link from "next/link";
import { requireCreadorPage } from "@/lib/auth";
import {
  deFabricaParaGrupo,
  getPlantilla,
  getResumenDePlantillas,
} from "@/lib/plantillas";
import { grupoDePlantillaPorId, nombreDeRegion } from "@/lib/juegos";
import { rellenarPlantillaAction } from "@/app/actions/plantillas";
import { urlsDeMedallasDePlantilla } from "@/lib/imagenes";
import { PageHeader } from "@/components/page-header";
import { cx } from "@/lib/utils";
import {
  CopiarDeOtra,
  ItemDeLaPlantilla,
  NuevoItemDePlantilla,
} from "./editor";
import { DibujoVacio } from "@/components/dibujo-vacio";

export const metadata = { title: "Level caps de los juegos" };

/**
 * Las plantillas de level caps, una por **pareja de juegos**.
 *
 * **Son globales, como los mapas**: no cuelgan de ninguna edición, así que se
 * puede dejar preparado Rubí y Zafiro mientras se juega en HeartGold. Dentro de
 * un locke se traen con un botón y a partir de ahí son suyos: cambiarlos allí no
 * toca esta plantilla, y al revés tampoco.
 */
export default async function PlantillasPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  await requireCreadorPage();

  const { grupo: pedido } = await searchParams;
  const resumen = await getResumenDePlantillas();
  const elegido = grupoDePlantillaPorId(pedido) ?? resumen[0];
  const items = await getPlantilla(elegido.id);
  // De dónde saldrían los de fábrica: su región, o su propia lista
  const { desde } = deFabricaParaGrupo(elegido);
  /**
   * Las otras plantillas que ya tienen hitos, para poder copiarlas. Es lo que
   * hace llevadero preparar una tercera versión: se traen los de su pareja y se
   * cambia lo poco que es distinto.
   */
  const candidatos = resumen.filter(
    (fila) => fila.id !== elegido.id && fila.hitos > 0,
  );

  // Direcciones de las medallas, no las medallas: ver lib/imagen-url.ts
  const medallas = await urlsDeMedallasDePlantilla(items.map((item) => item.id));

  // Las pestañas, repartidas por generación como el desplegable de las ediciones
  const porGeneracion = new Map<string, typeof resumen>();
  for (const fila of resumen) {
    porGeneracion.set(fila.generacion, [
      ...(porGeneracion.get(fila.generacion) ?? []),
      fila,
    ]);
  }

  return (
    <>
      <PageHeader
        title="Level caps de los juegos"
        subtitle="Los gimnasios, pruebas y hitos que trae cada juego, para no escribirlos a mano en cada locke. Son globales, como los mapas."
        actions={
          <Link href="/admin" className="btn-ghost btn-sm">
            ← Administración
          </Link>
        }
      />

      <div className="mb-5 space-y-3">
        {[...porGeneracion.entries()].map(([generacion, grupos]) => (
          <div key={generacion}>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">
              {generacion}
            </p>
            <div className="flex flex-wrap gap-2">
              {grupos.map((fila) => (
                <Link
                  key={fila.id}
                  href={`/admin/level-caps?grupo=${fila.id}`}
                  className={cx(
                    "chip",
                    fila.id === elegido.id &&
                      "border-brand-500/40 bg-brand-600/20 text-white",
                  )}
                >
                  {fila.nombre}
                  <span className="text-xs text-slate-500">
                    {fila.hitos || "—"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">{elegido.nombre}</h2>
          <span className="text-xs text-slate-500">
            {nombreDeRegion(
              resumen.find((fila) => fila.id === elegido.id)!.region,
            )}{" "}
            · {items.length} {items.length === 1 ? "hito" : "hitos"}
          </span>
        </div>

        {items.length ? (
          <>
            <p className="muted">
              El punto de partida de cualquier locke en {elegido.nombre}. Lo
              de fábrica es la lista de la región{" "}
              <strong className="text-slate-300">sin las diferencias</strong> de
              cada versión, así que compruébalo con el juego delante: las
              terceras versiones y los remakes cambian nombres, niveles y hasta
              el orden de los gimnasios.
            </p>
            <ul className="space-y-2">
              {items.map((item, indice) => (
                <ItemDeLaPlantilla
                  key={item.id}
                  item={item}
                  imagenes={medallas(item.id)}
                  primero={indice === 0}
                  ultimo={indice === items.length - 1}
                />
              ))}
            </ul>
          </>
        ) : (
          <div className="px-4 py-6 text-center">
            <DibujoVacio dibujo="trofeo" />
            <p className="mt-3 text-sm text-slate-300">
              {elegido.nombre} todavía no tiene plantilla.
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Trae los de {desde} y ajústalos, copia los de otra plantilla ya
              hecha, o ve añadiéndolos a mano abajo.
            </p>
            <form action={rellenarPlantillaAction} className="mt-3">
              <input type="hidden" name="grupoId" value={elegido.id} />
              <button type="submit" className="btn-primary btn-sm">
                Traer los de {desde}
              </button>
            </form>
          </div>
        )}

        <CopiarDeOtra grupoId={elegido.id} candidatos={candidatos} />

        <NuevoItemDePlantilla grupoId={elegido.id} />

        {items.length ? (
          <form
            action={rellenarPlantillaAction}
            className="border-t border-white/10 pt-4"
          >
            <input type="hidden" name="grupoId" value={elegido.id} />
            <button type="submit" className="btn-ghost btn-sm">
              Traer los que falten de {desde}
            </button>
            <p className="mt-1 text-xs text-slate-500">
              Solo añade los que no estén por nombre: lo que ya has cambiado se
              queda como está.
            </p>
          </form>
        ) : null}
      </section>
    </>
  );
}
