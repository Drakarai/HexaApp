"use client";

import { useId, useState } from "react";
import {
  generacionDelJuego,
  juegoPorId,
  juegosPorGrupo,
  leerTipos,
  nombreDeRegion,
  puedeElegirTipos,
  regionesDelJuego,
  tiposPorDefecto,
  versionesDelJuego,
  type EleccionDeTipos,
} from "@/lib/juegos";
import { cx } from "@/lib/utils";

/**
 * En qué juego se juega la edición.
 *
 * Se elige de la lista, y de ahí sale **la región**, que es lo que decide qué
 * mapa se usa en el Mapa de capturas. Los juegos gemelos van **en pareja**
 * ("Rubí Omega y Zafiro Alfa") y luego cada jugador lleva una de las dos.
 * Los remakes van en su propio grupo pero apuntan a la región del original:
 * HeartGold usa el mapa de Johto.
 *
 * Y puede ser **no oficial**: un fangame, con su nombre escrito a mano y, si
 * se basa en un juego de la lista, ese juego como base (Pokémon Añil sobre
 * Rojo y Azul): de la base salen el mapa y la plantilla de level caps. Sin
 * base se empieza de cero, sin mapa de capturas.
 *
 * En modo oficial queda el campo de texto de siempre, que **no se ha quitado**:
 * las ediciones de antes tenían el juego escrito a mano y hay quien querrá
 * poner "HeartGold y SoulSilver, versión random".
 */
export function JuegoPicker({
  defaultGameId = "",
  defaultGame = "",
  defaultNoOficial = false,
  conTipos = false,
  defaultTipos = null,
}: {
  defaultGameId?: string | null;
  defaultGame?: string | null;
  defaultNoOficial?: boolean;
  /**
   * Si se pregunta con qué tipos se juega (ver `generacionDeTipos`). Al crear
   * y al editar sí; al pedir un locke no, que eso lo decide quien lo monta.
   */
  conTipos?: boolean;
  defaultTipos?: string | null;
}) {
  const [noOficial, setNoOficial] = useState(defaultNoOficial);
  const [gameId, setGameId] = useState(defaultGameId ?? "");
  // Lo elegido a mano; sin tocar, lo que toque al juego que esté puesto
  const [tiposElegidos, setTipos] = useState<EleccionDeTipos | null>(leerTipos(defaultTipos));
  const tipos = tiposElegidos ?? tiposPorDefecto(gameId);
  const eligeTipos = conTipos && puedeElegirTipos(gameId, noOficial);
  const generacion = generacionDelJuego(gameId);
  const campo = useId();
  const region = juegoPorId(gameId)?.region;
  /**
   * Los mapas no siempre son la región: la 2ª generación abre Kanto además de
   * Johto, y la 7ª se reparte en las cuatro islas de Alola.
   */
  const mapas = regionesDelJuego(gameId);
  const versiones = noOficial ? [] : versionesDelJuego(gameId);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            [false, "Oficial"],
            [true, "No oficial (fangame)"],
          ] as const
        ).map(([cual, rotulo]) => (
          <button
            key={rotulo}
            type="button"
            onClick={() => setNoOficial(cual)}
            aria-pressed={noOficial === cual}
            className={cx(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
              noOficial === cual
                ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {noOficial ? <input type="hidden" name="noOficial" value="on" /> : null}

      {noOficial ? (
        <div>
          <label className="label">Nombre del juego</label>
          <input
            // Se remonta al cambiar de modo: el texto de uno no vale para el otro
            key="fangame"
            name="game"
            className="input"
            defaultValue={defaultNoOficial ? (defaultGame ?? "") : ""}
            placeholder="Pokémon Añil"
            required
          />
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor={campo}>
          {noOficial ? "Basado en" : "Juego"}
        </label>
        <select
          id={campo}
          name="gameId"
          className="input"
          value={gameId}
          onChange={(evento) => setGameId(evento.target.value)}
        >
          <option value="">
            {noOficial ? "Nada, desde cero (sin mapa de capturas)" : "— Sin elegir —"}
          </option>
          {juegosPorGrupo(defaultGameId).map(([grupo, juegos]) => (
            <optgroup key={grupo} label={grupo}>
              {juegos.map((juego) => (
                <option key={juego.id} value={juego.id}>
                  {juego.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {region ? (
            <>
              {noOficial ? "Usa el mapa de " : "Se juega en "}
              <span className="text-slate-300">{nombreDeRegion(region)}</span>
              {mapas.length > 1 ? (
                <>
                  {" "}
                  y el Mapa de capturas traerá sus {mapas.length} mapas:{" "}
                  <span className="text-slate-300">
                    {mapas.map((mapa) => nombreDeRegion(mapa)).join(", ")}
                  </span>
                  .
                </>
              ) : noOficial ? (
                "."
              ) : (
                ", así que el Mapa de capturas usará ese mapa."
              )}
              {noOficial
                ? " Su plantilla de level caps se trae desde Level caps y se cambia a gusto."
                : null}
            </>
          ) : noOficial ? (
            "Sin base: los level caps se hacen a mano y no hay mapa de capturas."
          ) : (
            "Si lo eliges, cada jugador tendrá el mapa de esa región en Lo mío."
          )}
        </p>
        {versiones.length ? (
          <p className="mt-1 text-xs text-slate-500">
            Es una pareja: al apuntar a cada jugador se elige si lleva{" "}
            <span className="text-slate-300">{versiones.join(" o ")}</span>, o se reparten
            al azar.
          </p>
        ) : null}
      </div>

      {eligeTipos ? (
        <div>
          <p className="label">Tipos</p>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {(
              [
                ["antiguos", generacion ? `Los de la ${generacion}ª generación` : "Antiguos, sin Hada"],
                ["actuales", "Los de ahora"],
              ] as const
            ).map(([cual, rotulo]) => (
              <button
                key={cual}
                type="button"
                onClick={() => setTipos(cual)}
                aria-pressed={tipos === cual}
                className={cx(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                  tipos === cual
                    ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <input type="hidden" name="tipos" value={tipos} />
          <p className="mt-1 text-xs text-slate-500">
            {tipos === "antiguos"
              ? "Sin tipo Hada y con la tabla de entonces: Clefairy es Normal. Salen así en Equipo y PC y en la cobertura de tipos."
              : "Con tipo Hada y la tabla de hoy, como en los juegos nuevos y los simuladores."}
          </p>
        </div>
      ) : null}

      {noOficial ? null : (
        <div>
          <label className="label">Cómo llamarlo (opcional)</label>
          <input
            key="oficial"
            name="game"
            className="input"
            defaultValue={defaultNoOficial ? "" : (defaultGame ?? "")}
            placeholder="Pokémon HeartGold / SoulSilver, random"
          />
        </div>
      )}
    </div>
  );
}
