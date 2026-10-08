import { unstable_rethrow } from "next/navigation";

/**
 * Para las acciones de formulario: si la comprobación de permiso falla
 * (`requireCreador`, `requireCompetitionManager`…), el motivo sale **en el
 * formulario** en vez de tirar la pantalla entera de error, que es lo que
 * pasaba con un error lanzado dentro de la acción. Le pasaba, por ejemplo, a
 * quien tenía un formulario abierto cuando le quitaban el permiso o se
 * archivaba la edición.
 *
 * Las redirecciones de Next (mandar a entrar) siguen su camino.
 *
 *   const [admin, sinPermiso] = await conPermiso(requireCreador());
 *   if (sinPermiso) return sinPermiso;
 */
export async function conPermiso<T>(
  comprobacion: Promise<T>,
): Promise<readonly [T, null] | readonly [null, { error: string }]> {
  try {
    return [await comprobacion, null] as const;
  } catch (error) {
    unstable_rethrow(error);
    return [null, { error: (error as Error).message }] as const;
  }
}
