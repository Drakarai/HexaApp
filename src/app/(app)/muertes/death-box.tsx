"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  deleteDeathAction,
  updateDeathAction,
} from "@/app/actions/deaths";
import type { FormState } from "@/app/actions/auth";
import {
  Avatar,
  ConfirmSubmit,
  EnlaceDeJugador,
  FormMessage,
  SubmitButton,
} from "@/components/ui";
import { AceBadge } from "@/components/ace-badge";
import { ImageInput } from "@/components/image-input";
import { SpeciesPicker } from "@/components/species-picker";
import { SitioPicker } from "@/components/sitio-picker";
import { IMAGE_SIZES } from "@/lib/image";
import type { ZonaParaElegir } from "@/lib/mapas";
import { Icono } from "@/components/icono";
import { cx } from "@/lib/utils";
import { revivirAction } from "@/app/actions/equipo-y-caja";
import { Hoja } from "@/components/hoja";
import { sonarGrito, TONO_DE_CAIDO } from "@/lib/gritos";
import { HistoriaDelPokemon } from "@/components/historia-del-pokemon";
import { CabeceraDeFicha } from "@/components/cabecera-de-ficha";
import { Pestanas } from "@/components/pestanas";

export type AceSummary = {
  species: string | null;
  nickname: string | null;
  reason: string | null;
  image: string | null;
  detailImage: string | null;
  editable: boolean;
};

export type BoxDeath = {
  id: string;
  species: string;
  /** El número de PokéAPI, forma incluida si la imagen la dice: para su grito y su sprite */
  pokemonId: number | null;
  tipos: { slug: string; nombre: string }[];
  nickname: string | null;
  cause: string | null;
  level: number | null;
  /** La zona del mapa donde cayó, si se eligió una */
  zoneId: string | null;
  /** Cómo se lee ese sitio: el nombre de la zona o lo escrito a mano */
  sitio: string | null;
  location: string | null;
  notes: string | null;
  boxImage: string | null;
  /** La ilustración grande se carga aparte, al abrir la ficha */
  detailImage: string | null;
  diedAtLabel: string;
  /** Si se revivió (un premio), cuándo. La baja se queda y sigue contando */
  revividoLabel: string | null;
  diedAtInput: string;
  editable: boolean;
  participant: {
    id: string;
    displayName: string;
    color: string;
    avatarImage: string | null;
    /** Las que lleva en total, que pueden ser más de las que hay pintadas */
    bajas: number;
    ace: AceSummary;
  };
};

