import type { FondoDeCaja } from "@/lib/fondos-de-caja";
import { cx } from "@/lib/utils";

/**
 * El fondo de una caja del PC (ver `lib/fondos-de-caja.ts`): la imagen de los
 * juegos, estirada a la caja entera. Todas miden casi lo mismo (unos 4:3, lo
 * que medía la caja en la GBA y la DS) y la caja tiene esa forma, así que
 * estirarlas no las deforma a la vista.
 */
export function FondoDeCajaImagen({
  fondo,
  className,
}: {
  fondo: FondoDeCaja;
  className?: string;
}) {
  if (fondo === "liso") return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/cajas/${fondo}.png`}
      alt=""
      draggable={false}
      className={cx("pointer-events-none absolute inset-0 h-full w-full select-none", className)}
    />
  );
}

/** La forma de la caja: la de las imágenes, 162×122 en los juegos */
export const FORMA_DE_LA_CAJA = "aspect-[162/122]";
