import { cx } from "@/lib/utils";

export type TituloPuesto = {
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
};

/**
 * El título que alguien lleva puesto, en pequeño, debajo de su nombre. Toma
 * prestado el color del propio título para el borde y la letra.
 */
export function TitleBadge({
  titulo,
  size = "md",
  wrap = false,
}: {
  titulo: TituloPuesto | null;
  size?: "sm" | "md";
  /**
   * Deja que el nombre baje de línea en vez de cortarse. Con más de una línea
   * la chapa deja de ser un óvalo y pasa a esquina redondeada, que es como no
   * parece una pastilla rota. Caben tres líneas: con el tope de 60 caracteres
   * de un título, eso llega hasta en la pantalla más estrecha.
   */
  wrap?: boolean;
}) {
  if (!titulo) return null;

  return (
    <span
      title={titulo.description ?? titulo.name}
      className={cx(
        "inline-flex max-w-full gap-1 border font-semibold",
        wrap ? "items-start rounded-lg" : "items-center rounded-full",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
      style={{
        // El color del título, muy rebajado de fondo para que se lea la letra
        borderColor: `${titulo.color}55`,
        backgroundColor: `${titulo.color}1a`,
        color: titulo.color,
      }}
    >
      {titulo.icon ? (
        <span aria-hidden className="shrink-0">
          {titulo.icon}
        </span>
      ) : null}
      <span className={wrap ? "line-clamp-3 text-left" : "truncate"}>
        {titulo.name}
      </span>
    </span>
  );
}
