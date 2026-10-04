import { cx } from "@/lib/utils";

/**
 * La chapa de un tipo, con su icono y su nombre, como en los juegos. Son
 * imágenes que pasó el grupo (`public/tipos/`): la chapa entera, de 200×44, y
 * el icono cuadrado para donde el nombre no cabe (las casillas de la caja).
 *
 * El cuadrado es un SVG aparte (`<slug>-icono.svg`), con el símbolo centrado
 * en su fondo de color: al principio se recortaba de la izquierda de la chapa,
 * y el símbolo quedaba descentrado. Al ser vectorial, además, se ve nítido a
 * los 9 px de la caja del móvil y a los 20 de la ficha.
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
      src={icono ? `/tipos/${slug}-icono.svg` : `/tipos/${slug}.webp`}
      alt={nombre}
      title={nombre}
      height={alto}
      width={icono ? alto : Math.round((alto * 200) / 44)}
      draggable={false}
      // El SVG ya trae sus esquinas redondeadas
      className={cx("select-none", !icono && "rounded-[3px]", className)}
    />
  );
}
