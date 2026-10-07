"use client";

import { SpritePokemon } from "@/components/sprite-pokemon";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  candidatosAAsAction,
  clearAceAction,
  elegirAsAction,
  type CandidatoAAs,
} from "@/app/actions/aces";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage } from "@/components/ui";
import { cx } from "@/lib/utils";
import { Hoja } from "@/components/hoja";

export type AceInfo = {
  participantId: string;
  playerName: string;
  color: string;
  species: string | null;
  nickname: string | null;
  reason: string | null;
  /** Direcciones de las imágenes, no las imágenes: ver lib/imagen-url.ts */
  image: string | null;
  detailImage: string | null;
  /** Si el que mira puede cambiarlo (su dueño o un administrador) */
  editable: boolean;
};

/**
 * Sprite del pokémon as. Al pincharlo se abre su ficha, donde su dueño puede
 * cambiar de pokémon, ponerle mote y contar por qué es su as.
 */
export function AceBadge({
  ace,
  size = 26,
  showEmpty = false,
}: {
  ace: AceInfo;
  size?: number;
  /** Enseña un hueco para elegirlo cuando todavía no hay as */
  showEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!ace.species && !(showEmpty && ace.editable)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          ace.species
            ? `As de ${ace.playerName}: ${ace.nickname ?? ace.species}`
            : "Elegir tu pokémon as"
        }
        className={cx(
          "flex shrink-0 items-center justify-center rounded-lg transition hover:scale-110",
          ace.species ? "bg-ink-850/80" : "border border-dashed border-white/20",
        )}
        style={{ width: size, height: size }}
      >
        {ace.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <SpritePokemon
            src={ace.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <span
            className="text-xs opacity-60"
            style={{ fontSize: Math.max(10, size * 0.5) }}
            aria-hidden
          >
            {ace.species ? "★" : "+"}
          </span>
        )}
      </button>

      {open ? <AceCard ace={ace} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AceCard({ ace, onClose }: { ace: AceInfo; onClose: () => void }) {
  const [editing, setEditing] = useState(!ace.species);

  // Se saca del árbol con un portal: las tarjetas llevan backdrop-blur, y eso
  // haría que un position:fixed se posicionara respecto a la tarjeta.
  return (
    <Hoja onCerrar={onClose} ancho="max-w-lg" fondo="bg-black/70" className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="antetitulo">
            Pokémon as
          </p>
          <p className="text-sm text-slate-400">{ace.playerName}</p>
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

      {ace.species && !editing ? (
        <>
          <div
            className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/5"
            style={{ background: `${ace.color}14` }}
          >
            {ace.detailImage ?? ace.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <SpritePokemon
                ficha
                src={ace.detailImage ?? ace.image ?? ""}
                alt={ace.species}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-4xl opacity-30" aria-hidden>
                ★
              </span>
            )}
          </div>

          <h3 className="mt-4 text-xl font-bold text-white">
            {ace.nickname ?? ace.species}
          </h3>
          <p className="muted">{ace.species}</p>

          {ace.reason ? (
            <p className="mt-3 border-l-2 border-brand-500/40 pl-3 text-sm italic leading-relaxed text-slate-300">
              {ace.reason}
            </p>
          ) : null}

          {ace.editable ? (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setEditing(true)}
              >
                ✎ Cambiar mi as
              </button>
              <form action={clearAceAction} onSubmit={() => onClose()}>
                <input
                  type="hidden"
                  name="participantId"
                  value={ace.participantId}
                />
                <ConfirmSubmit message="¿Quitar tu pokémon as?">
                  Quitar
                </ConfirmSubmit>
              </form>
            </div>
          ) : null}
        </>
      ) : (
        <ElegirDeLaCaja ace={ace} onCancelar={ace.species ? () => setEditing(false) : null} onHecho={onClose} />
      )}
    </Hoja>
  );
}

/**
 * Elegir el as **de la caja**: los vivos del Equipo y PC de su dueño, en
 * cuadrícula y agrupados como en el PC, con buscador por mote o especie. Se
 * piden al abrir, que la caja no viaja con la clasificación (y es privada).
 */
