import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getPlantilla, getResumenDePlantillas } from "@/lib/plantillas";
import { juegoPorId, nombreDeRegion } from "@/lib/juegos";
import { rellenarPlantillaAction } from "@/app/actions/plantillas";
import { PageHeader } from "@/components/page-header";
import { cx } from "@/lib/utils";
import { ItemDeLaPlantilla, NuevoItemDePlantilla } from "./editor";

export const metadata = { title: "Level caps de los juegos" };

/**
 * Las plantillas de level caps, una por juego.
 *
 * **Son globales, como los mapas**: no cuelgan de ninguna edición, así que se
 * puede dejar preparado Rubí mientras se juega en HeartGold. Dentro de un locke
 * se traen con un botón y a partir de ahí son suyos: cambiarlos allí no toca
 * esta plantilla, y al revés tampoco.
 */
export default async function PlantillasPage({
  searchParams,
}: {
  searchParams: Promise<{ juego?: string }>;
}) {
  await requireAdminPage();

  const { juego: pedido } = await searchParams;
  const resumen = await getResumenDePlantillas();
  const elegido = juegoPorId(pedido)?.id ?? resumen[0].id;
  const juego = juegoPorId(elegido)!;
  const items = await getPlantilla(elegido);

  // Los juegos, agrupados como en el desplegable de crear la edición
  const grupos = new Map<string, typeof resumen>();
  for (const fila of resumen) {
    grupos.set(fila.grupo, [...(grupos.get(fila.grupo) ?? []), fila]);
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
        {[...grupos.entries()].map(([grupo, juegos]) => (
          <div key={grupo}>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-slate-500">
              {grupo}
            </p>
            <div className="flex flex-wrap gap-2">
              {juegos.map((fila) => (
                <Link
                  key={fila.id}
                  href={`/admin/level-caps?juego=${fila.id}`}
                  className={cx(
                    "chip",
                    fila.id === elegido &&
                      "border-brand-500/40 bg-brand-600/20 text-white",
                  )}
                >
                  {fila.name}
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
          <h2 className="section-title">{juego.name}</h2>
          <span className="text-xs text-slate-500">
            {nombreDeRegion(juego.region)} · {items.length}{" "}
            {items.length === 1 ? "hito" : "hitos"}
          </span>
        </div>

        {items.length ? (
          <>
            <p className="muted">
              Estos son el punto de partida de cualquier locke en {juego.name}.
              Los niveles están sacados de los juegos y{" "}
              <strong className="text-slate-300">
                conviene comprobarlos
              </strong>
              : cambian de una versión a otra de la misma región y cada grupo
              suele ajustarlos a su gusto.
            </p>
            <ul className="space-y-2">
              {items.map((item, indice) => (
                <ItemDeLaPlantilla
                  key={item.id}
                  item={item}
                  primero={indice === 0}
                  ultimo={indice === items.length - 1}
                />
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="text-sm text-slate-300">
              {juego.name} todavía no tiene plantilla.
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Trae los de {nombreDeRegion(juego.region)} y ajústalos, o ve
              añadiéndolos a mano abajo.
            </p>
            <form action={rellenarPlantillaAction} className="mt-3">
              <input type="hidden" name="gameId" value={juego.id} />
              <button type="submit" className="btn-primary btn-sm">
                Traer los de {nombreDeRegion(juego.region)}
              </button>
            </form>
          </div>
        )}

        <NuevoItemDePlantilla gameId={juego.id} />

        {items.length ? (
          <form
            action={rellenarPlantillaAction}
            className="border-t border-white/10 pt-4"
          >
            <input type="hidden" name="gameId" value={juego.id} />
            <button type="submit" className="btn-ghost btn-sm">
              Traer los que falten de {nombreDeRegion(juego.region)}
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
