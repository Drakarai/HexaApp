"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { guardarLockeDeAntesAction } from "@/app/actions/lockes-de-antes";
import type { FormState } from "@/app/actions/auth";
import type { DatosDeLockeDeAntes } from "@/lib/palmares";
import { FormMessage, SubmitButton } from "@/components/ui";
import { ImageInput } from "@/components/image-input";
import { IMAGE_SIZES } from "@/lib/image";

export type CuentaParaElegir = {
  id: string;
  displayName: string;
  username: string;
};

/**
 * Apuntar un locke que se jugó antes de que existiera la aplicación.
 *
 * Solo pide lo que de verdad se recuerda: nombre, juego, cuándo fue, quién
 * jugó y quién ganó. Lo demás —bajas, combates, puntos— no se pregunta porque
 * no se puede saber, y en el palmarés esas líneas salen con las cifras en
 * blanco.
 */
export function ApuntarLockeDeAntesForm({
  cuentas,
  deEntrada,
}: {
  cuentas: CuentaParaElegir[];
  /**
   * Quiénes vienen marcados de entrada: los del locke que se está jugando
   * ahora. Un locke de antes lo jugó casi siempre la misma gente, y marcarlo
   * todo por defecto colaba cuentas que no pintaban nada —la de Administrador,
   * sin ir más lejos—, que además es quien acabaría viéndolo.
   */
  deEntrada: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  if (!cuentas.length) return null;

  return (
    <details
      className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-3"
      open={abierto}
      onToggle={(event) => setAbierto(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
        ▸ Apuntar un locke de antes
      </summary>
      {abierto ? (
        <FormularioDeLockeDeAntes
          cuentas={cuentas}
          deEntrada={deEntrada}
          alGuardar={() => setAbierto(false)}
        />
      ) : null}
    </details>
  );
}

/** Lo mismo, para cambiar uno ya apuntado: jugadores, ganador, vincular… */
export function EditarLockeDeAntes({
  id,
  datos,
  cuentas,
}: {
  id: string;
  datos: DatosDeLockeDeAntes;
  cuentas: CuentaParaElegir[];
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <details
      className="mt-2"
      open={abierto}
      onToggle={(event) => setAbierto(event.currentTarget.open)}
    >
      <summary className="btn-ghost btn-sm cursor-pointer list-none">Editar</summary>
      {abierto ? (
        <FormularioDeLockeDeAntes
          id={id}
          datos={datos}
          cuentas={cuentas}
          deEntrada={datos.jugadoresIds}
          alGuardar={() => setAbierto(false)}
        />
      ) : null}
    </details>
  );
}

function FormularioDeLockeDeAntes({
  id,
  datos,
  cuentas,
  deEntrada,
  alGuardar,
}: {
  id?: string;
  datos?: DatosDeLockeDeAntes;
  cuentas: CuentaParaElegir[];
  deEntrada: string[];
  alGuardar: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    guardarLockeDeAntesAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [sinCuentaTexto, setSinCuentaTexto] = useState(datos?.sinCuenta.join(", ") ?? "");
  const [ganador, setGanador] = useState(
    datos?.ganador ?? (cuentas[0] ? `u:${cuentas[0].id}` : ""),
  );
  const [subcampeon, setSubcampeon] = useState(datos?.subcampeon ?? "");

  useEffect(() => {
    if (state?.success) {
      if (!id) formRef.current?.reset();
      alGuardar();
    }
  }, [state, id, alGuardar]);

  // Los nombres sin cuenta, para ofrecerlos como ganador o subcampeón
  const nombres = [
    ...new Set(
      sinCuentaTexto
        .split(/[,\n]/)
        .map((nombre) => nombre.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  ];
  const opciones = [
    ...cuentas.map((cuenta) => ({ valor: `u:${cuenta.id}`, rotulo: cuenta.displayName })),
    ...nombres.map((nombre) => ({ valor: `n:${nombre}`, rotulo: `${nombre} (sin cuenta)` })),
  ];
  // Si el elegido era un nombre que se acaba de borrar del campo, que no desaparezca
  for (const elegido of [ganador, subcampeon]) {
    if (elegido.startsWith("n:") && !opciones.some((o) => o.valor === elegido)) {
      opciones.push({ valor: elegido, rotulo: `${elegido.slice(2)} (sin cuenta)` });
    }
  }

  return (
    <form ref={formRef} action={formAction} className="mt-3 space-y-3">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {id ? null : (
        <p className="text-xs text-slate-500">
          Para los lockes que jugasteis antes de tener esto. Solo quedará la
          línea del palmarés: de aquello no hay bajas ni combates que contar.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input
            name="nombre"
            className="input"
            placeholder="Hexalocke 1"
            defaultValue={datos?.nombre}
            required
          />
        </div>
        <div>
          <label className="label">Juego (opcional)</label>
          <input
            name="juego"
            className="input"
            placeholder="HeartGold"
            defaultValue={datos?.juego ?? ""}
          />
        </div>
      </div>

      <fieldset>
        <legend className="label">Quiénes lo jugaron</legend>
        {/**
         * No es decorativo: **decide quién ve este locke en su palmarés**. Si
         * lo viera todo el mundo, alguien que monta su propio locke se
         * encontraría el histórico de un grupo con el que no tiene nada que
         * ver. Al ganador se le añade solo en el servidor.
         */}
        <p className="mb-2 text-xs text-slate-500">
          Solo los que tienen cuenta lo verán en su palmarés.
          {id ? "" : " Vienen marcados los del locke de ahora."} Al ganador y al
          subcampeón se les apunta solos.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {cuentas.map((cuenta) => (
            <label
              key={cuenta.id}
              className="flex items-center gap-2 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                name="jugadoresIds"
                value={cuenta.id}
                defaultChecked={deEntrada.includes(cuenta.id)}
              />
              <span className="min-w-0 truncate">
                {cuenta.displayName}{" "}
                <span className="text-slate-500">@{cuenta.username}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label">Sin cuenta (opcional)</label>
        <input
          name="sinCuenta"
          className="input"
          placeholder="Marcos, Lucas"
          value={sinCuentaTexto}
          onChange={(event) => setSinCuentaTexto(event.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Los que jugaron y no tienen cuenta, separados por comas. Cuentan para el
          tamaño del locke y pueden haberlo ganado.
        </p>
      </div>

      {/**
       * Vincular: el amigo que jugó sin cuenta y ahora la tiene. Se elige su
       * cuenta y al guardar su nombre se cambia por ella, también si ganó; a
       * partir de ahí el locke le cuenta en el palmarés.
       */}
      {id && datos?.sinCuenta.length ? (
        <fieldset className="rounded-lg border border-white/10 p-3">
          <legend className="label px-1">¿Alguno ya tiene cuenta?</legend>
          <div className="space-y-2">
            {datos.sinCuenta.map((nombre) => (
              <label key={nombre} className="flex items-center gap-2 text-sm text-slate-200">
                <span className="w-28 shrink-0 truncate">{nombre}</span>
                <select name={`vincular:${nombre}`} className="input" defaultValue="">
                  <option value="">Sigue sin cuenta</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      Es {cuenta.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Cuándo fue</label>
          <input
            name="cuando"
            type="date"
            className="input"
            defaultValue={datos?.cuando}
            required
          />
        </div>
        <div>
          <label className="label">Lo ganó</label>
          <select
            name="ganador"
            className="input"
            value={ganador}
            onChange={(event) => setGanador(event.target.value)}
          >
            {opciones.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Subcampeón (opcional)</label>
          <select
            name="subcampeon"
            className="input"
            value={subcampeon}
            onChange={(event) => setSubcampeon(event.target.value)}
          >
            <option value="">Nadie / no me acuerdo</option>
            {opciones
              .filter((opcion) => opcion.valor !== ganador)
              .map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.rotulo}
                </option>
              ))}
          </select>
        </div>
      </div>

      <ImageInput
        name="logo"
        label="Logo (opcional)"
        defaultValue={datos?.logo ?? null}
        maxSize={IMAGE_SIZES.logo}
        hint="Sale en el historial de ediciones y en la vitrina de quien lo ganó."
      />

      <div>
        <label className="label">Notas (opcional)</label>
        <input
          name="notas"
          className="input"
          placeholder="Se jugó en un grupo de WhatsApp…"
          defaultValue={datos?.notas ?? ""}
        />
      </div>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary btn-sm">
        {id ? "Guardar cambios" : "Apuntar en el palmarés"}
      </SubmitButton>
    </form>
  );
}
