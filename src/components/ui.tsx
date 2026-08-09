"use client";

import { useFormStatus } from "react-dom";
import { cx, initials, readableTextColor } from "@/lib/utils";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? "Guardando…") : children}
    </button>
  );
}

export function FormMessage({
  state,
}: {
  state?: { error?: string; success?: string } | null;
}) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      className={cx(
        "rounded-lg border px-3 py-2 text-sm",
        state.error
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      )}
    >
      {state.error ?? state.success}
    </p>
  );
}

/** Botón de envío que pide confirmación antes de enviar el formulario. */
export function ConfirmSubmit({
  children,
  message,
  className = "btn-danger btn-sm",
  title,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function Avatar({
  name,
  color,
  size = 36,
  image,
}: {
  name: string;
  color: string;
  size?: number;
  /** Foto de perfil. Si falta, se pinta la inicial sobre el color del jugador. */
  image?: string | null;
}) {
  if (image) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15"
        style={{ width: size, height: size, background: color }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        width: size,
        height: size,
        background: color,
        color: readableTextColor(color),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** <details> con estilo de tarjeta, para formularios que ocupan mucho. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="card group" open={defaultOpen}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 marker:hidden">
        <span className="mr-2 inline-block transition group-open:rotate-90">
          ▸
        </span>
        {summary}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
