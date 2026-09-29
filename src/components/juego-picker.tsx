"use client";

import { useId, useState } from "react";
import {
  juegoPorId,
  juegosPorGrupo,
  nombreDeRegion,
  regionesDelJuego,
  versionesDelJuego,
} from "@/lib/juegos";

/**
 * En qué juego se juega la edición.
 *
 * Se elige de la lista, y de ahí sale **la región**, que es lo que decide qué
 * mapa se usa en el Mapa de capturas. Los juegos gemelos van **en pareja**
 * ("Rubí Omega y Zafiro Alfa") y luego cada jugador lleva una de las dos. Los remakes van en su propio grupo pero
 * apuntan a la región del original: HeartGold usa el mapa de Johto.
 *
 * Debajo queda el campo de texto de siempre, que **no se ha quitado**: las
 * ediciones de antes tenían el juego escrito a mano y hay quien querrá poner
 * "HeartGold y SoulSilver, versión random". Si eliges de la lista y no escribes
 * nada, se enseña el nombre de la lista.
 */
export function JuegoPicker({
  defaultGameId = "",
  defaultGame = "",
}: {
  defaultGameId?: string | null;
  defaultGame?: string | null;
}) {
  const [gameId, setGameId] = useState(defaultGameId ?? "");
  const campo = useId();
  const region = juegoPorId(gameId)?.region;
  /**
   * Los mapas no siempre son la región: la 2ª generación abre Kanto además de
   * Johto, y la 7ª se reparte en las cuatro islas de Alola.
   */
  const mapas = regionesDelJuego(gameId);

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor={campo}>
          Juego
        </label>
        <select
          id={campo}
          name="gameId"
          className="input"
          value={gameId}
          onChange={(evento) => setGameId(evento.target.value)}
        >
          <option value="">— Sin elegir —</option>
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
              Se juega en{" "}
              <span className="text-slate-300">{nombreDeRegion(region)}</span>,
              {mapas.length > 1 ? (
                <>
                  {" "}
                  así que el Mapa de capturas traerá sus {mapas.length} mapas:{" "}
                  <span className="text-slate-300">
                    {mapas.map((mapa) => nombreDeRegion(mapa)).join(", ")}
                  </span>
                  .
                </>
              ) : (
                " así que el Mapa de capturas usará ese mapa."
              )}
            </>
          ) : (
            "Si lo eliges, cada jugador tendrá el mapa de esa región en Lo mío."
          )}
        </p>
        {versionesDelJuego(gameId).length ? (
          <p className="mt-1 text-xs text-slate-500">
            Es una pareja: al apuntar a cada jugador se elige si lleva{" "}
            <span className="text-slate-300">{versionesDelJuego(gameId).join(" o ")}</span>, o
            se reparten al azar.
          </p>
        ) : null}
      </div>

      <div>
        <label className="label">Cómo llamarlo (opcional)</label>
        <input
          name="game"
          className="input"
          defaultValue={defaultGame ?? ""}
          placeholder="Pokémon HeartGold / SoulSilver, random"
        />
      </div>
    </div>
  );
}
