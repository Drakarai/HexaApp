import Link from "next/link";
import { redirect } from "next/navigation";
import { esCreador, requireUser } from "@/lib/auth";
import {
  canManageCompetition,
  getActiveCompetition,
  getParticipants,
} from "@/lib/competition";
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
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={esCreador(user)} />;

  /**
   * Repartir objetos es cosa del locke, así que entra quien lo administre.
   * **El catálogo no**: lo que existe es de toda la casa y lo lleva el
   * Creador, así que esa parte de la página se enseña solo a él.
   */
  if (!(await canManageCompetition(competition.id, user))) redirect("/bolsa");
  const mandaEnTodo = esCreador(user);

  // Los jugadores, el catálogo y las bolsas de todos, a la vez
  const catalogoPedido = getCatalogo();
  const [participantes, catalogo, bolsas] = await Promise.all([
    getParticipants(competition.id),
    catalogoPedido,
    getBolsas({ competitionId: competition.id }, catalogoPedido),
  ]);

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

      {mandaEnTodo ? (
      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold text-white">Catálogo</h2>
        <p className="mb-4 max-w-2xl text-sm text-slate-400">
          Lo que existe. Un <strong className="text-slate-300">objeto</strong>{" "}
          se gasta directamente, como &quot;Captura extra&quot;. Un{" "}
          <strong className="text-brand-300">grupo</strong> lleva varios dentro,
          como &quot;Objeto competitivo&quot; con Globo Helio y Casco Dentado: al
          usarlo, su dueño elige con cuál se queda.
        </p>

        <div className="card mb-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            Objeto o grupo nuevo
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
              <FichaDeCatalogo
                key={objeto.id}
                objeto={objeto}
                dentro={
                  objeto.isGroup ? (
                    <div className="rounded-xl border border-white/10 bg-ink-900/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-300/80">
                        Se elige entre
                      </p>
                      {objeto.options.length ? (
                        <ul className="mb-2 grid gap-1.5 sm:grid-cols-2">
                          {objeto.options.map((opcion) => (
                            <li
                              key={opcion.id}
                              className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] p-2"
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
                                  message={`¿Sacar "${opcion.name}" de ${objeto.name}?`}
                                >
                                  ✕
                                </ConfirmSubmit>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mb-2 text-xs text-amber-300/90">
                          Este grupo todavía está vacío, así que nadie puede
                          usarlo. Ponle lo que se puede elegir:
                        </p>
                      )}
                      <NuevaOpcion
                        itemId={objeto.id}
                        vacio={objeto.options.length === 0}
                      />
                    </div>
                  ) : null
                }
                edicion={
                  <>
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

                {/* Un objeto suelto se puede convertir en grupo poniéndole
                    algo dentro; al primero que se le añade cambia de clase */}
                {objeto.isGroup ? null : (
                  <div className="border-t border-white/5 pt-3">
                    <p className="mb-2 text-sm font-semibold text-slate-200">
                      ¿Que se pueda elegir entre varios?
                    </p>
                    <p className="mb-2 text-xs text-slate-500">
                      Si le metes objetos dentro, &quot;{objeto.name}&quot; pasa
                      a ser un grupo: al usarlo habrá que elegir uno.
                    </p>
                    <NuevaOpcion
                      itemId={objeto.id}
                      etiqueta="＋ Convertirlo en grupo"
                    />
                  </div>
                )}

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
                  </>
                }
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            dibujo="mochila"
            title="Todavía no hay objetos"
            hint="Búscalos en la lista de los juegos o invéntate uno."
          />
        )}
      </section>
      ) : null}
    </>
  );
}
