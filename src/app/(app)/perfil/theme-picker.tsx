"use client";

import { useActionState, useState } from "react";
import { updateMyThemeAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";
import { themesByGroup, type Theme } from "@/lib/themes";
import { cx } from "@/lib/utils";

/**
 * Rejilla con un tema por juego. Al elegir uno se pinta al momento en toda la
 * página (cambiando las variables del <html>), y al guardar queda para siempre.
 */
export function ThemePicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [state, formAction] = useActionState<FormState, FormData>(
    updateMyThemeAction,
    null,
  );

  function preview(theme: Theme) {
    setSelected(theme.id);
    const root = document.documentElement;
    for (const [name, value] of Object.entries(theme.vars)) {
      root.style.setProperty(name, value);
    }
    root.dataset.theme = theme.id;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="theme" value={selected} />

      <div className="space-y-4">
        {themesByGroup().map(([group, themes]) => (
          <div key={group}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              {group}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                  <span
                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/20"
                    style={{
                      background: `linear-gradient(135deg, ${theme.swatch}, ${
                        theme.swatchTo ?? theme.vars["--color-ink-850"]
                      })`,
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        El tema es tuyo: cada jugador puede tener el suyo sin cambiárselo a los
        demás.
      </p>

      <FormMessage state={state} />
      <SubmitButton>Guardar tema</SubmitButton>
    </form>
  );
}
