"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useActionState, useEffect, useState } from "react";
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

/** Cuadrícula estilo caja del PC: al pinchar una casilla se abre su ficha. */
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

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {group.items.map((death) => (
                <button
                  key={death.id}
                  type="button"
                  onClick={() => setSelectedId(death.id)}
                  title={`${death.nickname ?? death.species} — ver ficha`}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition hover:border-brand-500/50 hover:bg-white/[0.07]"
                >
                  <span
                    className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-ink-850"
                    style={{ boxShadow: `inset 0 0 0 1px ${death.participant.color}33` }}
                  >
                    {death.boxImage ? (
                      <SpritePokemon
                        src={death.boxImage}
                        alt={death.species}
                        loading="lazy"
                        className="h-full w-full object-contain p-1 grayscale-[35%] transition group-hover:grayscale-0"
                      />
                    ) : (
                      <PokeballGlyph />
                    )}
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full"
                      style={{ background: death.participant.color }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-full truncate text-center text-xs font-medium text-slate-200">
                    {death.nickname ?? death.species}
                  </span>
                  <span className="w-full truncate text-center text-[10px] text-slate-500">
                    {death.species}
                  </span>
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
        detalle={death.level ? `Nv. ${death.level}` : null}
        tipos={death.tipos}
        apagada
        sprite={
          death.detailImage ?? death.boxImage ? (
            <SpritePokemon
              ficha
              key={death.id}
              src={death.detailImage ?? death.boxImage}
              pokemonId={death.pokemonId}
              alt={death.species}
              className="h-20 w-20 object-contain grayscale-[35%]"
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
      {death.cause || death.sitio || death.notes ? (
        <dl className="mt-1 space-y-1.5 text-sm">
          {death.cause ? <Row label="Causa" value={death.cause} /> : null}
          {death.sitio ? <Row label="Dónde" value={death.sitio} /> : null}
          {death.notes ? <Row label="Notas" value={death.notes} /> : null}
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
                  hint="La imagen grande de esta ventana. Puede ser distinta del sprite de la caja."
                />
                <ImageInput
                  name="boxImage"
                  label="Sprite de la caja"
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
