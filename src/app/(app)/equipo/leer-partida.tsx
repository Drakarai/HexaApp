"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aplicarPartidaAction, verPartidaAction, type PasoParaVer, type VistaDeLaPartida } from "@/app/actions/partida";
import { leerPartida, PartidaNoValida, type PartidaLeida } from "@/lib/partida/essentials";
import { leerPartidaOficial, PartidaOficialNoValida, type PartidaOficial } from "@/lib/partida/oficial";
import { FormMessage } from "@/components/ui";
import { SpritePokemon } from "@/components/sprite-pokemon";
import { cx } from "@/lib/utils";

/**
 * **Leer la partida** y poner el Equipo y PC como en ella: la de Pokémon Añil
 * en sus lockes y la del juego oficial en los demás (1ª a 7ª generación). El
 * fichero se lee aquí, en el navegador, y al servidor va solo lo sacado de él:
 * unos KB, y la partida no se guarda en ningún sitio.
 *
 * Primero se enseña qué va a pasar —con cada cosa marcada, para quitar lo que
 * no cuadre— y luego se aplica. Todo lo aplicado es un solo «Deshacer».
 *
 * - **Añil** se juega en el ordenador: en el móvil ni sale. En el ordenador, la
 *   ventana para elegirla recuerda la carpeta (`showOpenFilePicker` con un
 *   `id`): ningún navegador deja abrirla de primeras en una carpeta concreta
 *   como `%APPDATA%`, así que la primera vez se llega a mano y desde ahí se
 *   abre sola en ella.
 * - **Los oficiales**: arrastrando el fichero encima o con el botón, en el
 *   ordenador y en el móvil.
 */

export type FormatoParaLeer = { tipo: "anil" } | { tipo: "oficial"; juego: string; fichero: string };

type Leida = PartidaLeida | PartidaOficial;

const GRUPOS: { tipo: PasoParaVer["tipo"][]; titulo: string; pista: string }[] = [
  { tipo: ["actualizar"], titulo: "Al día", pista: "Ya estaban: se les pone lo del juego." },
  { tipo: ["nueva"], titulo: "Nuevos", pista: "No estaban en la app: se apuntan con su ficha, su fecha y su ruta." },
  { tipo: ["muere", "baja"], titulo: "Al cementerio", pista: "Están en la caja de caídos: solo se dan por muertos." },
];