/** Cuadrícula de casillas, como el PC: al pinchar una se abre su ficha. */
export function DeathBox({
  deaths,
  grouped,
  zonas,
}: {
  deaths: BoxDeath[];
  /** Si es true, se separan las casillas por jugador. */
  grouped: boolean;
  /** Las zonas del mapa de esta región, para editar dónde cayó */
  zonas: ZonaParaElegir[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = deaths.find((death) => death.id === selectedId) ?? null;

  const groups = grouped
    ? [...new Map(deaths.map((d) => [d.participant.id, d.participant])).values()]
        .map((participant) => ({
          participant,
          items: deaths.filter((d) => d.participant.id === participant.id),
        }))
        .sort((a, b) =>
          a.participant.displayName.localeCompare(b.participant.displayName, "es"),
        )
    : [{ participant: null, items: deaths }];

  return (
    <>
      <div className="space-y-5">
        {groups.map((group, index) => (
          <section key={group.participant?.id ?? index} className="card">
            {group.participant ? (
              <div className="mb-4 flex items-center gap-2.5">
                <EnlaceDeJugador
                  participantId={group.participant.id}
                  name={group.participant.displayName}
                  className="gap-2.5"
                >
                  <Avatar
                    name={group.participant.displayName}
                    color={group.participant.color}
                    image={group.participant.avatarImage}
                    size={28}
                  />
                  <h2 className="font-semibold text-white">
                    {group.participant.displayName}
                  </h2>
                </EnlaceDeJugador>
                <AceBadge
                  size={26}
                  showEmpty
                  ace={{
                    participantId: group.participant.id,
                    playerName: group.participant.displayName,
                    color: group.participant.color,
                    ...group.participant.ace,
                  }}
                />
                {/**
                 * El número de la chapa es el de verdad. Si la tanda se ha
                 * quedado corta se dice —"10 de 12"— en vez de enseñar 10 a
                 * secas, que era lo que no cuadraba con la clasificación.
                 */}
                <span className="chip ml-auto">
                  {group.items.length < group.participant.bajas
                    ? `${group.items.length} de ${group.participant.bajas}`
                    : group.participant.bajas}
                </span>
              </div>
            ) : null}

            {/**
             * **Lápidas**, no casillas: la piedra con su arco, el sprite apagado,
             * el mote grabado y la causa debajo, todas plantadas en la misma
             * franja de césped. Antes eran las mismas casillas que la caja del
             * PC y el cementerio no se distinguía del Equipo y PC.
             */}
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 border-b-4 border-emerald-900/50 pb-0 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {group.items.map((death) => (
                <button
                  key={death.id}
                  type="button"
                  onClick={() => setSelectedId(death.id)}
                  title={`${death.nickname ?? death.species} — ver ficha`}
                  className={cx(
                    "group relative flex flex-col items-center gap-0.5 rounded-b-sm rounded-t-[999px] border border-b-0 px-2 pb-2 pt-3 transition",
                    death.revividoLabel
                      ? "border-emerald-400/30 bg-gradient-to-b from-emerald-400/[0.12] to-ink-850"
                      : "border-white/15 bg-gradient-to-b from-slate-400/[0.16] to-ink-850 hover:from-slate-300/[0.24]",
                  )}
                >
                  <span aria-hidden className="text-[10px] font-bold tracking-[0.3em] text-slate-500">
                    {death.revividoLabel ? "VOLVIÓ" : "Q.E.P.D."}
                  </span>
                  <span className="relative flex aspect-square w-4/5 items-center justify-center">
                    {death.boxImage ? (
                      <SpritePokemon
                        sinIconos
                        src={death.boxImage}
                        alt={death.species}
                        loading="lazy"
                        className={cx(
                          "h-full w-full object-contain transition",
                          !death.revividoLabel && "opacity-80 grayscale group-hover:opacity-100 group-hover:grayscale-[35%]",
                        )}
                      />
                    ) : (
                      <PokeballGlyph />
                    )}
                    {death.revividoLabel ? (
                      <span
                        className="absolute bottom-0 left-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/90 text-white"
                        title="Revivido"
                      >
                        <Icono emoji="💊" tamano={10} sinColor />
                      </span>
                    ) : null}
                  </span>
                  <span className="w-full truncate text-center font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wide text-slate-100">
                    {death.nickname ?? death.species}
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-slate-400">
                    {death.nickname ? death.species : death.diedAtLabel}
                  </span>
                  {death.cause ? (
                    <span className="line-clamp-2 w-full text-center text-[11px] italic leading-tight text-slate-500">
                      {death.cause}
                    </span>
                  ) : null}
                  {/* El color de su dueño, como una flor al pie */}
                  <span
                    aria-hidden
                    className="absolute -bottom-1 right-2 h-2 w-2 rounded-full ring-2 ring-ink-900"
                    style={{ background: death.participant.color }}
                  />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selected ? (
        <DeathDetail
          death={selected}
          zonas={zonas}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}

function PokeballGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 opacity-25" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h6m6 0h6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function DeathDetail({
  death,
  zonas,
  onClose,
}: {
  death: BoxDeath;
  zonas: ZonaParaElegir[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pestana, setPestana] = useState<"resumen" | "historia">("resumen");
  const [reviviendo, empezarARevivir] = useTransition();
  const [avisoDeRevivir, setAvisoDeRevivir] = useState<FormState>(null);
  const [manualImages, setManualImages] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateDeathAction,
    null,
  );

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  // Su grito al abrirla, grave: como suena en los juegos al debilitarse
  useEffect(() => {
    sonarGrito(death.pokemonId, { tono: TONO_DE_CAIDO });
  }, [death.id, death.pokemonId]);

  return (
    <Hoja onCerrar={onClose} className="p-5 pt-3" etiqueta={death.nickname ?? death.species}>
      <CabeceraDeFicha
        dueno={{
          nombre: death.participant.displayName,
          color: death.participant.color,
          imagen: death.participant.avatarImage,
          participantId: death.participant.id,
          debajo: death.diedAtLabel,
        }}
        onCerrar={onClose}
        nombre={death.nickname ?? death.species}
        especie={death.species}
        detalle={
          death.revividoLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
              <Icono emoji="💊" tamano={12} sinColor /> Revivido
            </span>
          ) : death.level ? (
            `Nv. ${death.level}`
          ) : null
        }
        tipos={death.tipos}
        apagada={!death.revividoLabel}
        sprite={
          death.detailImage ?? death.boxImage ? (
            <SpritePokemon
              ficha
              key={death.id}
              src={death.detailImage ?? death.boxImage}
              pokemonId={death.pokemonId}
              alt={death.species}
              className={cx("h-20 w-20 object-contain", !death.revividoLabel && "grayscale-[35%]")}
            />
          ) : (
            <span className="text-slate-600">
              <PokeballGlyph />
            </span>
          )
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
            { valor: "historia", rotulo: "Historia" },
          ]}
        />
      </CabeceraDeFicha>

      {/* Con un alto mínimo, como la del Equipo: si no, sube y baja al cambiar de pestaña */}
      <div className="min-h-[40dvh] sm:min-h-[16rem]">
      {pestana === "historia" ? (
        <HistoriaDelPokemon de={{ tipo: "baja", id: death.id }} nombre={death.nickname ?? death.species} />
      ) : (
        <>
      {death.cause || death.sitio || death.notes || death.revividoLabel ? (
        <dl className="mt-1 space-y-1.5 text-sm">
          {death.cause ? <Row label="Causa" value={death.cause} /> : null}
          {death.sitio ? <Row label="Dónde" value={death.sitio} /> : null}
          {death.notes ? <Row label="Notas" value={death.notes} /> : null}
          {death.revividoLabel ? <Row label="Revivido" value={death.revividoLabel} /> : null}
        </dl>
      ) : (
        <p className="muted mt-1 text-sm">Sin causa ni sitio apuntados.</p>
      )}

      {death.editable ? (
        editing ? (
          <form action={formAction} className="mt-5 space-y-4 border-t border-white/10 pt-4">
            <input type="hidden" name="deathId" value={death.id} />
            <div>
              <label className="label">Mote</label>
              <input
                name="nickname"
                className="input"
                defaultValue={death.nickname ?? ""}
              />
            </div>

            {manualImages ? (
              <>
                <div>
                  <label className="label">Especie</label>
                  <input
                    name="species"
                    className="input"
                    defaultValue={death.species}
                    required
                  />
                </div>
                <ImageInput
                  name="detailImage"
                  label="Imagen de la ficha"
                  defaultValue={death.detailImage}
                  maxSize={IMAGE_SIZES.detail}
                  hint="La imagen grande de esta ventana. Puede ser distinta de la de su casilla."
                />
                <ImageInput
                  name="boxImage"
                  label="Sprite del cementerio"
                  defaultValue={death.boxImage}
                  maxSize={IMAGE_SIZES.box}
                />
              </>
            ) : (
              <SpeciesPicker
                defaultSpecies={death.species}
                defaultBoxImage={death.boxImage}
                defaultDetailImage={death.detailImage}
              />
            )}

            <button
              type="button"
              className="text-xs text-brand-400 hover:underline"
              onClick={() => setManualImages((manual) => !manual)}
            >
              {manualImages
                ? "← Volver a las imágenes automáticas"
                : "Prefiero poner mis propias imágenes →"}
            </button>

            <div>
              <label className="label">Causa</label>
              <input
                name="cause"
                className="input"
                defaultValue={death.cause ?? ""}
              />
            </div>

            {/* El sitio va a la vista y no dentro de "más detalles": es lo que
                alimenta las calaveras del mapa y el ranking de rutas, así que
                escondido no lo pondría nadie. */}
            <SitioPicker
              zonas={zonas}
              defaultZoneId={death.zoneId}
              defaultLocation={death.location}
              label="Dónde cayó"
            />

            <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <summary className="rotulo cursor-pointer list-none">
                <span className="mr-2 inline-block transition group-open:rotate-90">
                  ▸
                </span>
                Más detalles (opcional)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Nivel</label>
                  <input
                    name="level"
                    type="number"
                    min={1}
                    max={100}
                    className="input"
                    defaultValue={death.level ?? ""}
                  />
                </div>
                <div>
                  <label className="label">Fecha</label>
                  <input
                    name="diedAt"
                    type="date"
                    className="input"
                    defaultValue={death.diedAtInput}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notas</label>
                  <input
                    name="notes"
                    className="input"
                    defaultValue={death.notes ?? ""}
                  />
                </div>
              </div>
            </details>

            <FormMessage state={state} />
            <div className="flex gap-2">
              <SubmitButton>Guardar ficha</SubmitButton>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setEditing(true)}
            >
              <Icono emoji="🖼️" /> Editar ficha e imágenes
            </button>
            {/* Un premio que sale poco: devolverlo al Equipo y PC. La baja se queda */}
            {!death.revividoLabel ? (
              <button
                type="button"
                className="btn-ghost btn-sm border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/10"
                disabled={reviviendo}
                onClick={() => {
                  const nombre = death.nickname ?? death.species;
                  if (
                    !window.confirm(
                      `¿Revivir a ${nombre}? Vuelve a tu Equipo y PC. Su baja se queda en el cementerio y sigue contando. Se puede deshacer desde Equipo y PC.`,
                    )
                  ) {
                    return;
                  }
                  empezarARevivir(async () => {
                    const respuesta = await revivirAction({ deathId: death.id });
                    setAvisoDeRevivir(respuesta.error ? { error: respuesta.error } : { success: respuesta.aviso });
                    if (!respuesta.error) sonarGrito(death.pokemonId);
                  });
                }}
              >
                <Icono emoji="💊" sinColor /> Revivir
              </button>
            ) : null}
            <form action={deleteDeathAction} onSubmit={() => onClose()}>
              <input type="hidden" name="deathId" value={death.id} />
              <ConfirmSubmit
                message={`¿Borrar a ${death.nickname ?? death.species} del cementerio?`}
              >
                Borrar
              </ConfirmSubmit>
            </form>
          </div>
        )
      ) : null}
      <div className="mt-3">
        <FormMessage state={avisoDeRevivir} />
      </div>
        </>
      )}
      </div>
    </Hoja>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  // Como las filas de la ficha del Equipo y PC: es la misma ficha
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-200">{value}</dd>
    </div>
  );
}
