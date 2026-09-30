import { cx } from "@/lib/utils";

/**
 * La chapa de un tipo, con su icono y su nombre, como en los juegos. Son
 * imágenes que pasó el grupo (`public/tipos/`): la chapa entera, de 200×44, y
 * solo el icono recortado de su izquierda, para donde el nombre no cabe (las
 * casillas de la caja).
 *
 * Van servidas como ficheros y no como datos: son 36 imágenes de unos pocos
 * kilobytes que el navegador guarda una vez y reutiliza en todas las pantallas.
 */
export function ChapaDeTipo({
  slug,
  nombre,
  forma = "chapa",
  alto = 16,
  className,
}: {
  slug: string;
  nombre: string;
  /** "chapa": icono y nombre; "icono": solo el icono, cuadrado */
  forma?: "chapa" | "icono";
  /** Alto en píxeles; el ancho sale solo, sin deformarla */
  alto?: number;
  className?: string;
}) {
  const icono = forma === "icono";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/tipos/${slug}${icono ? "-icono" : ""}.webp`}
      alt={nombre}
      title={nombre}
      height={alto}
      width={icono ? alto : Math.round((alto * 200) / 44)}
      draggable={false}
      className={cx("select-none rounded-[3px]", className)}
    />
  );
}
