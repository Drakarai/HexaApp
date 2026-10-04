"use client";

import { startTransition, useOptimistic, useState } from "react";
import {
  addMatchPokemonAction,
  removeMatchPokemonAction,
} from "@/app/actions/match-teams";
import type { FormState } from "@/app/actions/auth";
import { leerShowdownAction } from "@/app/actions/showdown";
import { Avatar, ConfirmSubmit, FormMessage } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { spriteCandidates } from "@/lib/pokedex";
import { cx } from "@/lib/utils";
import { Hoja } from "@/components/hoja";

export type TeamPokemon = {
  id: string;
  species: string;
  nickname: string | null;
  boxImage: string | null;
};

export type TeamSide = {
  participantId: string;
  displayName: string;
  color: string;
  avatarImage: string | null;
  team: TeamPokemon[];
};

/**
 * Los dos equipos de un combate, debajo del emparejamiento. Se ven los sprites
 * de caja de Pokémon HOME, que es lo que se pide aquí: la ilustración grande
 * queda para la ficha del MVP.
 */
export function MatchTeams({
  matchId,
  sides,
  canManage,
  esReto = false,
  levelCapId,
  royaleId,
  finalFourId,
  rotulo,
  maximo = 6,
  aLaVez = 1,
}: {
  matchId: string;
  /**
   * Uno o dos. Dos en un combate, y **uno** en el equipo con el que alguien se
   * pasó un gimnasio: allí no hay rival, solo el equipo que sacaste.
   */
  sides: TeamSide[];
  canManage: boolean;
  /** Los retos usan el mismo editor, solo cambia dónde se guarda */
  esReto?: boolean;
  /** Si viene, el equipo es el de ese gimnasio y no el de un combate */
  levelCapId?: string;
  /** Y si viene este, el de un Battle Royale */
  royaleId?: string;
  /** Y este, el equipo con el que se juega la final entera */
  finalFourId?: string;
  /** Qué poner en la cabecera del editor */
  rotulo?: string;
  /** Cuántos pokémon caben, que en VGC son cuatro y no seis */
  maximo?: number;
  /** Cuántos salen a la vez: en dobles se marcan los que abren */
  aLaVez?: number;
}) {
  const [editing, setEditing] = useState(false);
  const hasTeams = sides.some((side) => side.team.length > 0);

  /**
   * Cuántas casillas se pintan. No son siempre las del formato: se pintan las
   * del equipo **más largo de este combate**. Así las dos cajas siguen midiendo
   * igual —que es para lo que estaban los huecos— pero cuando los dos han
   * sacado tres pokémon no quedan seis cuadros vacíos debajo de cada combate.
   */
  const casillas = Math.min(
    maximo,
    Math.max(1, ...sides.map((side) => side.team.length)),
  );

  if (!hasTeams && !canManage) return null;

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      {hasTeams ? (
        <>
          {/* Móvil: una tira de sprites por jugador, que es lo que cabe */}
          <div className="space-y-1.5 lg:hidden">
            {sides.map((side) => (
              <TeamRow key={side.participantId} side={side} aLaVez={aLaVez} />
            ))}
          </div>

          {/* PC: los equipos como cajas de 3x2, una al lado de la otra */}
          <div
            className={cx(
              "hidden gap-3 lg:grid",
              sides.length > 1 ? "lg:grid-cols-2" : "lg:max-w-sm",
            )}
          >
            {sides.map((side) => (
              <TeamBox
                key={side.participantId}
                side={side}
                maximo={maximo}
                casillas={casillas}
                aLaVez={aLaVez}
              />
            ))}
          </div>
        </>
      ) : null}

      {canManage ? (
        <button
          type="button"
          className="btn-ghost btn-sm mt-2"
          onClick={() => setEditing(true)}
        >
          {sides.length > 1
            ? hasTeams
              ? "✎ Cambiar equipos"
              : "＋ Apuntar equipos"
            : hasTeams
            ? "✎ Cambiar el equipo"
            : // En la final es "el equipo con el que juegas", no "con el que lo
              // pasaste", que eso es del gimnasio de un locke en solitario
              finalFourId
              ? "＋ Apuntar el equipo"
              : "＋ Apuntar con qué lo pasaste"}
        </button>
      ) : null}

      {editing ? (
        <TeamEditor
          matchId={matchId}
          esReto={esReto}
          levelCapId={levelCapId}
          royaleId={royaleId}
          finalFourId={finalFourId}
          rotulo={rotulo}
          maximo={maximo}
          aLaVez={aLaVez}
          sides={sides}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

function TeamRow({ side, aLaVez = 1 }: { side: TeamSide; aLaVez?: number }) {
  if (!side.team.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Avatar
        name={side.displayName}
        color={side.color}
        image={side.avatarImage}
        size={18}
      />
      {side.team.map((pokemon, index) => (
        <Sprite
          key={pokemon.id}
          pokemon={pokemon}
          owner={side.displayName}
          abre={aLaVez > 1 && index < aLaVez}
        />
      ))}
    </div>
  );
}

/**
 * El equipo como una caja, al estilo del equipo de un juego. Los huecos que
 * faltan se pintan en punteado para que las dos cajas de un combate midan igual
 * y se lean de un vistazo, pero solo hasta donde llegue el equipo más largo:
 * ver `casillas` en `MatchTeams`. `maximo` sigue siendo el del formato —seis en
 * singles, cuatro en VGC— porque es lo que dice el contador de la esquina.
 */
function TeamBox({
  side,
  maximo = 6,
  casillas = maximo,
  aLaVez = 1,
}: {
  side: TeamSide;
  maximo?: number;
  casillas?: number;
  aLaVez?: number;
}) {
  const huecos = Array.from({ length: casillas }, (_, index) => side.team[index] ?? null);

  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] p-2">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Avatar
          name={side.displayName}
          color={side.color}
          image={side.avatarImage}
          size={20}
        />
        <span className="min-w-0 truncate text-xs font-semibold text-slate-300">
          {side.displayName}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-slate-600">
          {side.team.length}/{maximo}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {huecos.map((pokemon, index) =>
          pokemon ? (
            <div
              key={pokemon.id}
              title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species})${
                aLaVez > 1 && index < aLaVez ? " · abre el combate" : ""
              }`}
              className={cx(
                "min-w-0 rounded-lg border bg-white/[0.04] p-1",
                // En dobles y VGC, los primeros son los que salen al terreno
                aLaVez > 1 && index < aLaVez
                  ? "border-brand-400/50 ring-1 ring-brand-400/30"
                  : "border-white/5",
              )}
            >
              <div className="flex h-16 items-center justify-center">
                {pokemon.boxImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={pokemon.boxImage}
                    alt={pokemon.nickname ?? pokemon.species}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-lg text-slate-600" aria-hidden>
                    ?
                  </span>
                )}
              </div>
              <p className="truncate text-center text-[11px] text-slate-400">
                {pokemon.nickname ?? pokemon.species}
              </p>
            </div>
          ) : (
            <div
              key={`hueco-${index}`}
              aria-hidden
              className="rounded-lg border border-dashed border-white/[0.07]"
            >
              <div className="h-16" />
              <p className="text-[11px]">&nbsp;</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function Sprite({
  pokemon,
  owner,
  size = 34,
  abre = false,
}: {
  pokemon: TeamPokemon;
  owner: string;
  size?: number;
  /** Que es de los que salen al terreno al empezar (dobles, VGC) */
  abre?: boolean;
}) {
  return (
    <span
      title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species}) de ${owner}${
        abre ? " · abre el combate" : ""
      }`}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-lg bg-white/[0.04]",
        abre && "ring-1 ring-brand-400/50",
      )}
      style={{ width: size, height: size }}
    >
      {pokemon.boxImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={pokemon.boxImage}
          alt={pokemon.nickname ?? pokemon.species}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[10px] text-slate-500" aria-hidden>
          ?
        </span>
      )}
    </span>
  );
}

