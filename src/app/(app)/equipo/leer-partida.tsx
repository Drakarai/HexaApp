"use client";

import { useRef, useState } from "react";
import { leerPartida, PartidaNoValida } from "@/lib/partida/essentials";
import { leerPartidaOficial, PartidaOficialNoValida } from "@/lib/partida/oficial";
import { FormMessage } from "@/components/ui";
import { cx } from "@/lib/utils";
import { PonerAlDia, type Leida } from "./poner-al-dia";

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

type VentanaDeFicheros = (opciones: {
  id?: string;
  multiple?: boolean;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ getFile: () => Promise<File> }[]>;

const TOPE_DEL_ANIL = 64 * 1024 * 1024;
const TOPE_DE_CONSOLA = 4 * 1024 * 1024;

export function LeerPartida({
  jugadores,
  miId,
  formato,
}: {
  jugadores: { id: string; displayName: string }[];
  miId: string | null;
  formato: FormatoParaLeer;
}) {
  const anil = formato.tipo === "anil";
  const [para, setPara] = useState(miId ?? jugadores[0]?.id ?? "");
  const [partida, setPartida] = useState<Leida | null>(null);
  const [estado, setEstado] = useState<{ error?: string; success?: string } | null>(null);
  const [encima, setEncima] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function alElegir(fichero: File | undefined) {
    if (!fichero) return;
    setPartida(null);
    setEstado(null);
    /**
     * Antes de leerlo, el tamaño: el fichero entero se carga en memoria, y
     * arrastrar un vídeo por error dejaba la pestaña colgada. La del Añil real
     * ronda los 6 MB y las de las consolas no llegan a 1 MB.
     */
    if (fichero.size > (anil ? TOPE_DEL_ANIL : TOPE_DE_CONSOLA)) {
      setPartida(null);
      setEstado({
        error: anil
          ? "Ese fichero es demasiado grande para ser una partida del Añil."
          : "Ese fichero es demasiado grande para ser una partida: las de las consolas no llegan a 1 MB.",
      });
      return;
    }
    try {
      const bytes = new Uint8Array(await fichero.arrayBuffer());
      const leida = anil ? leerPartida(bytes) : leerPartidaOficial(bytes);
      setPartida(leida);
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
              onChange={(evento) => setPara(evento.target.value)}
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
          <strong>{partida ? "Elegir otra partida" : "Elegir la partida"}</strong>
          {/* Arrastrar solo se puede con ratón: en el móvil es solo el botón */}
          <span className="hidden text-xs text-slate-500 [@media(pointer:fine)]:inline">o arrástrala aquí</span>
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

        {partida && para ? <PonerAlDia participantId={para} partida={partida} /> : null}

        <FormMessage state={estado} />
      </div>
    </details>
  );
}
