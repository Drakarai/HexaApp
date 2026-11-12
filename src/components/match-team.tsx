"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { startTransition, useOptimistic, useState } from "react";
import {
  addMatchPokemonAction,
  removeMatchPokemonAction,
} from "@/app/actions/match-teams";
import type { FormState } from "@/app/actions/auth";
import { leerRepeticionAction, leerShowdownAction } from "@/app/actions/showdown";
import type { JugadorDeLaRepeticion, PokemonDeShowdown } from "@/lib/showdown";
import { Avatar, ConfirmSubmit, FormMessage } from "@/components/ui";
import { SpeciesPicker } from "@/components/species-picker";
import { spriteMini } from "@/lib/sprites-de-quinta";
import { cx } from "@/lib/utils";
import { Hoja } from "@/components/hoja";
import { Pestanas } from "@/components/pestanas";
import { useEsAnil } from "@/components/juego-del-locke";
import { EstadisticasDelCombate, type QueSeMira } from "@/components/estadisticas-del-combate";

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
  repeticion,
  conEstadisticas = false,
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
  /** El enlace de la repetición del combate, si ya se apuntó: de ahí salen los equipos */
  repeticion?: string | null;
  /**
   * Que se puedan mirar sus números: tocar un pokémon enseña lo que hizo en
   * este combate, y sale el botón de las del combate entero. Solo en los de
   * jornada con repetición, que es de donde salen.
   */
  conEstadisticas?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [mira, setMira] = useState<QueSeMira | null>(null);
  const verNumeros = conEstadisticas && Boolean(repeticion);
  const alTocar = verNumeros
    ? (pokemon: TeamPokemon) =>
        setMira({ tipo: "pokemon", teamId: pokemon.id, nombre: pokemon.nickname ?? pokemon.species, imagen: pokemon.boxImage })
    : undefined;
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

  // Sin equipos apuntados, la repetición sigue teniendo sus números
  if (!hasTeams && !canManage && !verNumeros) return null;

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      {hasTeams ? (
        <>
          {/* Móvil: una tira de sprites por jugador, que es lo que cabe */}
          <div className="space-y-1.5 lg:hidden">
            {sides.map((side) => (
              <TeamRow key={side.participantId} side={side} aLaVez={aLaVez} alTocar={alTocar} />
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
                alTocar={alTocar}
              />
            ))}
          </div>
        </>
      ) : null}

      {verNumeros ? (
        <button
          type="button"
          className="btn-ghost btn-sm mt-2 mr-2"
          onClick={() => setMira({ tipo: "combate" })}
        >
          📊 Estadísticas del combate
        </button>
      ) : null}

      {mira ? <EstadisticasDelCombate matchId={matchId} mira={mira} onCerrar={() => setMira(null)} /> : null}

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
          sides={sides}
          repeticion={repeticion}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