function ElegirDeLaCaja({
  ace,
  onCancelar,
  onHecho,
}: {
  ace: AceInfo;
  onCancelar: (() => void) | null;
  onHecho: () => void;
}) {
  const router = useRouter();
  const [candidatos, setCandidatos] = useState<CandidatoAAs[] | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(ace.reason ?? "");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<FormState>(null);
  const [guardando, empezar] = useTransition();

  useEffect(() => {
    let vigente = true;
    candidatosAAsAction(ace.participantId)
      .then((respuesta) => {
        if (!vigente) return;
        if (respuesta.error) return setEstado({ error: respuesta.error });
        setCandidatos(respuesta.candidatos ?? []);
        setElegido(respuesta.actual ?? null);
      })
      .catch(() => vigente && setEstado({ error: "Sin conexión: tu caja se ve con línea." }));
    return () => {
      vigente = false;
    };
  }, [ace.participantId]);

  const plano = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const busqueda = plano(texto.trim());
  const grupos: { titulo: string; lista: CandidatoAAs[] }[] = [];
  for (const c of candidatos ?? []) {
    if (busqueda && !plano(c.nombre).includes(busqueda) && !plano(c.especie).includes(busqueda)) continue;
    const grupo = grupos.find((g) => g.titulo === c.donde);
    if (grupo) grupo.lista.push(c);
    else grupos.push({ titulo: c.donde, lista: [c] });
  }

  function guardar() {
    if (!elegido) return;
    empezar(async () => {
      try {
        const hecho = await elegirAsAction({ participantId: ace.participantId, captureId: elegido, reason: motivo });
        if (hecho.error) return setEstado({ error: hecho.error });
        router.refresh();
        onHecho();
      } catch {
        setEstado({ error: "Sin conexión: el as se cambia con línea." });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="label">Elige tu as de tu Equipo y PC</p>
        <p className="text-xs text-slate-500">
          Se pone al día solo: si evoluciona o le cambias el mote, tu as también.
        </p>
      </div>
      {candidatos === null && !estado?.error ? (
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6" aria-label="Cargando tu caja">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/[0.05]" />
          ))}
        </div>
      ) : candidatos && !candidatos.length ? (
        <p className="rounded-lg border border-dashed border-white/15 p-4 text-center text-sm text-slate-400">
          No tienes ningún pokémon vivo en tu Equipo y PC. Apunta una captura y vuelve.
        </p>
      ) : candidatos ? (
        <>
          {candidatos.length > 8 ? (
            <input
              className="input"
              type="search"
              placeholder="Busca por mote o especie…"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
          ) : null}
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {grupos.map((grupo) => (
              <section key={grupo.titulo}>
                <p className="rotulo mb-1.5">{grupo.titulo}</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                  {grupo.lista.map((c) => (
                    <button
                      key={c.captureId}
                      type="button"
                      onClick={() => setElegido(c.captureId)}
                      aria-pressed={elegido === c.captureId}
                      className={cx(
                        "flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-center transition",
                        elegido === c.captureId
                          ? "border-brand-400 bg-brand-500/15 ring-2 ring-brand-400/40"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25",
                      )}
                    >
                      <SpritePokemon
                        src={c.imagen}
                        shiny={c.shiny}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 object-contain"
                      />
                      <span className="w-full truncate text-[11px] leading-tight text-slate-200">{c.nombre}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {!grupos.length ? <p className="py-4 text-center text-sm text-slate-500">Nadie con ese nombre.</p> : null}
          </div>
        </>
      ) : null}

      <div>
        <label className="label" htmlFor="motivo-del-as">
          ¿Por qué es tu as? (opcional)
        </label>
        <textarea
          id="motivo-del-as"
          className="textarea"
          rows={2}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Me sacó del gimnasio de Antón con 2 PS"
        />
      </div>

      <FormMessage state={estado} />
      <div className="flex gap-2">
        <button type="button" className="btn-primary" disabled={!elegido || guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar as"}
        </button>
        {onCancelar ? (
          <button type="button" className="btn-ghost" onClick={onCancelar}>
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
