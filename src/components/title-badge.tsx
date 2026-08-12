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
}: {
  titulo: TituloPuesto | null;
  size?: "sm" | "md";
}) {
  if (!titulo) return null;

  return (
    <span
      title={titulo.description ?? titulo.name}
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-semibold",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
      style={{
        // El color del título, muy rebajado de fondo para que se lea la letra
        borderColor: `${titulo.color}55`,
        backgroundColor: `${titulo.color}1a`,
        color: titulo.color,
      }}
    >
      {titulo.icon ? <span aria-hidden>{titulo.icon}</span> : null}
      <span className="truncate">{titulo.name}</span>
    </span>
  );
}
