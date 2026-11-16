"use client";

import { useActionState, useState } from "react";
import {
  borrarTituloAction,
  concederTituloAction,
  crearTituloAction,
  editarTituloAction,
  revocarTituloAction,
} from "@/app/actions/titulos";
import type { FormState } from "@/app/actions/auth";
import { ConfirmSubmit, FormMessage, SubmitButton } from "@/components/ui";
import { TitleBadge } from "@/components/title-badge";
import { formatDate } from "@/lib/utils";

export type TituloAdmin = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  /** Se puede cambiar o borrar desde aquí (el común en Administración, los extras en su locke) */
  editable: boolean;
  /** Es un extra del locke: solo se da dentro de él */
  extra: boolean;
  concedidos: {
    awardId: string;
    userId: string;
    displayName: string;
    note: string | null;
    awardedAt: string;
    equipped: boolean;
    /** «General», «General · Hexalocke 2», «Solo en Hexalocke 2» */
    donde: string;
  }[];
};

/**
 * Desde dónde se reparten: en **Administración** el Creador lo da en general o
 * en cualquier locke; en los **ajustes de un locke**, quien lo administra solo
 * dentro de él.
 */
export type DondeSeReparte =
  | { tipo: "creador"; lockes: { id: string; name: string }[] }
  | { tipo: "locke"; locke: { id: string; name: string } };

export type UsuarioSimple = { id: string; displayName: string };

/** Colores de salida, para no tener que pelearse con el selector del sistema. */
const COLORES = [
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#38bdf8",
  "#f87171",
  "#94a3b8",
];

/**
 * Crear títulos y repartirlos. Son un adorno y nada más: no dan puntos ni
 * cuentan para la clasificación, así que aquí no hay ninguna regla que
 * comprobar más allá de ser administrador.
 */
