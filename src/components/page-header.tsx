import { cx } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  fondo,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /**
   * Una imagen de fondo junto al título: el logo de la edición en el resumen.
   * Sin ella, la cabecera es la de siempre.
   */
  fondo?: string | null;
}) {
  return (
    <header
      className={cx(
        "mb-6 flex flex-wrap justify-between gap-3",
        // Con logo, la cabecera guarda sitio para que se vea entero aunque el
        // título sea corto, y el título se centra en ese alto
        fondo ? "relative isolate min-h-28 items-center sm:min-h-32" : "items-end",
      )}
    >
      {fondo ? (
        <span
          aria-hidden
          className={cx(
            // En el móvil va el de dentro del texto (abajo): aquí debajo se
            // tapaban títulos y subtítulos largos
            "pointer-events-none absolute -top-4 right-0 -z-10 hidden h-[calc(100%+2rem)] w-3/5 max-w-sm sm:block",
            "bg-contain bg-right bg-no-repeat opacity-45",
            // Se funde hacia la izquierda: el título pasa por encima y tiene
            // que seguir leyéndose
            "[mask-image:linear-gradient(to_left,black_55%,transparent)]",
          )}
          style={{ backgroundImage: `url("${fondo}")` }}
        />
      ) : null}
      <div className={cx(fondo && "w-full flow-root sm:w-auto")}>
        {fondo ? (
          /* En el móvil el logo flota a la derecha y el texto salta de línea
             antes de llegar a él, midiendo lo que ocupa el dibujo de verdad
             (los hay altos y anchos). Solo puede meterse en su borde
             izquierdo, que es casi transparente */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fondo}
            alt=""
            aria-hidden
            className={cx(
              "pointer-events-none float-right -my-4 ml-2 h-36 max-w-[60%] object-contain object-right opacity-45 sm:hidden",
              "[mask-image:linear-gradient(to_left,black_55%,transparent)] [shape-outside:inset(0_0_0_15%)]",
            )}
          />
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>
        ) : null}
        {/* Con logo, lo de la derecha baja debajo del título: a la derecha se
            montaría encima de la imagen */}
        {fondo && actions ? <div className="mt-3 flex gap-2">{actions}</div> : null}
      </div>
      {!fondo && actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  );
}
