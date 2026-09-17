"use client";

import Link from "next/link";
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

  /**
   * Un botón que solo es un símbolo —la ✕ de borrar, sin ir más lejos— no dice
   * nada: al pasar el ratón no sale nada y un lector de pantalla lee "equis".
   * Como la pregunta de confirmación ya explica qué va a pasar, se usa **ella**
   * de etiqueta en vez de obligar a escribirla dos veces en cada sitio.
   *
   * Solo cuando hace falta: si el botón lleva texto de verdad, ese texto manda.
   */
  const soloUnSimbolo =
    typeof children === "string" && !/[a-záéíóúñ]/i.test(children);
  const etiqueta = title ?? (soloUnSimbolo ? message : undefined);

  return (
    <button
      type="submit"
      title={etiqueta}
      aria-label={etiqueta}
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
  participantId,
}: {
  name: string;
  color: string;
  size?: number;
  /** Foto de perfil. Si falta, se pinta la inicial sobre el color del jugador. */
  image?: string | null;
  /**
   * Si se pasa, la foto lleva a la página de ese jugador. No se pone cuando el
   * avatar ya va dentro de algo pinchable: un enlace dentro de un botón no es
   * HTML válido y el navegador hace cosas raras.
   */
  participantId?: string;
}) {
  const contenido = image ? (
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
  ) : (
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

  if (!participantId) return contenido;

  return (
    <Link
      href={`/jugador/${participantId}`}
      title={`Ver el perfil de ${name}`}
      className="inline-flex shrink-0 rounded-full transition hover:brightness-125 hover:ring-2 hover:ring-white/30"
    >
      {contenido}
    </Link>
  );
}

/**
 * La foto y el nombre de un jugador, llevando **las dos cosas** a su ficha.
 *
 * Existe porque el enlace era solo la foto: un círculo de 20 píxeles al que hay
 * que apuntar con el dedo, con el nombre justo al lado sin hacer nada. Ahora se
 * toca donde parece que hay que tocar.
 *
 * Lo que va dentro **no puede llevar otro enlace ni un botón**: un `<a>` dentro
 * de otro no es HTML válido y el navegador hace cosas raras. Por eso el avatar
 * de dentro va sin `participantId`, que si no pondría el suyo.
 */
export function EnlaceDeJugador({
  participantId,
  name,
  className,
  children,
}: {
  participantId: string;
  /** Solo para el rótulo al pasar el ratón */
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/jugador/${participantId}`}
      title={`Ver el perfil de ${name}`}
      className={cx(
        "flex min-w-0 items-center transition hover:brightness-125",
        className,
      )}
    >
      {children}
    </Link>
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
