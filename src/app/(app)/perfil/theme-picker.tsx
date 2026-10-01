"use client";

import { useActionState, useState } from "react";
import { updateMyThemeAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { EVENTO_DE_TEMA, themesByGroup, type Theme } from "@/lib/themes";
import { cx } from "@/lib/utils";

/**
 * Elegir tema. Va todo plegado: con casi treinta temas, la rejilla entera se
 * comía la pantalla del perfil. Se abre el selector, y dentro cada grupo
 * (generación o ases) se abre por su cuenta; arranca abierto solo el grupo del
 * tema que llevas puesto, para no perderte.
 *
 * Al pinchar un tema se pinta al momento en toda la página (cambiando las
 * variables del <html>), y al guardar queda para siempre.
 */
export function ThemePicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateMyThemeAction,
    null,
  );

  const grupos = themesByGroup();
  const elegido = grupos
    .flatMap(([, temas]) => temas)
    .find((tema) => tema.id === selected);
  const grupoDelElegido = grupos.find(([, temas]) =>
    temas.some((tema) => tema.id === selected),
  )?.[0];

  const [abierto, setAbierto] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(
    grupoDelElegido ?? null,
  );

  function preview(theme: Theme) {
    setSelected(theme.id);
    const root = document.documentElement;
    for (const [name, value] of Object.entries(theme.vars)) {
      root.style.setProperty(name, value);
    }
    root.dataset.theme = theme.id;
    // La barra del móvil y el icono de la pestaña también, al momento
    window.dispatchEvent(new CustomEvent(EVENTO_DE_TEMA, { detail: theme.id }));
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="theme" value={selected} />

      {/* Cabecera: qué tema llevas y el botón para desplegar el resto */}
      <button
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
      >
        <Muestra theme={elegido} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {elegido?.name ?? "Tema"}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {grupoDelElegido ?? "Elige el tuyo"}
          </span>
        </span>
        <span
          aria-hidden
          className={cx(
            "shrink-0 text-xs text-slate-500 transition",
            abierto && "rotate-90",
          )}
        >
          ▸
        </span>
      </button>

      {abierto ? (
        <ul className="space-y-1.5">
          {grupos.map(([group, themes]) => {
            const desplegado = grupoAbierto === group;
            const tieneElElegido = group === grupoDelElegido;

            return (
              <li
                key={group}
                className={cx(
                  "overflow-hidden rounded-xl border",
                  tieneElElegido
                    ? "border-brand-500/40 bg-brand-500/[0.06]"
                    : "border-white/5 bg-white/[0.02]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setGrupoAbierto(desplegado ? null : group)}
                  aria-expanded={desplegado}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[0.04]"
                >
                  <span
                    aria-hidden
                    className={cx(
                      "shrink-0 text-xs text-slate-500 transition",
                      desplegado && "rotate-90",
                    )}
                  >
                    ▸
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
                    {group}
                  </span>
                  {tieneElElegido ? (
                    <span className="shrink-0 text-[11px] text-brand-400">
                      el tuyo
                    </span>
                  ) : null}
                  <span className="shrink-0 text-[11px] text-slate-600">
                    {themes.length}
                  </span>
                </button>

                {desplegado ? (
                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 p-2 sm:grid-cols-3 lg:grid-cols-4">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => preview(theme)}
                        className={cx(
                          "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition",
                          selected === theme.id
                            ? "border-brand-500 bg-brand-600/20 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
                        )}
                      >
                        <Muestra theme={theme} size={20} />
                        <span className="min-w-0 truncate">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="text-xs text-slate-500">
        El tema es tuyo: cada jugador puede tener el suyo sin cambiárselo a los
        demás.
      </p>

      <FormMessage state={state} />
      <SubmitButton>Guardar tema</SubmitButton>
    </form>
  );
}

/** La bolita de color de un tema. */
function Muestra({ theme, size = 24 }: { theme?: Theme; size?: number }) {
  if (!theme) {
    return (
      <span
        className="shrink-0 rounded-full border border-dashed border-white/20"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className="shrink-0 rounded-full ring-1 ring-white/20"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${theme.swatch}, ${
          theme.swatchTo ?? theme.vars["--color-ink-850"]
        })`,
      }}
      aria-hidden
    />
  );
}