function TeamEditor({
  matchId,
  esReto,
  levelCapId,
  royaleId,
  finalFourId,
  rotulo,
  maximo,
  aLaVez,
  sides,
  onClose,
}: {
  matchId: string;
  esReto: boolean;
  levelCapId?: string;
  royaleId?: string;
  finalFourId?: string;
  rotulo?: string;
  maximo: number;
  aLaVez: number;
  sides: TeamSide[];
  onClose: () => void;
}) {
  /**
   * El pokémon aparece en su equipo nada más darle a añadir, sin esperar al
   * servidor. Lo que se espera son unos 600 ms —descargar las imágenes y volver
   * a generar la página— y apuntar un equipo son seis seguidos: esperando cada
   * vez se hacía pesadísimo. Cuando el servidor contesta, la lista de verdad
   * sustituye a esta; si falla, el pokémon desaparece solo y sale el aviso.
   */
  const [equipos, anadirALaVista] = useOptimistic(
    sides,
    (actuales, recien: TeamPokemon & { participantId: string }) =>
      actuales.map((lado) =>
        lado.participantId === recien.participantId
          ? { ...lado, team: [...lado.team, recien] }
          : lado,
      ),
  );

  const [state, setState] = useState<FormState>(null);
  // El dueño se queda como lo dejaste: apuntar un equipo entero es meter seis
  // seguidos del mismo, y volver al primero del combate cada vez era un lío.
  const [owner, setOwner] = useState(sides[0].participantId);
  // El buscador y el mote se vacían remontándolos: los dos llevan estado
  // propio, así que un reset() del formulario no los limpiaría.
  const [limpiezas, setLimpiezas] = useState(0);

  /**
   * El envío se hace a mano en vez de con `action={...}` para mandar el orden:
   * primero se lee el formulario, luego se vacía. Dejándoselo a React, la
   * limpieza caía a destiempo y se perdía el mote del pokémon.
   */
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const formData = new FormData(formulario);

    const especie = String(formData.get("species") ?? "").trim();
    if (!especie) return;

    const pokemonId = Number(formData.get("pokemonId") ?? 0);
    const dueno = String(formData.get("participantId") ?? "");

    startTransition(async () => {
      anadirALaVista({
        // Provisional: al llegar la respuesta manda la lista del servidor
        id: `pendiente-${Date.now()}`,
        species: especie,
        nickname: String(formData.get("nickname") ?? "").trim() || null,
        // El sprite pequeño de siempre, que pesa unos 900 bytes
        boxImage: pokemonId
          ? spriteCandidates(pokemonId, formData.get("shiny") === "on", "mini")[0]
          : null,
        participantId: dueno,
      });
      setState(await addMatchPokemonAction(null, formData));
    });

    // Ya está leído: se puede vaciar para escribir el siguiente
    setLimpiezas((veces) => veces + 1);
  }

  const [pegado, setPegado] = useState("");
  const [leyendo, setLeyendo] = useState(false);

  /** Los campos ocultos del formulario, que dicen de qué combate es el equipo */
  function deEsteCombate() {
    const datos = new FormData();
    datos.set("matchId", matchId);
    if (esReto) datos.set("esReto", "1");
    if (royaleId) datos.set("royaleId", royaleId);
    if (levelCapId) datos.set("levelCapId", levelCapId);
    if (finalFourId) datos.set("finalFourId", finalFourId);
    return datos;
  }

  /**
   * Pegar el equipo exportado de Showdown: se lee en el servidor y se añaden
   * uno a uno con la misma acción que el botón de siempre (mismos permisos,
   * mismo tope del formato y mismas imágenes). Uno detrás de otro y no a la
   * vez, porque cada uno va en el hueco siguiente al anterior.
   */
  function anadirPegados() {
    const lado = equipos.find((l) => l.participantId === owner);
    const caben = maximo - (lado?.team.length ?? 0);
    setLeyendo(true);
    startTransition(async () => {
      try {
        const leido = await leerShowdownAction(pegado);
        if (leido.error || !leido.equipo) {
          setState({ error: leido.error ?? "Eso no parece un equipo de Showdown." });
          return;
        }
        if (caben <= 0) {
          setState({ error: `${lado?.displayName ?? "Ese equipo"} ya tiene ${maximo}.` });
          return;
        }
        const avisos: string[] = leido.equipo.flatMap((p) => p.dudas);
        const aMeter = leido.equipo.slice(0, caben);
        if (leido.equipo.length > caben) {
          avisos.push(`Solo cabían ${caben}: se han quedado fuera ${leido.equipo.length - caben}.`);
        }
        let metidos = 0;
        for (const pokemon of aMeter) {
          const datos = deEsteCombate();
          datos.set("participantId", owner);
          datos.set("species", pokemon.especie);
          if (pokemon.pokemonId) datos.set("pokemonId", String(pokemon.pokemonId));
          if (pokemon.shiny) datos.set("shiny", "on");
          if (pokemon.mote) datos.set("nickname", pokemon.mote);
          anadirALaVista({
            id: `pendiente-${Date.now()}-${metidos}`,
            species: pokemon.especie,
            nickname: pokemon.mote,
            boxImage: pokemon.pokemonId ? spriteCandidates(pokemon.pokemonId, pokemon.shiny, "mini")[0] : null,
            participantId: owner,
          });
          const respuesta = await addMatchPokemonAction(null, datos);
          if (respuesta?.error) {
            avisos.push(`${pokemon.mote ?? pokemon.especie}: ${respuesta.error}`);
            break;
          }
          metidos += 1;
        }
        setPegado("");
        setState(
          avisos.length
            ? { error: `Añadidos ${metidos}. ${avisos.join(" ")}` }
            : { success: `Añadidos ${metidos} de Showdown.` },
        );
      } catch {
        setState({ error: "Sin conexión: esto necesita línea. Prueba cuando vuelva." });
      } finally {
        setLeyendo(false);
      }
    });
  }

  // Portal, como el resto de diálogos: las tarjetas llevan backdrop-blur y eso
  // rompe el posicionamiento fijo de lo que tienen dentro.
  return (
    <Hoja onCerrar={onClose} ancho="max-w-lg" fondo="bg-black/70" className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400">
            {sides.length > 1 ? "Equipos del combate" : "El equipo que sacaste"}
          </p>
          <p className="text-sm text-slate-400">
            {rotulo ??
              (sides.length > 1
                ? `${sides[0].displayName} vs ${sides[1].displayName}`
                : sides[0].displayName)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost btn-sm"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {equipos.map((side) => (
          <div
            key={side.participantId}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <Avatar
                name={side.displayName}
                color={side.color}
                image={side.avatarImage}
                size={20}
              />
              <span className="text-sm font-semibold text-white">
                {side.displayName}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {side.team.length}/{maximo}
              </span>
            </div>

            {side.team.length ? (
              <ul className="flex flex-wrap gap-2">
                {side.team.map((pokemon) => (
                  <li
                    key={pokemon.id}
                    className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.04] py-1 pl-1 pr-1.5"
                  >
                    <Sprite pokemon={pokemon} owner={side.displayName} size={28} />
                    <span className="text-xs text-slate-300">
                      {pokemon.nickname ?? pokemon.species}
                    </span>
                    <form action={removeMatchPokemonAction}>
                      <input
                        type="hidden"
                        name="matchPokemonId"
                        value={pokemon.id}
                      />
                      <ConfirmSubmit
                        message={`¿Quitar a ${pokemon.nickname ?? pokemon.species} del equipo?`}
                        className="btn-ghost btn-sm px-1.5"
                        title="Quitar del equipo"
                      >
                        ✕
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin pokémon todavía.</p>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={enviar}
        className="mt-4 space-y-3 border-t border-white/10 pt-4"
      >
        <input type="hidden" name="matchId" value={matchId} />
        {esReto ? <input type="hidden" name="esReto" value="1" /> : null}
        {/* Con esto el servidor sabe que el equipo es el de un gimnasio */}
        {royaleId ? (
          <input type="hidden" name="royaleId" value={royaleId} />
        ) : null}
        {levelCapId ? (
          <input type="hidden" name="levelCapId" value={levelCapId} />
        ) : null}
        {finalFourId ? (
          <input type="hidden" name="finalFourId" value={finalFourId} />
        ) : null}
        <SpeciesPicker key={limpiezas} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Entrenador</label>
            <select
              name="participantId"
              className="input"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            >
              {sides.map((side) => (
                <option key={side.participantId} value={side.participantId}>
                  {side.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mote</label>
            <input
              key={limpiezas}
              name="nickname"
              className="input"
              placeholder="Chispas"
            />
          </div>
        </div>
        <FormMessage state={state} />
        {/* Sin bloquearse mientras guarda: se pueden encadenar varios */}
        <button type="submit" className="btn-primary">
          Añadir al equipo
        </button>
      </form>

      {/* El equipo entero de golpe, copiado del «Export» del Teambuilder */}
      <details className="group mt-3 rounded-xl border border-white/10 px-3 py-2">
        <summary className="cursor-pointer list-none text-sm text-slate-300">
          <span className="mr-1.5 inline-block transition group-open:rotate-90">▸</span>
          Pegar el equipo de Showdown
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          En Showdown, en el Teambuilder, «Import/Export» y copia el texto. Se añaden a{" "}
          <span className="text-slate-300">
            {sides.find((l) => l.participantId === owner)?.displayName}
          </span>{" "}
          (el entrenador de arriba), con sus motes.
        </p>
        <textarea
          className="input mt-2 min-h-32 font-mono text-xs"
          value={pegado}
          onChange={(evento) => setPegado(evento.target.value)}
          placeholder={"Brasas (Charizard) @ Leftovers\nAbility: Blaze\n- Flamethrower\n\nGarchomp @ Choice Scarf\n- Earthquake"}
        />
        <button
          type="button"
          className="btn-ghost btn-sm mt-2"
          disabled={leyendo || !pegado.trim()}
          onClick={anadirPegados}
        >
          {leyendo ? "Añadiendo…" : "Añadir los del texto"}
        </button>
      </details>
    </Hoja>
  );
}
