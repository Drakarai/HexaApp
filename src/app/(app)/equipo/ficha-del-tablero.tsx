"use client";

import { useEffect, useState, useTransition } from "react";
import { Icono } from "@/components/icono";
import { Hoja } from "@/components/hoja";
import { nombreDeCaja } from "@/lib/fondos-de-caja";
import { AnimacionDeEvolucion, type ResultadoDeEvolucion } from "./evolucion";
import { cx } from "@/lib/utils";
import { compartirImagen } from "@/lib/compartir-imagen";
import { sonarGrito, TONO_DE_CAIDO } from "@/lib/gritos";
import { HistoriaDelPokemon } from "@/components/historia-del-pokemon";
import { Pestanas } from "@/components/pestanas";
import { CabeceraDeFicha } from "@/components/cabecera-de-ficha";
import { FichaDeCombate } from "./ficha-de-combate";
import { Debilidades } from "./debilidades";
import { Intercambio } from "./intercambio";
import { CopiarParaShowdown } from "./exportar-showdown";
import { HUECOS_POR_CAJA, colocar, companerasDe, sePuedenVincular } from "@/lib/equipo-y-caja";
import type { PokemonDelTablero, TableroDeJugador } from "@/lib/soul-link";
import type { OpcionDeEvolucion } from "@/lib/evoluciones";
import {
  borrarDeLaCajaAction,
  cambiarMoteAction,
  cambiarShinyAction,
  intercambiarAction,
  revivirAction,
  darPorMuertoAction,
  desvincularAction,
  deshacerEnCajaAction,
  evolucionarAction,
  moverPokemonAction,
  vincularAction,
} from "@/app/actions/equipo-y-caja";
import { directaConCola, sinConexion } from "@/lib/acciones-sin-conexion";
import { elegirAsAction } from "@/app/actions/aces";
import { SitioPicker } from "@/components/sitio-picker";
import type { ZonaParaElegir } from "@/lib/mapas";
import { Sprite, SpriteAnimado } from "./casilla";
import type { Aviso } from "./tablero";

/**
 * La ficha de un pokémon del Equipo y PC: lo que sale al tocarlo, con sus
 * tres pestañas y todo lo que se le puede hacer. Ver `tablero.tsx`.
 */
/** Lo que piden las cuentas de vínculos: el tablero no sabe de zonas */
export function vinculables(pokemon: PokemonDelTablero[]) {
  return pokemon.map((p) => ({ ...p, zoneId: null }));
}

// ---------------------------------------------------------------------------
// La ficha
// ---------------------------------------------------------------------------

