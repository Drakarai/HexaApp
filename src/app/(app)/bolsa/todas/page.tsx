import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getActiveCompetition, getParticipants } from "@/lib/competition";
import { getBolsas, getCatalogo } from "@/lib/bolsa";
import {
  borrarObjetoAction,
  borrarOpcionAction,
  editarObjetoAction,
  quitarObjetoAction,
} from "@/app/actions/bolsa";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { ImageInput } from "@/components/image-input";
import { Avatar, ConfirmSubmit, EmptyState } from "@/components/ui";
import { IMAGE_SIZES } from "@/lib/image";
import { Dibujo } from "../bolsa-client";
import {
  DarObjeto,
  FichaDeCatalogo,
  NuevaOpcion,
  NuevoObjeto,
} from "./admin-client";

export const metadata = { title: "Bolsas de todos" };

/**
 * El panel del administrador: las bolsas de los seis y el catálogo de objetos.
 *
 * Aquí se **añade y se quita**, no se usa: gastar un objeto es cosa de su
 * dueño, y quitarlo de aquí es corregir un apunte, no anunciar nada en el muro.
 */
export default async function BolsasPage() {
  await requireAdminPage();

  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate />;

  const [participantes, catalogo] = await Promise.all([
    getParticipants(competition.id),
    getCatalogo(),
  ]);
  const bolsas = await getBolsas(
    participantes.map((participante) => participante.id),
    catalogo,
  );

  return (
    <>
      <PageHeader
        title="Bolsas de todos"
        subtitle="Lo que lleva cada uno. Se añade y se quita desde aquí; gastarlo lo hace su dueño desde su bolsa."
        actions={
          <Link href="/bolsa" className="btn-ghost btn-sm">
            ← Mi bolsa
          </Link>
        }
      />

      <div className="space-y-4">
        {participantes.map((participante) => {
          const objetos = bolsas.get(participante.id) ?? [];
          return (
            <section key={participante.id} className="card">
              <header className="mb-3 flex items-center gap-2.5">
                <Avatar
                  name={participante.displayName}
                  color={participante.color}
                  image={participante.user.avatarImage}
                  size={30}
                />
                <h2 className="font-semibold text-slate-100">
                  {participante.displayName}
                </h2>
                <span className="ml-auto text-xs text-slate-500">
                  {objetos.length
                    ? `${objetos.reduce((suma, objeto) => suma + objeto.quantity, 0)} unidades`
                    : "bolsa vacía"}
                </span>
              </header>

              {objetos.length ? (
                <ul className="mb-4 grid gap-2 sm:grid-cols-2">
                  {objetos.map((objeto) => (
                    <li
                      key={objeto.entryId}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
                    >
                      <Dibujo
                        src={objeto.item.image}
                        nombre={objeto.item.name}
                        pequeno
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-100">
                          {objeto.item.name}
                          {objeto.quantity > 1 ? (
                            <span className="ml-1.5 font-bold text-brand-300 tabular-nums">
                              ×{objeto.quantity}
                            </span>
                          ) : null}
                        </p>
                        {objeto.note ? (
                          <p className="truncate text-xs text-slate-500">
                            {objeto.note}
                          </p>
                        ) : null}
                      </div>
                      <form action={quitarObjetoAction} className="shrink-0">
                        <input
                          type="hidden"
                          name="entryId"
                          value={objeto.entryId}
                        />
                        <button
                          type="submit"
                          className="btn-ghost btn-sm"
                          title="Quitarle una unidad"
                        >
                          −1
                        </button>
                      </form>
                      <form action={quitarObjetoAction} className="shrink-0">
                        <input
                          type="hidden"
                          name="entryId"
                          value={objeto.entryId}
                        />
                        <input type="hidden" name="todo" value="1" />
                        <ConfirmSubmit
                          className="btn-ghost btn-sm text-red-300"
                          message={`¿Quitarle todos los ${objeto.item.name}?`}
                          title="Quitárselo entero"
                        >
                          ✕
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}

              <DarObjeto participantId={participante.id} catalogo={catalogo} />
            </section>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold text-white">Catálogo</h2>
        <p className="mb-4 max-w-2xl text-sm text-slate-400">
          Los objetos que existen. Un objeto con opciones dentro hace que, al
          usarlo, su dueño tenga que elegir con qué se queda; sin opciones se
          gasta directamente.
        </p>

        <div className="card mb-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            Objeto nuevo
          </h3>
          <NuevoObjeto
            yaPuestos={catalogo
              .map((objeto) => objeto.apiSlug)
              .filter((slug): slug is string => Boolean(slug))}
          />
        </div>

        {catalogo.length ? (
          <ul className="space-y-2">
            {catalogo.map((objeto) => (
              <FichaDeCatalogo key={objeto.id} objeto={objeto}>
                <form
                  action={editarObjetoAction}
                  className="space-y-3 border-t border-white/5 pt-3"
                >
                  <input type="hidden" name="itemId" value={objeto.id} />
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      name="name"
                      className="input"
                      maxLength={60}
                      defaultValue={objeto.name}
                    />
                  </div>
                  <div>
                    <label className="label">Para qué sirve</label>
                    <input
                      name="description"
                      className="input"
                      maxLength={140}
                      defaultValue={objeto.description ?? ""}
                    />
                  </div>
                  <ImageInput
                    name="image"
                    label="Imagen"
                    defaultValue={objeto.image}
                    maxSize={IMAGE_SIZES.objeto}
                  />
                  <button type="submit" className="btn-primary btn-sm">
                    Guardar
                  </button>
                </form>

                <div className="border-t border-white/5 pt-3">
                  <p className="mb-2 text-sm font-semibold text-slate-200">
                    Qué se puede elegir al usarlo
                  </p>
                  {objeto.options.length ? (
                    <ul className="mb-2 space-y-1.5">
                      {objeto.options.map((opcion) => (
                        <li
                          key={opcion.id}
                          className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2"
                        >
                          <Dibujo
                            src={opcion.image}
                            nombre={opcion.name}
                            pequeno
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                            {opcion.name}
                          </span>
                          <form action={borrarOpcionAction}>
                            <input
                              type="hidden"
                              name="optionId"
                              value={opcion.id}
                            />
                            <ConfirmSubmit
                              className="btn-ghost btn-sm text-red-300"
                              message={`¿Quitar "${opcion.name}" de las opciones?`}
                            >
                              ✕
                            </ConfirmSubmit>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-2 text-xs text-slate-500">
                      Sin opciones: al usarlo se gasta sin preguntar nada.
                    </p>
                  )}
                  <NuevaOpcion itemId={objeto.id} />
                </div>

                <form
                  action={borrarObjetoAction}
                  className="border-t border-white/5 pt-3"
                >
                  <input type="hidden" name="itemId" value={objeto.id} />
                  <ConfirmSubmit
                    message={
                      objeto.enBolsas
                        ? `"${objeto.name}" está en ${objeto.enBolsas} ${objeto.enBolsas === 1 ? "bolsa" : "bolsas"} y se irá de todas. ¿Seguro?`
                        : `¿Borrar "${objeto.name}" del catálogo?`
                    }
                  >
                    Borrar del catálogo
                  </ConfirmSubmit>
                </form>
              </FichaDeCatalogo>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Todavía no hay objetos"
            hint="Búscalos en la lista de los juegos o invéntate uno."
          />
        )}
      </section>
    </>
  );
}