type VentanaDeFicheros = (opciones: {
  id?: string;
  multiple?: boolean;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ getFile: () => Promise<File> }[]>;

export function LeerPartida({
  jugadores,
  miId,
  formato,
}: {
  jugadores: { id: string; displayName: string }[];
  miId: string | null;
  formato: FormatoParaLeer;
}) {
  const router = useRouter();
  const anil = formato.tipo === "anil";
  const [para, setPara] = useState(miId ?? jugadores[0]?.id ?? "");
  const [partida, setPartida] = useState<Leida | null>(null);
  const [vista, setVista] = useState<VistaDeLaPartida | null>(null);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [estado, setEstado] = useState<{ error?: string; success?: string } | null>(null);
  const [encima, setEncima] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, empezar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  function ver(leida: Leida, cajaDeCaidos: number | null, participantId = para) {
    setEstado(null);
    empezar(async () => {
      const respuesta = await verPartidaAction({ participantId, partida: leida, cajaDeCaidos });
      if (respuesta.error) {
        setEstado({ error: respuesta.error });
        setVista(null);
      } else {
        setVista(respuesta.vista ?? null);
        setQuitados(new Set());
      }
    });
  }

  async function alElegir(fichero: File | undefined) {
    if (!fichero) return;
    setVista(null);
    setEstado(null);
    try {
      const bytes = new Uint8Array(await fichero.arrayBuffer());
      const leida = anil ? leerPartida(bytes) : leerPartidaOficial(bytes);
      setPartida(leida);
      // Los caídos suelen ir en la última caja
      ver(leida, leida.cajas.length ? leida.cajas.length - 1 : null);
    } catch (error) {
      setPartida(null);
      setEstado({
        error:
          error instanceof PartidaNoValida || error instanceof PartidaOficialNoValida
            ? error.message
            : anil
              ? "No he podido leer ese fichero. ¿Es la partida del Añil?"
              : "No he podido leer ese fichero. ¿Es la partida de este juego?",
      });
    }
  }

  /** En el Añil, la ventana del sistema que recuerda la carpeta; si el navegador no la tiene, la de siempre */
  async function elegir() {
    const ventana = (window as unknown as { showOpenFilePicker?: VentanaDeFicheros }).showOpenFilePicker;
    if (!anil || !ventana) {
      entrada.current?.click();
      return;
    }
    try {
      const [elegido] = await ventana({
        id: "partida-anil",
        types: [{ description: "Partida del Añil", accept: { "application/octet-stream": [".rxdata"] } }],
      });
      if (elegido) await alElegir(await elegido.getFile());
    } catch {
      // Cerrar la ventana sin elegir nada no es un error
    }
  }

  async function copiarRuta() {
    try {
      await navigator.clipboard.writeText("%APPDATA%");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: se escribe a mano, está a la vista
    }
  }

  function aplicar() {
    if (!partida || !vista) return;
    const claves = vista.pasos.map((p) => p.clave).filter((c) => !quitados.has(c));
    empezar(async () => {
      const respuesta = await aplicarPartidaAction({
        participantId: para,
        partida,
        cajaDeCaidos: vista.cajaDeCaidos,
        claves,
      });
      if (respuesta.error) {
        setEstado({ error: respuesta.error });
        return;
      }
      setEstado({ success: respuesta.aviso });
      setVista(null);
      setPartida(null);
      router.refresh();
    });
  }

  const marcados = vista ? vista.pasos.filter((p) => !quitados.has(p.clave)).length : 0;
  const alternar = (clave: string) =>
    setQuitados((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(clave)) ahora.delete(clave);
      else ahora.add(clave);
      return ahora;
    });

  return (
    // El Añil es de ordenador: en una pantalla táctil ni se ofrece
    <details className={cx("card group", anil && "hidden [@media(pointer:fine)]:block")}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        {anil ? "Leer la partida del Añil" : `Leer la partida de ${formato.juego}`}
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-slate-400">
          {anil ? (
            <>
              Sube tu <strong className="text-slate-200">Partida N.rxdata</strong> y se ponen al día tus pokémon
            </>
          ) : (
            <>
              Sube {formato.fichero} y se ponen al día tus pokémon
            </>
          )}
          : especie, forma, shiny, naturaleza, habilidad, objeto y movimientos. Los que no estén se apuntan, y los de la
          caja de caídos van al cementerio. Las medallas no se tocan. Antes de cambiar nada te enseña qué va a hacer.
        </p>

        {jugadores.length > 1 ? (
          <div>
            <label className="label">De quién es la partida</label>
            <select
              className="input"
              value={para}
              onChange={(evento) => {
                setPara(evento.target.value);
                if (partida) ver(partida, vista?.cajaDeCaidos ?? null, evento.target.value);
              }}
            >
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.displayName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <input
          ref={entrada}
          type="file"
          accept={anil ? ".rxdata" : undefined}
          className="hidden"
          aria-label={anil ? "Partida del Añil" : "Partida"}
          onChange={(evento) => {
            void alElegir(evento.target.files?.[0]);
            // Para poder volver a elegir el mismo fichero después de jugar
            evento.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void elegir()}
          onDragOver={(evento) => {
            evento.preventDefault();
            setEncima(true);
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setEncima(false);
            void alElegir(evento.dataTransfer.files?.[0]);
          }}
          className={cx(
            "flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition",
            encima ? "border-brand-400 bg-brand-500/10 text-slate-100" : "border-white/15 text-slate-300 hover:border-white/30",
          )}
        >
          <strong>{ocupado ? "Leyendo la partida…" : "Elegir la partida"}</strong>
          <span className="text-xs text-slate-500">
            {anil ? "o arrástrala aquí" : "o arrástrala aquí desde el ordenador"}
          </span>
        </button>
        {anil ? (
          <p className="text-xs text-slate-500">
            Está en la carpeta del Añil dentro de <code className="text-slate-300">%APPDATA%</code>. La primera vez,
            escribe <code className="text-slate-300">%APPDATA%</code> arriba en la ventana (o{" "}
            <button type="button" className="underline" onClick={() => void copiarRuta()}>
              {copiado ? "copiado" : "cópialo"}
            </button>{" "}
            y pégalo), entra en la carpeta del juego y elige la partida: desde ahí, la ventana se abre sola en esa
            carpeta.
          </p>
        ) : null}

        {partida && vista ? (
          <div className="space-y-4">
            <div>
              <label className="label">Caja de caídos</label>
              <select
                className="input"
                value={vista.cajaDeCaidos ?? ""}
                disabled={ocupado}
                onChange={(evento) => ver(partida, evento.target.value === "" ? null : Number(evento.target.value))}
              >
                <option value="">Ninguna: no hay caídos en la partida</option>
                {vista.cajas.map((nombre, i) => (
                  <option key={i} value={i}>
                    {nombre}
                    {i === vista.cajas.length - 1 ? " (la última)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {vista.sinLugares ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Este juego no guarda dónde se capturó cada pokémon ni cuándo: los nuevos se apuntan sin ruta y con la
                fecha de hoy. Ponles la ruta desde su ficha.
              </p>
            ) : vista.sinFecha ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Este juego no guarda cuándo se capturó cada pokémon: los nuevos se apuntan con la fecha de hoy.
              </p>
            ) : null}

            {vista.sinMapas ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                La app aún no sabe cómo se llama cada mapa del Añil, así que los nuevos se apuntan sin ruta (salvo los
                regalos con nombre). Ponla tú desde su ficha.
              </p>
            ) : null}

            {GRUPOS.map((grupo) => {
              const pasos = vista.pasos.filter((p) => grupo.tipo.includes(p.tipo));
              if (!pasos.length) return null;
              return (
                <section key={grupo.titulo}>
                  <h3 className="section-title">
                    {grupo.titulo} <span className="text-slate-500">· {pasos.length}</span>
                  </h3>
                  <p className="mb-2 text-xs text-slate-500">{grupo.pista}</p>
                  <ul className="divide-y divide-white/5">
                    {pasos.map((paso) => (
                      <li key={paso.clave}>
                        <label className="flex cursor-pointer items-start gap-3 py-2">
                          <input
                            type="checkbox"
                            className="mt-2"
                            checked={!quitados.has(paso.clave)}
                            onChange={() => alternar(paso.clave)}
                          />
                          {paso.pokemonId ? (
                            <SpritePokemon
                              src={null}
                              pokemonId={paso.pokemonId}
                              shiny={paso.shiny}
                              alt={paso.nombre}
                              className="h-10 w-10 shrink-0 object-contain"
                            />
                          ) : (
                            <span className="h-10 w-10 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-100">
                              {paso.nombre}
                              {paso.enElJuego ? <span className="font-normal text-slate-500"> · {paso.enElJuego}</span> : null}
                            </span>
                            {paso.detalle.map((linea, i) => (
                              <span key={i} className="block text-xs text-slate-400">
                                {linea}
                              </span>
                            ))}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <ul className="space-y-1 text-xs text-slate-500">
              {vista.iguales ? (
                <li>{vista.iguales === 1 ? "1 ya estaba al día." : `${vista.iguales} ya estaban al día.`}</li>
              ) : null}
              {vista.yaCaidos ? (
                <li>
                  {vista.yaCaidos === 1
                    ? "1 de la caja de caídos ya estaba en el cementerio."
                    : `${vista.yaCaidos} de la caja de caídos ya estaban en el cementerio.`}
                </li>
              ) : null}
              {vista.caidosEnLaApp.length ? (
                <li>
                  Vivos en el juego pero caídos en la app (se dejan): {vista.caidosEnLaApp.join(", ")}.
                </li>
              ) : null}
              {vista.soloEnLaApp.length ? (
                <li>En la app pero no en la partida (se dejan como están): {vista.soloEnLaApp.join(", ")}.</li>
              ) : null}
              {vista.desconocidos.length ? (
                <li>No sé qué pokémon son (se saltan): {vista.desconocidos.join(", ")}.</li>
              ) : null}
            </ul>

            {vista.pasos.length ? (
              <button type="button" className="btn-primary w-full" disabled={ocupado || !marcados} onClick={aplicar}>
                {ocupado ? "Un momento…" : `Aplicar ${marcados} ${marcados === 1 ? "cambio" : "cambios"}`}
              </button>
            ) : (
              <p className="text-sm text-slate-300">Todo está ya como en tu partida.</p>
            )}
          </div>
        ) : null}

        <FormMessage state={estado} />
      </div>
    </details>
  );
}
