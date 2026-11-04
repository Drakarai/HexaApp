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
    return [null, { error: mensajeDeError(error) }] as const;
  }
}

/**
 * El texto que se le puede enseñar al usuario de un error atrapado en una
 * acción. Los nuestros («No puedes modificar los datos de otro jugador.») van
 * tal cual, pero **los de la base de datos y los fallos de programación no**:
 * llevaban al navegador el nombre de las tablas y los campos («Invalid
 * `prisma.capture.findUnique()` invocation…»), que no le dicen nada a nadie y
 * sí le dan pistas a quien esté probando a colarse. Salió en el repaso de
 * noviembre, llamando a todas las acciones con datos falseados.
 */
export function mensajeDeError(error: unknown): string {
  const interno =
    !(error instanceof Error) ||
    error.name.startsWith("PrismaClient") ||
    error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof RangeError ||
    error instanceof SyntaxError;
  if (!interno) return error.message;
  console.error(error);
  return "Algo ha fallado por dentro. Recarga la página y vuelve a probar.";
}
