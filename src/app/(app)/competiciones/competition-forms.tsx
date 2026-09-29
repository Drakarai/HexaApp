"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addParticipantAction,
  createCompetitionAction,
  darEspectadorAction,
  updateCompetitionAction,
  updateParticipantAction,
} from "@/app/actions/competitions";
import { copiarDeOtraEdicionAction } from "@/app/actions/copiar-edicion";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { JuegoPicker } from "@/components/juego-picker";
import { ImageInput } from "@/components/image-input";
import { IMAGE_SIZES } from "@/lib/image";
import {
  ESTILOS,
  JUGADORES_DEL_SOUL_LINK,
  JUGADORES_MAXIMOS,
  type EstiloDeJuego,
} from "@/lib/perfiles-de-locke";
import { cx } from "@/lib/utils";

/**
 * El estilo de juego: competir o Soul Link. Dos botones, como el de oficial o
 * fangame del juego, y un campo oculto con lo elegido. Lo usan el alta y la
 * edición, que es donde se puede cambiar después.
 */
function EstiloPicker({
  estilo,
  onChange,
}: {
  estilo: EstiloDeJuego;
  onChange: (estilo: EstiloDeJuego) => void;
}) {
  return (
    <div>
      <label className="label">Estilo de juego</label>
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {(Object.keys(ESTILOS) as EstiloDeJuego[]).map((cual) => (
          <button
            key={cual}
            type="button"
            onClick={() => onChange(cual)}
            aria-pressed={estilo === cual}
            className={cx(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
              estilo === cual
                ? "bg-brand-600/25 text-white ring-1 ring-brand-500/40"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {ESTILOS[cual].nombre}
          </button>
        ))}
      </div>
      <input type="hidden" name="estilo" value={estilo} />
      <p className="mt-1 text-xs text-slate-500">{ESTILOS[estilo].explicacion}</p>
    </div>
  );
}

export function NewCompetitionForm({
  competitions,
  archivables,
}: {
  competitions: Array<{ id: string; name: string }>;
  /** Los lockes activos que quien crea puede archivar de paso */
  archivables: Array<{ id: string; name: string; jugadores: number; marcado: boolean }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createCompetitionAction,
    null,
  );
  /**
   * El dualocke se gana por mayoría de jornadas, así que sin saber cuántas van
   * a ser no hay forma de decir quién va ganando: con dos jugadores el campo
   * deja de ser opcional y viene con las seis de siempre.
   */
  const [jugadores, setJugadores] = useState(6);
  const [estilo, setEstilo] = useState<EstiloDeJuego>("competitivo");
  const soulLink = estilo === "soullink";
  const esDual = jugadores === 2 && !soulLink;

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Crear una competición nueva
      </summary>
      <form action={formAction} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input name="name" className="input" placeholder="Hexalocke 3" required />
          </div>
          <div className="sm:col-span-2">
            <EstiloPicker
              estilo={estilo}
              onChange={(nuevo) => {
                setEstilo(nuevo);
                // Un Soul Link es de dos casi siempre; volver deja los seis
                setJugadores(nuevo === "soullink" ? 2 : 6);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <JuegoPicker />
          </div>
          <div>
            <label className="label">Modalidad</label>
            <input name="modality" className="input" placeholder="Random" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* En un Soul Link no hay puntos: se manda el de siempre y no se pregunta */}
            {soulLink ? (
              <input type="hidden" name="startingPoints" value={5} />
            ) : (
              <div>
                <label className="label">Puntos iniciales</label>
                <input
                  name="startingPoints"
                  type="number"
                  defaultValue={5}
                  className="input"
                />
              </div>
            )}
            <div>
              <label className="label">Jugadores</label>
              <input
                // Se remonta al cambiar de estilo para que salga el número nuevo
                key={estilo}
                name="maxPlayers"
                type="number"
                min={2}
                max={soulLink ? JUGADORES_DEL_SOUL_LINK.maximo : JUGADORES_MAXIMOS}
                defaultValue={jugadores}
                onChange={(event) => setJugadores(Number(event.target.value))}
                className="input"
              />
            </div>
          </div>
          {/* De cuántas jornadas va el locke. Solo hace falta de verdad en el
              dualocke, que se gana con la mayoría de ellas; en un Soul Link
              no hay jornadas */}
          <div className={soulLink ? "hidden" : undefined}>
            <label className="label">Jornadas previstas</label>
            <input
              // Se remonta al pasar a dos para que salga el 6 puesto
              key={esDual ? "dual" : "grupo"}
              name="jornadasPrevistas"
              type="number"
              min={1}
              max={50}
              className="input"
              placeholder="Opcional"
              required={esDual}
              disabled={soulLink}
              defaultValue={esDual ? 6 : undefined}
            />
            {esDual ? (
              <p className="mt-1 text-xs text-slate-500">
                Gana quien se lleve la mayoría: con 6, el primero a 4.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea name="description" className="textarea" rows={3} />
        </div>

        {competitions.length ? (
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div>
              <label className="label">Copiar configuración de</label>
              <select name="copyFromId" className="input" defaultValue="">
                <option value="">No copiar nada</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Se copia la configuración, no los resultados: la edición anterior
                se conserva entera.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Check name="copyRules" label="Reglas" defaultChecked />
              <Check name="copyLevelCaps" label="Level caps" defaultChecked />
              <Check name="copyParticipants" label="Jugadores" defaultChecked />
              <Check name="copyRoulettes" label="Ruletas" />
            </div>
          </div>
        ) : null}

        {archivables.length ? (
          <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <legend className="label px-1">Archivar al crear</legend>
            <p className="text-xs text-slate-500">
              Se quedan con todos sus datos, de solo lectura. Solo los marcados.
            </p>
            {archivables.map((locke) => (
              <label key={locke.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="archivar"
                  value={locke.id}
                  defaultChecked={locke.marcado}
                  className="accent-indigo-500"
                />
                {locke.name}
                <span className="text-xs text-slate-500">
                  · {locke.jugadores === 1 ? "en solitario" : `${locke.jugadores} jugadores`}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}

        <FormMessage state={state} />
        <SubmitButton>Crear competición</SubmitButton>
      </form>
    </details>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-indigo-500"
      />
      {label}
    </label>
  );
}

export function EditCompetitionForm({
  competition,
}: {
  competition: {
    id: string;
    name: string;
    game: string | null;
    gameId: string | null;
    juegoNoOficial: boolean;
    modality: string | null;
    description: string | null;
    startingPoints: number;
    jornadasPrevistas: number | null;
    /** Dirección del logo que ya tiene, para verlo: ver lib/imagen-url.ts */
    logo: string | null;
    estilo: EstiloDeJuego;
    maxPlayers: number;
    /** Los que ya están apuntados: menos plazas que eso no puede tener */
    apuntados: number;
  };
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateCompetitionAction,
    null,
  );
  /**
   * El estilo y las plazas **se pueden cambiar con el locke empezado**: el
   * grupo que pidió el Soul Link ya lo había montado como dualocke. Lo que haya
   * de antes —jornadas, puntos— se queda guardado, solo que no se enseña.
   */
  const [estilo, setEstilo] = useState<EstiloDeJuego>(competition.estilo);
  const soulLink = estilo === "soullink";
  // En solitario (una plaza) no hay estilo que elegir: es de uno
  const enSolitario = competition.maxPlayers === 1;

  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        Editar datos de la competición
      </summary>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="competitionId" value={competition.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input name="name" className="input" defaultValue={competition.name} />
          </div>
          {enSolitario ? null : (
            <div className="sm:col-span-2">
              <EstiloPicker estilo={estilo} onChange={setEstilo} />
            </div>
          )}
          <div className="sm:col-span-2">
            <JuegoPicker
              defaultGameId={competition.gameId}
              defaultGame={competition.game}
              defaultNoOficial={competition.juegoNoOficial}
            />
          </div>
          <div>
            <label className="label">Modalidad</label>
            <input
              name="modality"
              className="input"
              defaultValue={competition.modality ?? ""}
            />
          </div>
          {enSolitario ? null : (
            <div>
              <label className="label">Jugadores</label>
              <input
                name="maxPlayers"
                type="number"
                min={Math.max(2, competition.apuntados)}
                max={soulLink ? JUGADORES_DEL_SOUL_LINK.maximo : JUGADORES_MAXIMOS}
                className="input"
                defaultValue={competition.maxPlayers}
              />
            </div>
          )}
          <div className={soulLink ? "hidden" : undefined}>
            <label className="label">Puntos iniciales</label>
            <input
              name="startingPoints"
              type="number"
              className="input"
              defaultValue={competition.startingPoints}
            />
          </div>
          <div className={soulLink ? "hidden" : undefined}>
            <label className="label">Jornadas previstas</label>
            <input
              name="jornadasPrevistas"
              type="number"
              min={1}
              max={50}
              className="input"
              placeholder="Opcional"
              defaultValue={competition.jornadasPrevistas ?? ""}
            />
          </div>
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea
            name="description"
            className="textarea"
            rows={3}
            defaultValue={competition.description ?? ""}
          />
        </div>
        <ImageInput
          name="logo"
          label="Logo de la edición"
          defaultValue={competition.logo}
          maxSize={IMAGE_SIZES.logo}
          hint="Sale de fondo junto al nombre, en el resumen. Mejor con el fondo transparente."
        />
        <FormMessage state={state} />
        <SubmitButton>Guardar</SubmitButton>
      </form>
    </details>
  );
}

export function AddParticipantForm({
  competitionId,
  users,
  versiones = [],
}: {
  competitionId: string;
  users: Array<{ id: string; displayName: string; username: string }>;
  /** Si el juego es una pareja, sus dos versiones: ver `CampoDeEdicion` */
  versiones?: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addParticipantAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid gap-3 sm:grid-cols-4">
        {users.length ? (
          <div>
            <label className="label">Usuario</label>
            <select name="userId" className="input">
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} (@{user.username})
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {/**
         * Alguien que ya tenía cuenta: un organizador solo ve en la lista las
         * que dio de alta él, así que a un amigo que ya jugaba otro locke no
         * había forma de apuntarlo. Con el usuario exacto se le encuentra sin
         * enseñar la lista de cuentas de la casa.
         */}
        <div>
          <label className="label">{users.length ? "…o su usuario" : "Su usuario"}</label>
          <input
            name="username"
            className="input"
            placeholder="@usuario exacto"
            autoCapitalize="none"
            autoCorrect="off"
            required={!users.length}
          />
        </div>
        <div>
          <label className="label">Nombre en el locke</label>
          <input name="displayName" className="input" placeholder="Opcional" />
        </div>
        <div>
          <label className="label">Edición</label>
          <CampoDeEdicion versiones={versiones} />
        </div>
        <div>
          <label className="label">Color</label>
          <input
            name="color"
            type="color"
            defaultValue="#6366f1"
            className="input h-9.5 p-1"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="isAdmin" className="accent-indigo-500" />
        Puede administrar esta competición
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn-ghost">Añadir jugador</SubmitButton>
    </form>
  );
}

export function EditParticipantForm({
  participant,
  versiones = [],
}: {
  participant: {
    id: string;
    displayName: string;
    gameVersion: string | null;
    color: string;
    isAdmin: boolean;
  };
  versiones?: string[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm mt-2"
        onClick={() => setOpen(true)}
      >
        ✎ Editar
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateParticipantAction(formData);
        setOpen(false);
      }}
      className="mt-3 space-y-3 border-t border-white/10 pt-3"
    >
      <input type="hidden" name="participantId" value={participant.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Nombre</label>
          <input
            name="displayName"
            className="input"
            defaultValue={participant.displayName}
          />
        </div>
        <div>
          <label className="label">Edición</label>
          <CampoDeEdicion versiones={versiones} actual={participant.gameVersion} />
        </div>
        <div>
          <label className="label">Color</label>
          <input
            name="color"
            type="color"
            className="input h-9.5 p-1"
            defaultValue={participant.color}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="isAdmin"
          defaultChecked={participant.isAdmin}
          className="accent-indigo-500"
        />
        Puede administrar esta competición
      </label>
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Dar acceso de solo mirar a alguien que no juega esta edición. Va aparte del
 * alta de jugadores porque es justo lo contrario: entra para ver, no para
 * jugar, y no ocupa plaza del locke.
 */
export function AddEspectadorForm({
  competitionId,
  users,
}: {
  competitionId: string;
  users: Array<{ id: string; displayName: string; username: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    darEspectadorAction,
    null,
  );

  if (!users.length) {
    return (
      <p className="muted">
        No queda ningún usuario a quien dar acceso: o juegan este locke o ya lo
        miran.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <label className="label">Dejar mirar a</label>
          <select name="userId" className="input" required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} (@{user.username})
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="btn-ghost">Dar acceso</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/**
 * Copiar la configuración de otra edición: reglas, level caps y ajustes.
 *
 * Lo que más se agradece al montar el locke siguiente, y lo que le ahorra la
 * parte aburrida a quien monta el suyo por primera vez.
 */
export function CopiarDeOtraEdicionForm({
  destinoId,
  destinoNombre,
  otras,
}: {
  destinoId: string;
  destinoNombre: string;
  /** Las demás ediciones que esa persona puede abrir */
  otras: Array<{ id: string; name: string; mismoJuego: boolean }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    copiarDeOtraEdicionAction,
    null,
  );
  const [origenId, setOrigenId] = useState(otras[0]?.id ?? "");

  if (!otras.length) return null;

  const origen = otras.find((otra) => otra.id === origenId);

  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        ▸ Copiar configuración de otra edición
      </summary>

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="destinoId" value={destinoId} />

        <div>
          <label className="label">Copiar de</label>
          <select
            name="origenId"
            className="input"
            value={origenId}
            onChange={(event) => setOrigenId(event.target.value)}
          >
            {otras.map((otra) => (
              <option key={otra.id} value={otra.id}>
                {otra.name}
                {otra.mismoJuego ? "" : " (otro juego)"}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">Qué copiar a {destinoNombre}</legend>
          <Marca valor="reglas" etiqueta="Las reglas" />
          <Marca
            valor="levelCaps"
            etiqueta="Los level caps"
            aviso={
              origen && !origen.mismoJuego
                ? "Son de otro juego: los líderes no serán los de esta región."
                : null
            }
          />
          <Marca
            valor="ajustes"
            etiqueta="Los ajustes"
            aviso="Puntos de inicio, jornadas previstas y si los retos cuentan para la diferencia."
          />
        </fieldset>

        <p className="text-[11px] text-slate-500">
          No se copian jugadores, jornadas, puntos ni bajas: eso es lo que pasó
          en esa edición, no su configuración.
        </p>

        <FormMessage state={state} />
        <SubmitButton className="btn-ghost btn-sm">Copiar</SubmitButton>
      </form>
    </details>
  );
}

function Marca({
  valor,
  etiqueta,
  aviso,
}: {
  valor: string;
  etiqueta: string;
  aviso?: string | null;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-200">
      <input
        type="checkbox"
        name="que"
        value={valor}
        className="mt-0.5"
        defaultChecked
      />
      <span className="min-w-0">
        {etiqueta}
        {aviso ? (
          <span className="block text-[11px] text-amber-300/80">{aviso}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * La edición que lleva cada jugador. Si el juego del locke es una **pareja**
 * (Rubí Omega y Zafiro Alfa), se elige de las dos, que es como se reparte el
 * grupo; si no, se escribe a mano como siempre. Si ya tenía algo escrito que
 * no es ninguna de las dos, se conserva como opción para no perderlo al editar.
 */
function CampoDeEdicion({ versiones, actual }: { versiones: string[]; actual?: string | null }) {
  if (!versiones.length) {
    return (
      <input
        name="gameVersion"
        className="input"
        placeholder="HeartGold"
        defaultValue={actual ?? ""}
      />
    );
  }
  const opciones = actual && !versiones.includes(actual) ? [...versiones, actual] : versiones;
  return (
    <select name="gameVersion" className="input" defaultValue={actual ?? ""}>
      <option value="">Sin elegir</option>
      {opciones.map((version) => (
        <option key={version} value={version}>
          {version}
        </option>
      ))}
    </select>
  );
}
