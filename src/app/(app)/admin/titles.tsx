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
  concedidos: {
    awardId: string;
    userId: string;
    displayName: string;
    note: string | null;
    awardedAt: string;
    equipped: boolean;
  }[];
};

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
}: {
  titulos: TituloAdmin[];
  usuarios: UsuarioSimple[];
}) {
  return (
    <section className="card">
      <h2 className="section-title mb-1">Títulos</h2>
      <p className="muted mb-4">
        Distinciones que te inventas y repartes. Salen debajo del nombre en el
        perfil de cada uno, y solo son eso: adorno.
      </p>

      <NuevoTitulo />

      {titulos.length === 0 ? (
        <p className="muted mt-4">Todavía no has creado ninguno.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {titulos.map((titulo) => (
            <Titulo key={titulo.id} titulo={titulo} usuarios={usuarios} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NuevoTitulo() {
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
        Crear un título
      </summary>

      <form action={crear} className="mt-3 space-y-3">
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
}: {
  titulo: TituloAdmin;
  usuarios: UsuarioSimple[];
}) {
  const [editando, setEditando] = useState(false);
  const [estado, conceder] = useActionState<FormState, FormData>(
    concederTituloAction,
    null,
  );

  // A quien ya lo tiene no se le puede volver a dar
  const yaLoTienen = new Set(titulo.concedidos.map((c) => c.userId));
  const candidatos = usuarios.filter((usuario) => !yaLoTienen.has(usuario.id));

  return (
    <li className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <TitleBadge titulo={titulo} />
        <span className="text-xs text-slate-500">
          {titulo.concedidos.length === 0
            ? "sin repartir"
            : `${titulo.concedidos.length} ${titulo.concedidos.length === 1 ? "persona" : "personas"}`}
        </span>
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
              {concesion.equipped ? (
                <span className="text-[10px] uppercase tracking-wide text-brand-400">
                  puesto
                </span>
              ) : null}
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
        <form action={conceder} className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
          <input type="hidden" name="titleId" value={titulo.id} />
          <select name="userId" className="input" defaultValue={candidatos[0].id}>
            {candidatos.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.displayName}
              </option>
            ))}
          </select>
          <input
            name="note"
            className="input"
            placeholder="Por qué se lo lleva (opcional)"
          />
          <SubmitButton className="btn-ghost btn-sm">Dárselo</SubmitButton>
          <div className="sm:col-span-3">
            <FormMessage state={estado} />
          </div>
        </form>
      ) : (
        <p className="mt-2 text-xs text-slate-600">Lo tiene ya todo el mundo.</p>
      )}
    </li>
  );
}