export function Ficha({
  pokemon,
  tableros,
  todos,
  numero,
  nivel,
  esSoulLink,
  zonas,
  onCerrar,
  onAviso,
}: {
  pokemon: PokemonDelTablero;
  tableros: TableroDeJugador[];
  todos: PokemonDelTablero[];
  numero: number | undefined;
  nivel: number | null;
  esSoulLink: boolean;
  zonas: ZonaParaElegir[];
  onCerrar: () => void;
  onAviso: (aviso: Aviso) => void;
}) {
  const [pendiente, empezar] = useTransition();
  const [causa, setCausa] = useState("");
  // Dónde cayó: como en el cementerio, una zona del mapa o escrito a mano
  const [sitio, setSitio] = useState<{ zoneId: string | null; location: string | null }>({
    zoneId: null,
    location: null,
  });
  // Evolucionar va en dos pasos: primero se elige, luego se confirma
  const [aEvolucionar, setAEvolucionar] = useState<OpcionDeEvolucion | null>(null);
  // Y justo después, su deshacer: a qué evolucionó y cómo se llama el cambio
  const [evolucionado, setEvolucionado] = useState<{ rotulo: string; deshacer: string } | null>(
    null,
  );
  // La animación de la evolución, mientras se ve
  const [animacion, setAnimacion] = useState<{
    antes: string | null;
    despues: string | null;
    nombre: string;
    nueva: string;
    resultado: ResultadoDeEvolucion;
    gritoAntes: number | null;
    gritoDespues: number | null;
    shiny: boolean;
  } | null>(null);
  const [mote, setMote] = useState(pokemon.nickname ?? "");
  // Si cambia por fuera (un intercambio, deshacer), el campo con él
  useEffect(() => setMote(pokemon.nickname ?? ""), [pokemon.nickname]);
  // La ráfaga de destellos: un número que cambia cada vez, para que se repita
  const [rafaga, setRafaga] = useState(0);

  function cambiarShiny(shiny: boolean) {
    const nombre = pokemon.nickname ?? pokemon.species;
    const pregunta = shiny
      ? `¿${nombre} pasa a ser shiny? Se le pone su sprite variocolor. Se puede deshacer.`
      : `¿Quitarle lo shiny a ${nombre}? Es para si se marcó sin querer.`;
    if (!window.confirm(pregunta)) return;
    empezar(async () => {
      const respuesta = await sinConexion(() => cambiarShinyAction({ captureId: pokemon.id, shiny }));
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      onAviso({ tipo: "ok", texto: respuesta.aviso ?? "Hecho." });
      if (shiny) {
        setRafaga(Date.now());
        sonarGrito(pokemon.pokemonId);
        navigator.vibrate?.([20, 40, 20]);
      }
    });
  }
  function revivir() {
    const bajaId = pokemon.bajaId;
    if (!bajaId) return;
    const nombre = pokemon.nickname ?? pokemon.species;
    if (
      !window.confirm(
        `¿Revivir a ${nombre}? Vuelve al equipo si hay hueco, y si no a la caja. Su baja se queda en el cementerio y sigue contando. Se puede deshacer.`,
      )
    ) {
      return;
    }
    empezar(async () => {
      const respuesta = await sinConexion(() => revivirAction({ deathId: bajaId }));
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      onAviso({ tipo: "ok", texto: respuesta.aviso ?? "Hecho." });
      // Con su grito de siempre, no el grave de caído: ha vuelto
      sonarGrito(pokemon.pokemonId);
    });
  }
  function intercambiar(datos: { species: string; pokemonId: number | null; nickname: string; shiny: boolean }) {
    empezar(async () => {
      const respuesta = await sinConexion(() => intercambiarAction({ captureId: pokemon.id, ...datos }));
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      onAviso({ tipo: "ok", texto: respuesta.aviso ?? "Hecho." });
      // El que llega se presenta, como al salir de una Poké Ball
      sonarGrito(datos.pokemonId);
    });
  }
  /**
   * Nombrarlo as de su entrenador, desde su propia ficha: el as se elige de la
   * caja, y este es el sitio donde se tiene delante. El que lo era deja de
   * serlo, y queda en la historia de los dos.
   */
  function hacerAs() {
    const nombre = pokemon.nickname ?? pokemon.species;
    if (!window.confirm(`¿${nombre} pasa a ser el pokémon as? Sale en la clasificación y te acompaña arriba.`)) return;
    empezar(async () => {
      try {
        const respuesta = await elegirAsAction({ participantId: pokemon.participantId, captureId: pokemon.id, reason: "" });
        onAviso(respuesta.error ? { tipo: "error", texto: respuesta.error } : { tipo: "ok", texto: respuesta.success ?? "Hecho." });
        if (!respuesta.error) sonarGrito(pokemon.pokemonId);
      } catch {
        onAviso({ tipo: "error", texto: "Sin conexión: el as se cambia con línea." });
      }
    });
  }
  const [conId, setConId] = useState("");
  const dueno = tableros.find((t) => t.participantId === pokemon.participantId)!;
  const editable = dueno.editable && !pokemon.muerta;
  // Las cajas del dueño y en cuál está este, para «Mover a la caja…»
  const cajaDelDueno = colocar(dueno.vivos).caja;
  const cajasDelDueno = cajaDelDueno.length / HUECOS_POR_CAJA;
  const posicionEnCaja = cajaDelDueno.findIndex((p) => p?.id === pokemon.id);
  const cajaActual = posicionEnCaja >= 0 ? Math.floor(posicionEnCaja / HUECOS_POR_CAJA) : null;
  const nombreDe = (id: string) => tableros.find((t) => t.participantId === id)?.displayName ?? "";

  const lista = vinculables(todos);
  const companeras = companerasDe(lista, pokemon.id);
  const companerasVivas = companeras.filter((c) => !c.muerta);
  // Con quién se podría vincular: lo decide la misma cuenta que el servidor
  const candidatas = esSoulLink
    ? todos.filter(
        (otra) => !otra.muerta && sePuedenVincular(lista, pokemon.id, otra.id) === null,
      )
    : [];

  function lanzar(
    accion: () => Promise<{ error?: string; aviso?: string }>,
    { cerrar = false, ok }: { cerrar?: boolean; ok?: string } = {},
  ) {
    empezar(async () => {
      // Lo que no se encola avisa de que hace falta línea en vez de romperse
      const respuesta = await sinConexion(accion);
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      if (respuesta.aviso || ok) onAviso({ tipo: "ok", texto: respuesta.aviso ?? ok! });
      if (cerrar) onCerrar();
    });
  }

  function evolucionar() {
    const opcion = aEvolucionar;
    if (!opcion) return;
    // La animación arranca ya, con el sprite de ahora; el nuevo llega con la respuesta
    setAnimacion({
      antes: pokemon.imagen,
      despues: null,
      nombre: pokemon.nickname ?? pokemon.species,
      nueva: opcion.rotulo,
      resultado: "esperando",
      gritoAntes: pokemon.pokemonId,
      gritoDespues: opcion.pokemonId,
      shiny: pokemon.shiny,
    });
    setAEvolucionar(null);
    empezar(async () => {
      const respuesta = await directaConCola(
        () => evolucionarAction({ captureId: pokemon.id, pokemonId: opcion.pokemonId }),
        "evolucion",
        { captureId: pokemon.id, pokemonId: String(opcion.pokemonId) },
        `${pokemon.nickname ?? pokemon.species} → ${opcion.rotulo}`,
      );
      if ("enCola" in respuesta) {
        setAnimacion((a) => a && { ...a, resultado: "encolada" });
        return;
      }
      if (respuesta.error) {
        setAnimacion((a) => a && { ...a, resultado: "fallida" });
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      // Lo de «¡Ha evolucionado!» ya lo dice la animación: sin aviso abajo
      setAnimacion((a) => a && { ...a, resultado: "hecha", despues: respuesta.imagen ?? null });
      if (respuesta.deshacer) setEvolucionado({ rotulo: opcion.rotulo, deshacer: respuesta.deshacer });
    });
  }

  function deshacerEvolucion() {
    if (!evolucionado) return;
    empezar(async () => {
      const respuesta = await sinConexion(() =>
        deshacerEnCajaAction({ participantId: pokemon.participantId, soloSi: evolucionado.deshacer }),
      );
      if (respuesta.error) {
        onAviso({ tipo: "error", texto: respuesta.error });
        return;
      }
      onAviso({ tipo: "ok", texto: "Deshecho: la evolución no ha pasado." });
      setEvolucionado(null);
    });
  }

  const enEquipo = pokemon.lugar === "equipo";
  /** Resumen, Combate o Historia: la ficha entera seguida no cabía en un móvil */
  const [pestana, setPestana] = useState<"resumen" | "combate" | "historia">("resumen");

  // Al abrir la ficha, su grito; el de un caído, grave, como al debilitarse
  useEffect(() => {
    sonarGrito(pokemon.pokemonId, { tono: pokemon.muerta ? TONO_DE_CAIDO : 1 });
  }, [pokemon.id, pokemon.pokemonId, pokemon.muerta]);

  return (
    <>
      <Hoja onCerrar={onCerrar} className="p-5 pt-3" etiqueta={pokemon.nickname ?? pokemon.species}>
        <CabeceraDeFicha
          dueno={{ nombre: dueno.displayName, color: dueno.color, imagen: dueno.avatarImage }}
          onCerrar={onCerrar}
          nombre={pokemon.nickname ?? pokemon.species}
          // Con su megapiedra puesta, que se vea que es la mega
          especie={pokemon.mega ? `${pokemon.species} · ${pokemon.mega.rotulo}` : pokemon.species}
          shiny={pokemon.shiny}
          tipos={pokemon.tipos}
          apagada={pokemon.muerta}
          sprite={
            <>
              <SpriteAnimado
                // Otro sprite al evolucionar o volverse shiny: que vuelva a probar el animado
                key={`${pokemon.mega?.pokemonId ?? pokemon.pokemonId}-${pokemon.shiny}`}
                pokemon={pokemon}
                className={cx("h-20 w-20", pokemon.muerta && "opacity-50 grayscale")}
              />
              {/* Al volverse shiny, la ráfaga de destellos de cuando sale uno en los juegos */}
              {rafaga
                ? RAFAGA.map(([x, y, retraso, tam], i) => (
                    <span
                      key={`${rafaga}-${i}`}
                      aria-hidden
                      className="pointer-events-none absolute animate-[evo-destellito_900ms_ease-out_both] bg-amber-200 [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]"
                      style={{ left: `${x}%`, top: `${y}%`, width: tam, height: tam, animationDelay: `${retraso}ms` }}
                    />
                  ))
                : null}
            </>
          }
        >
          <Pestanas
            className="mt-3"
            ancha
            etiqueta="Partes de la ficha"
            valor={pestana}
            onCambiar={setPestana}
            opciones={[
              { valor: "resumen", rotulo: "Resumen" },
              { valor: "combate", rotulo: "Combate", cuenta: pokemon.combate.movimientos.length || undefined },
              { valor: "historia", rotulo: "Historia" },
            ]}
          />
        </CabeceraDeFicha>

        {/* Con un alto mínimo: si no, la ficha subía y bajaba al cambiar de pestaña */}
        <div className="min-h-[50dvh] sm:min-h-[22rem]">
          {pestana === "combate" ? (
            <FichaDeCombate
              key={JSON.stringify(pokemon.combate)}
              captureId={pokemon.id}
              especie={pokemon.species}
              ficha={pokemon.combate}
              editable={editable}
              onAviso={onAviso}
              // Los caídos ya no combaten
              extra={pokemon.muerta ? null : <CopiarParaShowdown pokemon={pokemon} nivel={nivel} />}
            />
          ) : null}
          {pestana === "combate" ? <Debilidades pokemonId={pokemon.mega?.pokemonId ?? pokemon.pokemonId} deLocke={pokemon.debilidades} /> : null}

          {pestana === "historia" ? (
            <HistoriaDelPokemon
              // Se vuelve a pedir si evoluciona o se vuelve shiny con la ficha abierta
              key={`${pokemon.species}-${pokemon.shiny}`}
              de={{ tipo: "captura", id: pokemon.id }}
              nombre={pokemon.nickname ?? pokemon.species}
            />
          ) : null}

          {pestana === "resumen" ? (
            <>
            <dl className="mt-1 space-y-1.5 text-sm">
              {pokemon.llegoPorIntercambio ? (
                <Fila etiqueta="Llegó" valor={`Por intercambio, a cambio de ${pokemon.llegoPorIntercambio}`} />
              ) : null}
              {pokemon.sitio ? (
                // Si llegó por intercambio, la ruta es la del que se fue: el encuentro que se gastó
                <Fila etiqueta={pokemon.llegoPorIntercambio ? "Encuentro" : "Capturado en"} valor={pokemon.sitio} />
              ) : null}
              {/* El día, que es lo que se recuerda («lo pillé el primer día»); la hora no aporta */}
              <Fila
                etiqueta={pokemon.llegoPorIntercambio ? "Encuentro el" : "Capturado el"}
                valor={FECHA_DE_CAPTURA.format(new Date(pokemon.creado))}
              />
              {pokemon.apunte ? <Fila etiqueta="Apunte" valor={pokemon.apunte} /> : null}
              <Fila
                etiqueta="Ahora"
                valor={pokemon.muerta ? "En el cementerio" : enEquipo ? "En el equipo" : "En la caja"}
              />
              {pokemon.muerta && pokemon.causa ? <Fila etiqueta="Causa" valor={pokemon.causa} /> : null}
            </dl>

            {/* Un premio que sale poco: devolverlo a la caja. Su baja se queda en el cementerio */}
            {pokemon.muerta && pokemon.bajaId && dueno.editable ? (
              <button
                type="button"
                className="btn-ghost btn-sm mt-3 border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/10"
                disabled={pendiente}
                onClick={revivir}
              >
                <Icono emoji="💊" sinColor /> Revivir
              </button>
            ) : null}

            {esSoulLink ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="rotulo mb-2 flex items-center gap-1.5">
                  <Icono emoji="🔗" /> Vínculo {numero ? `#${numero}` : ""}
                </p>
                {companeras.length ? (
                  <ul className="space-y-1.5">
                    {companeras.map((otra) => {
                      const entera = todos.find((p) => p.id === otra.id)!;
                      return (
                        <li key={otra.id} className="flex items-center gap-2 text-sm">
                          <Sprite
                            pokemon={entera}
                            className={cx("h-8 w-8", entera.muerta && "opacity-50 grayscale")}
                          />
                          <span className="min-w-0 truncate text-slate-200">
                            {entera.nickname ?? entera.species}
                            <span className="text-slate-500"> · de {nombreDe(entera.participantId)}</span>
                          </span>
                          {entera.muerta ? <span className="chip ml-auto text-[10px]">Caído</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">
                    Va suelto: nadie más ha capturado en esa ruta todavía.
                  </p>
                )}

                {editable ? (
                  <div className="mt-3 space-y-2">
                    {candidatas.length ? (
                      <div className="flex gap-2">
                        <select
                          className="input min-w-0 flex-1"
                          value={conId}
                          onChange={(evento) => setConId(evento.target.value)}
                        >
                          <option value="">Vincular a mano con…</option>
                          {candidatas.map((otra) => (
                            <option key={otra.id} value={otra.id}>
                              {otra.nickname ?? otra.species}
                              {otra.sitio ? ` (${otra.sitio})` : ""} · de {nombreDe(otra.participantId)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          disabled={!conId || pendiente}
                          onClick={() =>
                            lanzar(() => vincularAction({ captureId: pokemon.id, conId }), {
                              ok: "Vinculados.",
                            })
                          }
                        >
                          <Icono emoji="🔗" /> Vincular
                        </button>
                      </div>
                    ) : null}
                    {pokemon.vinculo && companeras.length ? (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={pendiente}
                        onClick={() =>
                          lanzar(() => desvincularAction({ captureId: pokemon.id }), {
                            ok: "Desvinculado: ahora va suelto.",
                          })
                        }
                      >
                        <Icono emoji="⛓️‍💥" /> Desvincular
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Para presumir de él en el grupo: su tarjeta como imagen (ver `api/pokemon`) */}
            <CompartirPokemon id={pokemon.id} nombre={pokemon.nickname ?? pokemon.species} />

            {editable ? (
              <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={pendiente}
                    onClick={() =>
                      lanzar(
                        () =>
                          directaConCola(
                            () =>
                              moverPokemonAction({
                                captureId: pokemon.id,
                                lugar: enEquipo ? "caja" : "equipo",
                                hueco: null,
                              }),
                            "movimiento",
                            { captureId: pokemon.id, lugar: enEquipo ? "caja" : "equipo", hueco: "" },
                            `${(pokemon.nickname ?? pokemon.species)} → ${enEquipo ? "caja" : "equipo"}`,
                          ),
                        { ok: enEquipo ? "A la caja." : "Al equipo." },
                      )
                    }
                  >
                    <Icono emoji="🔁" /> {enEquipo ? "A la caja" : "Al equipo"}
                  </button>
                  {/* Uno de los premios: volver shiny a un pokémon a elección */}
                  {!pokemon.shiny ? (
                    <button
                      type="button"
                      className="btn-ghost btn-sm border-amber-300/30 text-amber-200 hover:bg-amber-300/10"
                      disabled={pendiente}
                      onClick={() => cambiarShiny(true)}
                    >
                      <Icono emoji="✨" sinColor /> Hacer shiny
                    </button>
                  ) : null}
                  {dueno.asId === pokemon.id ? (
                    <span className="chip border-amber-300/30 text-amber-200">
                      <Icono emoji="👑" sinColor /> Es el as
                    </span>
                  ) : (
                    <button type="button" className="btn-ghost btn-sm" disabled={pendiente} onClick={hacerAs}>
                      <Icono emoji="👑" /> Hacerlo as
                    </button>
                  )}
                  {/* Sin arrastrar: directo a la caja que se diga, al primer hueco libre.
                      Con un mínimo de ancho: si no, en los móviles en los que los
                      botones dejan un hueco pequeño al final de la fila se metía
                      ahí aplastado («Mo…») en vez de bajar a la suya */}
                  <select
                    className="input w-auto min-w-44 flex-1 py-1.5 text-sm sm:flex-none"
                    value=""
                    disabled={pendiente}
                    aria-label="Mover a otra caja"
                    onChange={(evento) => {
                      const caja = Number(evento.target.value);
                      if (evento.target.value === "" || Number.isNaN(caja)) return;
                      lanzar(
                        () =>
                          directaConCola(
                            () =>
                              moverPokemonAction({
                                captureId: pokemon.id,
                                lugar: "caja",
                                hueco: null,
                                caja,
                              }),
                            "movimiento",
                            { captureId: pokemon.id, lugar: "caja", hueco: "", caja: String(caja) },
                            `${pokemon.nickname ?? pokemon.species} → caja ${caja + 1}`,
                          ),
                        { ok: `A ${nombreDeCaja(dueno.nombres, caja)}.` },
                      );
                    }}
                  >
                    <option value="">Mover a la caja…</option>
                    {Array.from({ length: cajasDelDueno }, (_, caja) => (
                      <option key={caja} value={caja} disabled={caja === cajaActual}>
                        {nombreDeCaja(dueno.nombres, caja)}
                        {caja === cajaActual ? " (está aquí)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* En dos pasos, y con su deshacer al lado: evolucionar sin querer
                    cambia la especie, el sprite y los tipos de golpe */}
                <div>
                  <p className="label">Evolucionar</p>
                  {evolucionado ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                      <span className="min-w-0 flex-1">
                        ¡Ha evolucionado en <strong>{evolucionado.rotulo}</strong>!
                      </span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={pendiente}
                        onClick={deshacerEvolucion}
                      >
                        <Icono emoji="↩️" /> Deshacer
                      </button>
                    </div>
                  ) : aEvolucionar ? (
                    // Como en los juegos: «¡Está evolucionando!», y la B lo corta
                    <div className="rounded-xl border border-brand-400/30 bg-brand-600/10 p-3">
                      <p className="text-sm font-semibold text-white">
                        ¡{pokemon.nickname ?? pokemon.species} está evolucionando!
                      </p>
                      <p className="text-xs text-slate-400">En {aEvolucionar.rotulo}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={pendiente}
                          onClick={evolucionar}
                        >
                          <Icono emoji="🧬" /> Confirmar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          disabled={pendiente}
                          onClick={() => setAEvolucionar(null)}
                        >
                          Darle a la B
                        </button>
                      </div>
                    </div>
                  ) : pokemon.evoluciones.length ? (
                    <div className="flex flex-wrap gap-2">
                      {pokemon.evoluciones.map((opcion) => (
                        <button
                          key={opcion.pokemonId}
                          type="button"
                          className="btn-ghost btn-sm"
                          disabled={pendiente}
                          onClick={() => setAEvolucionar(opcion)}
                        >
                          <Icono emoji="🧬" /> {opcion.rotulo}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No evoluciona más.</p>
                  )}
                </div>

                {/* Los entrenadores del juego que te dan uno a cambio de otro */}
                <Intercambio
                  key={pokemon.id}
                  nombre={pokemon.nickname ?? pokemon.species}
                  ocupado={pendiente}
                  onIntercambiar={intercambiar}
                />

                <div>
                  <label className="label" htmlFor="mote-ficha">
                    Mote
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="mote-ficha"
                      className="input min-w-0 flex-1"
                      value={mote}
                      maxLength={40}
                      onChange={(evento) => setMote(evento.target.value)}
                      placeholder={pokemon.species}
                    />
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={pendiente || mote === (pokemon.nickname ?? "")}
                      onClick={() =>
                        lanzar(() => cambiarMoteAction({ captureId: pokemon.id, mote }), {
                          ok: "Mote cambiado.",
                        })
                      }
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
                  <label className="label" htmlFor="causa-ficha">
                    Ha caído
                  </label>
                  <input
                    id="causa-ficha"
                    className="input"
                    value={causa}
                    maxLength={200}
                    onChange={(evento) => setCausa(evento.target.value)}
                    placeholder="Qué lo mató (opcional)"
                  />
                  <div className="mt-2">
                    <SitioPicker
                      zonas={zonas}
                      label="Dónde cayó (opcional)"
                      placeholder="Gimnasio de Fausto, combate contra el rival…"
                      onCambiar={setSitio}
                    />
                  </div>
                  {companerasVivas.length ? (
                    <p className="mt-1.5 text-xs text-red-200/80">
                      Se lleva con él a{" "}
                      {companerasVivas
                        .map((c) => `${c.nickname ?? c.species} de ${nombreDe(c.participantId)}`)
                        .join(" y ")}
                      .
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn-danger btn-sm mt-2"
                    disabled={pendiente}
                    onClick={() => {
                      const pregunta = companerasVivas.length
                        ? `¿${pokemon.nickname ?? pokemon.species} ha caído? Por el vínculo cae también ${companerasVivas
                            .map((c) => c.nickname ?? c.species)
                            .join(" y ")}. Se puede deshacer.`
                        : `¿${pokemon.nickname ?? pokemon.species} ha caído? Se puede deshacer.`;
                      if (!window.confirm(pregunta)) return;
                      sonarGrito(pokemon.pokemonId, { tono: TONO_DE_CAIDO });
                      lanzar(
                        () =>
                          directaConCola(
                            () => darPorMuertoAction({ captureId: pokemon.id, causa, ...sitio }),
                            "caida",
                            {
                              captureId: pokemon.id,
                              causa,
                              zoneId: sitio.zoneId ?? "",
                              location: sitio.location ?? "",
                            },
                            [
                              pokemon.nickname ?? pokemon.species,
                              causa,
                              sitio.zoneId ? zonas.find((z) => z.id === sitio.zoneId)?.label : sitio.location,
                            ]
                              .filter(Boolean)
                              .join(" · "),
                          ),
                        { cerrar: true },
                      );
                    }}
                  >
                    <Icono emoji="💀" /> Dar por muerto
                  </button>
                </div>

                {pokemon.shiny ? (
                  <button
                    type="button"
                    className="mr-4 text-xs text-slate-500 underline-offset-2 hover:text-amber-200 hover:underline"
                    disabled={pendiente}
                    onClick={() => cambiarShiny(false)}
                  >
                    Quitar lo shiny (marcado sin querer)
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-xs text-slate-500 underline-offset-2 hover:text-red-300 hover:underline"
                  disabled={pendiente}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `¿Borrar ${pokemon.nickname ?? pokemon.species}? Es para lo apuntado por error y no se puede deshacer.`,
                      )
                    ) {
                      return;
                    }
                    lanzar(() => borrarDeLaCajaAction({ captureId: pokemon.id }), {
                      cerrar: true,
                      ok: "Borrado.",
                    });
                  }}
                >
                  Borrar (apuntado por error)
                </button>
              </div>
            ) : null}
            </>
          ) : null}
        </div>
      </Hoja>
      {animacion ? (
        <AnimacionDeEvolucion
          {...animacion}
          onCerrar={() => setAnimacion(null)}
          onDeshacer={deshacerEvolucion}
        />
      ) : null}
    </>
  );
}

/** Dónde sale cada destello de la ráfaga shiny: x e y en %, retraso en ms y tamaño */
const RAFAGA: [number, number, number, number][] = [
  [-6, 10, 0, 14],
  [78, -4, 80, 12],
  [92, 58, 160, 16],
  [8, 78, 120, 12],
  [44, -10, 220, 10],
  [50, 96, 40, 14],
  [-10, 46, 260, 10],
  [100, 26, 300, 10],
];

const FECHA_DE_CAPTURA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{etiqueta}</dt>
      <dd className="min-w-0 text-slate-200">{valor}</dd>
    </div>
  );
}

/** El botón de mandar la tarjeta del pokémon: el menú de compartir del móvil, o descargarla */
function CompartirPokemon({ id, nombre }: { id: string; nombre: string }) {
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fichero = `${nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-") || "pokemon"}.png`;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={haciendo}
        onClick={async () => {
          setHaciendo(true);
          setError(await compartirImagen(`/api/pokemon/${id}`, fichero, nombre, "compartir"));
          setHaciendo(false);
        }}
      >
        <Icono emoji="📤" /> {haciendo ? "Preparando…" : "Compartir su tarjeta"}
      </button>
    </div>
  );
}
