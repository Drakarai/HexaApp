"use client";

import { CampoDeVidas } from "./competition-forms";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  crearLockeEnSolitarioAction,
  pedirLockeAction,
  retirarSolicitudAction,
} from "@/app/actions/solicitudes";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { JuegoPicker } from "@/components/juego-picker";
import { formatDate } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { ESTILOS, JUGADORES_DEL_SOUL_LINK } from "@/lib/perfiles-de-locke";

/**
 * Abrir un locke en solitario.
 *
 * Es el mismo formulario para todos, pero no hace lo mismo: un administrador lo
 * crea directamente y el resto manda una petición, que es lo que se acordó. Se
 * comparte el formulario porque la diferencia está en quién eres, no en qué
 * rellenas, y tener dos iguales garantizaba que uno se quedara viejo.
 */
export function LockeEnSolitarioForm({
  puedeCrearDirecto,
  abierto = false,
  explicado = false,
}: {
  puedeCrearDirecto: boolean;
  /** Desplegado de entrada: en la bienvenida es lo que se viene a hacer */
  abierto?: boolean;
  /** Lo de qué es pedir un locke ya se ha contado encima: no se repite */
  explicado?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    puedeCrearDirecto ? crearLockeEnSolitarioAction : pedirLockeAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [cuantos, setCuantos] = useState(1);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setCuantos(1);
    }
  }, [state]);

  return (
    <details className="card group" open={abierto}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        <Icono emoji="🎮" /> {puedeCrearDirecto ? "Crear mi locke en solitario" : "Pedir un locke"}
      </summary>

      {explicado ? null : (
      <p className="muted mt-3">
        {puedeCrearDirecto ? (
          <>
            Una partida para ti solo: sin jornadas, sin clasificación y sin
            final, pero con tu caja, tu mapa de capturas, tus level caps, tu
            bolsa y tus notas. El locke se gana{" "}
            <strong>pasándote la Liga</strong>. Se crea al momento y no archiva
            las ediciones que estén en curso.
          </>
        ) : (
          <>
            Para ti solo o para jugarlo con tus amigos. Se lo pides a quien
            lleva la aplicación y te contestan por aquí; si te dicen que sí,{" "}
            <strong>el locke es tuyo</strong> y lo administras tú. Pidiéndolo
            para dos o más, además podrás{" "}
            <strong>dar de alta a los tuyos</strong>.
          </>
        )}
      </p>
      )}

      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input
              name="name"
              className="input"
              placeholder="Mi nuzlocke de Plata"
              required
            />
          </div>
          <div>
            <label className="label">Modalidad</label>
            <input name="modality" className="input" placeholder="Nuzlocke clásico" />
          </div>
          <div className="sm:col-span-2">
            <JuegoPicker />
          </div>
          {/* Solo al pedirlo: el de crear directo es siempre en solitario */}
          {puedeCrearDirecto ? null : (
            <div>
              <label className="label">Cuántos vais a jugar</label>
              <select
                name="maxPlayers"
                className="input"
                value={cuantos}
                onChange={(evento) => setCuantos(Number(evento.target.value))}
              >
                <option value="1">Yo solo</option>
                {[2, 3, 4, 5, 6, 7, 8].map((cuantos) => (
                  <option key={cuantos} value={cuantos}>
                    {cuantos} jugadores
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Con compañía se puede pedir cooperativo; un Soul Link es de 2 a 4 */}
          {!puedeCrearDirecto && cuantos > 1 ? (
            <div>
              <label className="label">Cómo se juega</label>
              <select name="estilo" className="input" defaultValue="competitivo">
                <option value="competitivo">{ESTILOS.competitivo.nombre}: unos contra otros</option>
                {cuantos <= JUGADORES_DEL_SOUL_LINK.maximo ? (
                  <option value="soullink">{ESTILOS.soullink.nombre}: cooperativo y vinculado</option>
                ) : null}
              </select>
            </div>
          ) : null}
        </div>
        {/* Al pedirlo no: eso lo ajusta quien lo apruebe, en Editar datos */}
        {puedeCrearDirecto ? <CampoDeVidas /> : null}
        <div>
          <label className="label">
            {puedeCrearDirecto ? "Descripción" : "Cuéntale de qué va"}
          </label>
          <textarea name="description" className="textarea" rows={2} />
        </div>
        <FormMessage state={state} />
        <SubmitButton>
          {puedeCrearDirecto ? "Crear el locke" : "Pedirlo"}
        </SubmitButton>
      </form>
    </details>
  );
}

/** En qué han quedado las peticiones de uno. */
export function MisSolicitudes({
  solicitudes,
}: {
  solicitudes: Array<{
    id: string;
    name: string;
    estado: string;
    respuesta: string | null;
    createdAt: Date;
  }>;
}) {
  if (!solicitudes.length) return null;

  return (
    <section className="card mb-6">
      <h2 className="section-title mb-3">Lo que has pedido</h2>
      <ul className="space-y-2">
        {solicitudes.map((solicitud) => (
          <li
            key={solicitud.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {solicitud.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                Pedido el {formatDate(solicitud.createdAt)}
                {solicitud.respuesta ? ` · «${solicitud.respuesta}»` : ""}
              </p>
            </div>
            <Estado estado={solicitud.estado} />
            {solicitud.estado === "PENDIENTE" ? (
              <form action={retirarSolicitudAction}>
                <input type="hidden" name="solicitudId" value={solicitud.id} />
                <button type="submit" className="btn-ghost btn-sm">
                  Retirar
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Estado({ estado }: { estado: string }) {
  if (estado === "ACEPTADA") {
    return <span className="chip border-emerald-500/40 text-emerald-200">✓ Aceptada</span>;
  }
  if (estado === "RECHAZADA") {
    return <span className="chip border-red-500/40 text-red-200">✕ Rechazada</span>;
  }
  return <span className="chip text-amber-300"><Icono emoji="⏳" /> Esperando</span>;
}