export function Titles({
  titulos,
  usuarios,
  donde,
}: {
  titulos: TituloAdmin[];
  usuarios: UsuarioSimple[];
  donde: DondeSeReparte;
}) {
  const enLocke = donde.tipo === "locke";
  return (
    <section className="card">
      <h2 className="section-title mb-1">{enLocke ? "Títulos del locke" : "Títulos"}</h2>
      <p className="muted mb-4">
        {enLocke
          ? "Los del catálogo común y los que te inventes para este locke. Al darlo eliges si es solo de este locke (se lleva puesto aquí) o general (se lleva en cualquier sitio y dice que se ganó aquí). Son solo adorno."
          : "El catálogo común: vale en cualquier locke, y quien administra cada uno también los reparte allí. Aquí se dan generales, asociados a un locke o solo de él. Son solo adorno."}
      </p>

      <NuevoTitulo competitionId={enLocke ? donde.locke.id : null} />

      {titulos.length === 0 ? (
        <p className="muted mt-4">Todavía no hay ninguno.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {titulos.map((titulo) => (
            <Titulo key={titulo.id} titulo={titulo} usuarios={usuarios} donde={donde} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Las opciones de «dónde» al dar un título (ver `leerAlcance` en actions/titulos.ts) */
function opcionesDeDonde(donde: DondeSeReparte, extra: boolean) {
  if (donde.tipo === "locke") {
    return extra
      ? [{ valor: `locke:${donde.locke.id}`, rotulo: "Solo en este locke" }]
      : [
          { valor: `locke:${donde.locke.id}`, rotulo: "Solo en este locke" },
          { valor: `general:${donde.locke.id}`, rotulo: "General, ganado aquí" },
        ];
  }
  return [
    { valor: "general", rotulo: "General" },
    ...donde.lockes.flatMap((l) => [
      { valor: `general:${l.id}`, rotulo: `General, ganado en ${l.name}` },
      { valor: `locke:${l.id}`, rotulo: `Solo en ${l.name}` },
    ]),
  ];
}

function NuevoTitulo({ competitionId }: { competitionId: string | null }) {
  const [estado, crear] = useActionState<FormState, FormData>(
    crearTituloAction,
    null,
  );
  const [color, setColor] = useState(COLORES[0]);
  const [icono, setIcono] = useState("🏅");
  const [nombre, setNombre] = useState("");

  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-white">
        <span className="mr-2 inline-block">＋</span>
        {competitionId ? "Crear un título para este locke" : "Crear un título"}
      </summary>

      <form action={crear} className="mt-3 space-y-3">
        {competitionId ? <input type="hidden" name="competitionId" value={competitionId} /> : null}
        <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
          <div>
            <label className="label">Emoji</label>
            <input
              name="icon"
              className="input text-center text-lg"
              maxLength={4}
              value={icono}
              onChange={(evento) => setIcono(evento.target.value)}
            />
          </div>
          <div>
            <label className="label">Nombre</label>
            <input
              name="name"
              className="input"
              placeholder="Rey del cementerio"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              maxLength={60}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Hasta 60 caracteres: más largo no se lee bien en la clasificación.
            </p>
          </div>
        </div>

        <div>
          <label className="label">Qué significa (opcional)</label>
          <input
            name="description"
            className="input"
            placeholder="Para el que más pokémon ha perdido en una edición"
          />
        </div>

        <div>
          <label className="label">Color</label>
          <input type="hidden" name="color" value={color} />
          <div className="flex flex-wrap gap-1.5">
            {COLORES.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-label={`Color ${opcion}`}
                aria-pressed={color === opcion}
                onClick={() => setColor(opcion)}
                className="h-7 w-7 rounded-full border-2 transition"
                style={{
                  background: opcion,
                  borderColor: color === opcion ? "#fff" : "transparent",
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="label">Así queda</p>
          <TitleBadge
            titulo={{
              name: nombre || "Nombre del título",
              description: null,
              icon: icono || null,
              color,
            }}
          />
        </div>

        <FormMessage state={estado} />
        <SubmitButton className="btn-primary btn-sm">Crear título</SubmitButton>
      </form>
    </details>
  );
}

function Titulo({
  titulo,
  usuarios,
  donde,
}: {
  titulo: TituloAdmin;
  usuarios: UsuarioSimple[];
  donde: DondeSeReparte;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, conceder] = useActionState<FormState, FormData>(
    concederTituloAction,
    null,
  );

  // El mismo título se puede ganar en sitios distintos: si ya lo tiene ahí, lo dice la acción
  const candidatos = usuarios;
  const opciones = opcionesDeDonde(donde, titulo.extra);

  return (
    <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <TitleBadge titulo={titulo} />
        {titulo.extra ? <span className="chip text-[10px]">de este locke</span> : null}
        <span className="text-xs text-slate-500">
          {titulo.concedidos.length === 0
            ? "sin repartir"
            : `${titulo.concedidos.length} ${titulo.concedidos.length === 1 ? "persona" : "personas"}`}
        </span>
        {titulo.editable ? (
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setEditando((estaba) => !estaba)}
          >
            ✎
          </button>
          <form action={borrarTituloAction}>
            <input type="hidden" name="titleId" value={titulo.id} />
            <ConfirmSubmit
              message={`¿Borrar "${titulo.name}"? Se lo quitas a todo el que lo tenga.`}
            >
              ✕
            </ConfirmSubmit>
          </form>
        </div>
        ) : null}
      </div>

      {titulo.description ? (
        <p className="mt-1 text-xs text-slate-500">{titulo.description}</p>
      ) : null}

      {editando ? (
        <form
          action={async (formData) => {
            await editarTituloAction(formData);
            setEditando(false);
          }}
          className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4"
        >
          <input type="hidden" name="titleId" value={titulo.id} />
          <div>
            <label className="label">Emoji</label>
            <input
              name="icon"
              className="input text-center"
              maxLength={4}
              defaultValue={titulo.icon ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input
              name="name"
              className="input"
              defaultValue={titulo.name}
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              name="color"
              className="input h-[42px] p-1"
              defaultValue={titulo.color}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Qué significa</label>
            <input
              name="description"
              className="input"
              defaultValue={titulo.description ?? ""}
            />
          </div>
          <div className="sm:col-span-4">
            <SubmitButton className="btn-ghost btn-sm">Guardar</SubmitButton>
          </div>
        </form>
      ) : null}

      {titulo.concedidos.length ? (
        <ul className="mt-2 space-y-1">
          {titulo.concedidos.map((concesion) => (
            <li
              key={concesion.awardId}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-xs"
            >
              <span className="font-semibold text-slate-200">
                {concesion.displayName}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{concesion.donde}</span>
              <span className="min-w-0 flex-1 truncate text-slate-500">
                {concesion.note ?? "—"}
              </span>
              <span className="shrink-0 text-slate-600">
                {formatDate(concesion.awardedAt)}
              </span>
              <form action={revocarTituloAction}>
                <input type="hidden" name="awardId" value={concesion.awardId} />
                <ConfirmSubmit
                  message={`¿Quitarle "${titulo.name}" a ${concesion.displayName}?`}
                  className="btn-ghost btn-sm px-1.5"
                >
                  ✕
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {candidatos.length ? (
        // Plegado: con el catálogo entero, un formulario abierto por título hacía la pestaña eterna
        <details className="mt-2 group/dar">
          <summary className="cursor-pointer list-none text-xs font-semibold text-brand-300">
            ＋ Dárselo a alguien
          </summary>
          <form action={conceder} className="mt-2 grid gap-2 sm:grid-cols-[10rem_12rem_1fr_auto]">
            <input type="hidden" name="titleId" value={titulo.id} />
            <select name="userId" className="input" key={String(candidatos[0].id)} defaultValue={candidatos[0].id}>
              {candidatos.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.displayName}
                </option>
              ))}
            </select>
            <select name="alcance" className="input" aria-label="Dónde" defaultValue={opciones[0].valor}>
              {opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <input
              name="note"
              className="input"
              placeholder="Por qué se lo lleva (opcional)"
            />
            <SubmitButton className="btn-ghost btn-sm">Dárselo</SubmitButton>
            <div className="sm:col-span-4">
              <FormMessage state={estado} />
            </div>
          </form>
        </details>
      ) : (
        <p className="mt-2 text-xs text-slate-500">No hay a quién dárselo.</p>
      )}
    </li>
  );
}
