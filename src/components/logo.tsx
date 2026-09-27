import { logoSvg } from "@/lib/logo";
import { cx } from "@/lib/utils";

/**
 * El logo de HexaApp dentro de la aplicación. El dibujo está en `lib/logo.ts`,
 * que es la única copia: aquí solo se mete en la página.
 *
 * `id` tiene que ser distinto en cada logo de una misma página (ver allí por
 * qué). El HTML es nuestro y fijo, sin nada que escriba nadie: por eso se puede
 * meter tal cual.
 */
export function Logo({
  id,
  tamano,
  className,
}: {
  id: string;
  tamano: number;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-flex shrink-0", className)}
      style={{ width: tamano, height: tamano }}
      dangerouslySetInnerHTML={{ __html: logoSvg(id, tamano) }}
    />
  );
}
