"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  contestarSugerenciaAction,
  enviarSugerenciaAction,
  marcarRespuestasVistasAction,
  marcarSugerenciasLeidasAction,
} from "@/app/actions/buzon";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { Icono } from "@/components/icono";
import { ImageInput } from "@/components/image-input";
import { leerPantallaAnterior } from "@/components/recordar-pantalla";
import {
  ESTADOS,
  ESTADOS_QUE_SE_ELIGEN,
  LIMITES_DEL_BUZON,
  PANTALLAS_DEL_BUZON,
  TIPOS_DE_SUGERENCIA,
  pantallaDeLaQueVienes,
  type EstadoDeSugerencia,
  type TipoDeSugerencia,
} from "@/lib/buzon";
import { cx } from "@/lib/utils";

const TIPOS = Object.entries(TIPOS_DE_SUGERENCIA) as [
  TipoDeSugerencia,
  (typeof TIPOS_DE_SUGERENCIA)[TipoDeSugerencia],
][];

export function FormularioDeSugerencia({
  fallo,
}: {
  /** Se viene de «Se ha roto algo»: su código, o "navegador" si fue al pintar */
  fallo?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(enviarSugerenciaAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoDeSugerencia>("error");
  const [pantalla, setPantalla] = useState("");
  const [dispositivo, setDispositivo] = useState("");
  // Para vaciar la captura al mandar: el selector guarda la suya por dentro
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    // Casi siempre se entra justo después de ver el fallo: esa pantalla, ya elegida
    setPantalla(pantallaDeLaQueVienes(leerPantallaAnterior()));
    // Lo primero que hace falta para reproducir un error
    setDispositivo(
      `${navigator.userAgent} · pantalla ${window.screen.width}×${window.screen.height} · ventana ${window.innerWidth}×${window.innerHeight}`,
    );
  }, []);

  useEffect(() => {
    if (!state?.success) return;
    formRef.current?.reset();
    setTipo("error");
    setVuelta((n) => n + 1);
  }, [state]);

  const elegido = TIPOS_DE_SUGERENCIA[tipo];

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <fieldset>
        <legend className="label">¿Qué es?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TIPOS.map(([valor, datos]) => (
            <label
              key={valor}
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                tipo === valor
                  ? "border-brand-500/60 bg-brand-600/15"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20",
              )}
            >
              <input
                type="radio"
                name="tipo"
                value={valor}
                checked={tipo === valor}
                onChange={() => setTipo(valor)}
                className="sr-only"
              />
              <span aria-hidden className="mt-0.5 text-lg">
                <Icono emoji={datos.icono} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{datos.rotulo}</span>
                <span className="block text-xs text-slate-400">{datos.pista}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="buzon-titulo">En una línea</label>
        <input
          id="buzon-titulo"
          name="titulo"
          className="input"
          required
          maxLength={LIMITES_DEL_BUZON.titulo}
          placeholder={elegido.ejemplo}
        />
      </div>

      <div>
        <label className="label" htmlFor="buzon-texto">Cuéntalo</label>
        <textarea
          id="buzon-texto"
          name="texto"
          className="textarea"
          rows={5}
          required
          maxLength={LIMITES_DEL_BUZON.texto}
          defaultValue={
            !fallo
              ? undefined
              : fallo === "navegador"
                ? "Me salió «Se ha roto algo» al…"
                : `Me salió «Se ha roto algo» (código ${fallo}) al…`
          }
          placeholder={
            tipo === "error"
              ? "Qué estabas haciendo, qué esperabas que pasara y qué pasó."
              : "Qué harías y para qué te serviría."
          }
        />
      </div>

      <div>
        <label className="label" htmlFor="buzon-pantalla">¿Dónde?</label>
        <select
          id="buzon-pantalla"
          name="pantalla"
          className="input"
          value={pantalla}
          onChange={(event) => setPantalla(event.target.value)}
        >
          <option value="">En general / no lo sé</option>
          {PANTALLAS_DEL_BUZON.map((p) => (
            <option key={p.href} value={p.href}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </div>

      <ImageInput
        key={vuelta}
        name="imagen"
        label="Una captura (si ayuda)"
        maxSize={1280}
        sinEnlace
        hint="Una foto de la pantalla vale más que tres párrafos, sobre todo si es un error."
      />

      <input type="hidden" name="dispositivo" value={dispositivo} />
      <p className="text-xs text-slate-500">
        Con lo que mandes va también qué navegador y qué tamaño de pantalla usas, que es lo
        primero que hace falta para encontrar un error.
      </p>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Mandando…">Mandar</SubmitButton>
    </form>
  );
}

/** El Creador: estado y respuesta de una */
export function ContestarSugerencia({
  id,
  estado,
  respuesta,
}: {
  id: string;
  estado: EstadoDeSugerencia;
  respuesta: string | null;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(contestarSugerenciaAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Estado">
        {ESTADOS_QUE_SE_ELIGEN.map((valor) => (
          <label key={valor} className="cursor-pointer">
            <input
              type="radio"
              name="estado"
              value={valor}
              // Una recién llegada ya está leída: la estás leyendo
              defaultChecked={valor === (estado === "NUEVA" ? "LEIDA" : estado)}
              className="peer sr-only"
            />
            <span
              className={cx(
                "chip transition peer-checked:bg-white/10 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400",
                ESTADOS[valor].clase,
              )}
            >
              {ESTADOS[valor].rotulo}
            </span>
          </label>
        ))}
      </div>
      <textarea
        name="respuesta"
        aria-label="Respuesta"
        className="textarea"
        rows={2}
        maxLength={LIMITES_DEL_BUZON.respuesta}
        defaultValue={respuesta ?? ""}
        placeholder="Contéstale (opcional): «Arreglado, gracias», «Lo apunto para después»…"
      />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
    </form>
  );
}

/**
 * Al entrar: el Creador da por leídas las que acaban de llegar, y quien mandó
 * algo da por vistas sus respuestas. Solo si hay algo que marcar.
 */
export function MarcarBuzonVisto({ nuevas, respuestas }: { nuevas: boolean; respuestas: boolean }) {
  useEffect(() => {
    if (nuevas) void marcarSugerenciasLeidasAction();
    if (respuestas) void marcarRespuestasVistasAction();
  }, [nuevas, respuestas]);
  return null;
}