function TeamRow({
  side,
  aLaVez = 1,
  alTocar,
}: {
  side: TeamSide;
  aLaVez?: number;
  alTocar?: (pokemon: TeamPokemon) => void;
}) {
  if (!side.team.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Avatar
        name={side.displayName}
        color={side.color}
        image={side.avatarImage}
        size={18}
        participantId={side.participantId}
      />
      {side.team.map((pokemon, index) => (
        <Sprite
          key={pokemon.id}
          pokemon={pokemon}
          owner={side.displayName}
          abre={aLaVez > 1 && index < aLaVez}
          alTocar={alTocar}
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
  alTocar,
}: {
  side: TeamSide;
  maximo?: number;
  casillas?: number;
  aLaVez?: number;
  alTocar?: (pokemon: TeamPokemon) => void;
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
          participantId={side.participantId}
        />
        <span className="min-w-0 truncate text-xs font-semibold text-slate-300">
          {side.displayName}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-slate-500">
          {side.team.length}/{maximo}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {huecos.map((pokemon, index) =>
          pokemon ? (
            <Casilla
              key={pokemon.id}
              alTocar={alTocar && (() => alTocar(pokemon))}
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
                  <SpritePokemon
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
            </Casilla>
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

/** Una casilla del equipo: un botón si se puede tocar para ver sus números */
function Casilla({
  alTocar,
  className,
  title,
  children,
}: {
  alTocar?: () => void;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  if (!alTocar) {
    return (
      <div title={title} className={className}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      title={`${title} · toca para ver lo que hizo`}
      onClick={alTocar}
      className={cx(className, "block text-left transition hover:bg-white/[0.08]")}
    >
      {children}
    </button>
  );
}

export function Sprite({
  pokemon,
  owner,
  size = 34,
  abre = false,
  alTocar,
}: {
  pokemon: TeamPokemon;
  owner: string;
  size?: number;
  /** Que es de los que salen al terreno al empezar (dobles, VGC) */
  abre?: boolean;
  alTocar?: (pokemon: TeamPokemon) => void;
}) {
  const Etiqueta = alTocar ? "button" : "span";
  return (
    <Etiqueta
      {...(alTocar ? { type: "button" as const, onClick: () => alTocar(pokemon) } : {})}
      title={`${pokemon.nickname ?? pokemon.species} (${pokemon.species}) de ${owner}${
        abre ? " · abre el combate" : ""
      }`}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-lg bg-white/[0.04]",
        abre && "ring-1 ring-brand-400/50",
        alTocar && "transition hover:bg-white/[0.1]",
      )}
      style={{ width: size, height: size }}
    >
      {pokemon.boxImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <SpritePokemon
          src={pokemon.boxImage}
          alt={pokemon.nickname ?? pokemon.species}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[11px] text-slate-500" aria-hidden>
          ?
        </span>
      )}
    </Etiqueta>
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
  sides,
  repeticion,
  onClose,
}: {
  matchId: string;
  esReto: boolean;
  levelCapId?: string;
  royaleId?: string;
  finalFourId?: string;
  rotulo?: string;
  maximo: number;
  sides: TeamSide[];
  repeticion?: string | null;
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
          ? spriteMini(pokemonId, formData.get("shiny") === "on")
          : null,
        participantId: dueno,
      });
      setState(await addMatchPokemonAction(null, formData));
    });

    // Ya está leído: se puede vaciar para escribir el siguiente
    setLimpiezas((veces) => veces + 1);
  }

  const [modo, setModo] = useState<"repeticion" | "mano" | "pegar">(
    repeticion && !levelCapId ? "repeticion" : "mano",
  );
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
  /**
   * Añade una lista de pokémon al equipo de alguien, uno detrás de otro con la
   * acción de siempre. Se salta los que ya están (misma especie y mote), para
   * poder volver a leer una repetición sin duplicar a nadie.
   */
  async function anadirLista(dueno: string, lista: PokemonDeShowdown[], avisos: string[]) {
    const lado = equipos.find((l) => l.participantId === dueno);
    const igual = (a: string | null, b: string | null) =>
      (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
    const nuevos = lista.filter(
      (p) => !lado?.team.some((t) => igual(t.species, p.especie) && igual(t.nickname, p.mote)),
    );
    const caben = Math.max(0, maximo - (lado?.team.length ?? 0));
    if (nuevos.length > caben) {
      avisos.push(
        caben
          ? `A ${lado?.displayName} solo le cabían ${caben}.`
          : `${lado?.displayName ?? "Ese equipo"} ya tenía ${maximo}.`,
      );
    }
    let metidos = 0;
    for (const pokemon of nuevos.slice(0, caben)) {
      const datos = deEsteCombate();
      datos.set("participantId", dueno);
      datos.set("species", pokemon.especie);
      if (pokemon.pokemonId) datos.set("pokemonId", String(pokemon.pokemonId));
      if (pokemon.shiny) datos.set("shiny", "on");
      if (pokemon.mote) datos.set("nickname", pokemon.mote);
      anadirALaVista({
        id: `pendiente-${Date.now()}-${dueno}-${metidos}`,
        species: pokemon.especie,
        nickname: pokemon.mote,
        boxImage: pokemon.pokemonId ? spriteMini(pokemon.pokemonId, pokemon.shiny) : null,
        participantId: dueno,
      });
      const respuesta = await addMatchPokemonAction(null, datos);
      if (respuesta?.error) {
        avisos.push(`${pokemon.mote ?? pokemon.especie}: ${respuesta.error}`);
        break;
      }
      metidos += 1;
    }
    return metidos;
  }

  function anadirPegados() {
    setLeyendo(true);
    startTransition(async () => {
      try {
        const leido = await leerShowdownAction(pegado);
        if (leido.error || !leido.equipo) {
          setState({ error: leido.error ?? "Eso no parece un equipo de Showdown." });
          return;
        }
        const avisos: string[] = leido.equipo.flatMap((p) => p.dudas);
        const metidos = await anadirLista(owner, leido.equipo, avisos);
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

  // De la repetición: los equipos de todos los del combate, y de quién es cada uno
  const [enlace, setEnlace] = useState(repeticion ?? "");
  const anil = useEsAnil();
  const [deLaRepeticion, setDeLaRepeticion] = useState<JugadorDeLaRepeticion[] | null>(null);
  const [quienEs, setQuienEs] = useState<string[]>([]);

  function leerLaRepeticion() {
    setLeyendo(true);
    startTransition(async () => {
      try {
        const leida = await leerRepeticionAction(enlace);
        if (leida.error || !leida.jugadores) {
          setState({ error: leida.error ?? "No he podido leer esa repetición." });
          return;
        }
        setState(null);
        setDeLaRepeticion(leida.jugadores);
        setQuienEs(adivinarQuienEs(leida.jugadores, sides));
      } catch {
        setState({ error: "Sin conexión: esto necesita línea. Prueba cuando vuelva." });
      } finally {
        setLeyendo(false);
      }
    });
  }

  function anadirDeLaRepeticion() {
    if (!deLaRepeticion) return;
    setLeyendo(true);
    startTransition(async () => {
      try {
        const avisos: string[] = [];
        let metidos = 0;
        for (const [i, jugador] of deLaRepeticion.entries()) {
          if (!quienEs[i]) continue;
          avisos.push(...jugador.equipo.flatMap((p) => p.dudas));
          metidos += await anadirLista(quienEs[i], jugador.equipo, avisos);
        }
        setDeLaRepeticion(null);
        setState(
          avisos.length
            ? { error: `Añadidos ${metidos}. ${avisos.join(" ")}` }
            : { success: metidos ? `Añadidos ${metidos} de la repetición.` : "Ya estaban todos." },
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
          <p className="antetitulo">
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

      {/**
       * Tres formas de añadir, y se ve una: apiladas, el editor se había vuelto
       * un pergamino. Si el combate ya tiene repetición se abre en esa, que es
       * la que menos se teclea.
       */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <Pestanas
          ancha
          etiqueta="Cómo añadir"
          valor={modo}
          onCambiar={setModo}
          opciones={[
            ...(levelCapId ? [] : [{ valor: "repeticion" as const, rotulo: "Repetición" }]),
            { valor: "mano" as const, rotulo: "A mano" },
            { valor: "pegar" as const, rotulo: "Pegar" },
          ]}
        />
        <div className="mt-3">
          {modo === "repeticion" ? (
            <div>
            <p className="text-xs text-slate-500">
              Con el enlace de la repetición de Showdown salen la especie y el mote de los pokémon de
              cada uno. Los motes, de los que llegaron a salir al campo.
              {anil ? " Si el combate no está en Showdown, también vale el enlace de la web de repeticiones del servidor de Añil." : ""}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="input min-w-0 flex-1 text-sm"
                value={enlace}
                onChange={(evento) => setEnlace(evento.target.value)}
                placeholder={anil ? "replay.pokemonshowdown.com/… o ….pages.dev/replays/…" : "https://replay.pokemonshowdown.com/…"}
                inputMode="url"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-ghost btn-sm shrink-0"
                disabled={leyendo || !enlace.trim()}
                onClick={leerLaRepeticion}
              >
                {leyendo && !deLaRepeticion ? "Leyendo…" : "Leer"}
              </button>
            </div>
            {deLaRepeticion ? (
              <div className="mt-3 space-y-2">
                {deLaRepeticion.map((jugador, i) => (
                  <div key={jugador.lado} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{jugador.nombre}</span>
                      <span className="text-xs text-slate-500">
                        {jugador.equipo.length} pokémon{jugador.completo ? "" : ", solo los que salieron"}
                      </span>
                      <select
                        className="input ml-auto w-auto py-1 text-sm"
                        value={quienEs[i] ?? ""}
                        onChange={(evento) =>
                          setQuienEs((antes) => {
                            const nuevo = [...antes];
                            nuevo[i] = evento.target.value;
                            return nuevo;
                          })
                        }
                        aria-label={`Quién es ${jugador.nombre}`}
                      >
                        <option value="">No añadir</option>
                        {sides.map((lado) => (
                          <option key={lado.participantId} value={lado.participantId}>
                            Es {lado.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {jugador.equipo.map((p) => (p.mote ? `${p.mote} (${p.especie})` : p.especie)).join(" · ")}
                    </p>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={leyendo || !quienEs.some(Boolean)}
                  onClick={anadirDeLaRepeticion}
                >
                  {leyendo ? "Añadiendo…" : "Añadir los equipos"}
                </button>
              </div>
            ) : null}
            </div>
          ) : modo === "pegar" ? (
            <div>
            {sides.length > 1 ? (
              <select
                className="input mb-2"
                value={owner}
                onChange={(evento) => setOwner(evento.target.value)}
                aria-label="De quién es el equipo"
              >
                {sides.map((side) => (
                  <option key={side.participantId} value={side.participantId}>
                    El equipo de {side.displayName}
                  </option>
                ))}
              </select>
            ) : null}
            <p className="text-xs text-slate-500">
              En Showdown, en el Teambuilder, «Import/Export» y copia el texto. Se añaden a{" "}
              <span className="text-slate-300">
                {sides.find((l) => l.participantId === owner)?.displayName}
              </span>{" "}
              con sus motes.
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
            </div>
          ) : (
          <form
            onSubmit={enviar}
            className="space-y-3"
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
            {/* Sin bloquearse mientras guarda: se pueden encadenar varios */}
            <button type="submit" className="btn-primary">
              Añadir al equipo
            </button>
          </form>
          )}
        </div>
        <FormMessage state={state} />
      </div>
    </Hoja>
  );
}

/**
 * Quién es quién en la repetición: el nombre de Showdown casi nunca es el de
 * aquí, así que se prueba por parecido («Draka Sama» es Draka) y, si quedan
 * dos sin saber, por orden. Es solo lo que sale marcado: se cambia a mano.
 */
function adivinarQuienEs(jugadores: JugadorDeLaRepeticion[], sides: TeamSide[]) {
  const plano = (texto: string) =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const elegidos: string[] = jugadores.map(() => "");
  const libres = new Set(sides.map((lado) => lado.participantId));
  jugadores.forEach((jugador, i) => {
    const suyo = plano(jugador.nombre);
    const parecido = sides.find((lado) => {
      const aqui = plano(lado.displayName);
      return libres.has(lado.participantId) && aqui && suyo && (suyo.includes(aqui) || aqui.includes(suyo));
    });
    if (parecido) {
      elegidos[i] = parecido.participantId;
      libres.delete(parecido.participantId);
    }
  });
  // Por orden, solo si cuadra uno a uno: el primero de la repetición, el primero de aquí
  const sinSaber = jugadores.map((_, i) => i).filter((i) => !elegidos[i]);
  const quedan = sides.filter((lado) => libres.has(lado.participantId));
  if (sinSaber.length === quedan.length) sinSaber.forEach((i, k) => (elegidos[i] = quedan[k].participantId));
  return elegidos;
}
