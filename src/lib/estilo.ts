import "server-only";
import { cookies } from "next/headers";

/**
 * El **aspecto** de la aplicación, que no es lo mismo que el tema.
 *
 * El tema (`lib/themes.ts`) es el color de cada juego. El aspecto es la forma:
 * tipografía, superficies, esquinas, iconos. Hay dos:
 *
 * - **clásico**: el de siempre, que sigue siendo el de todo el mundo.
 * - **nuevo**: uno más sobrio y deportivo, de prueba, para ver si gusta antes
 *   de cambiar nada. Vive entero en `globals.css` bajo `[data-estilo="nuevo"]`
 *   y en los iconos dobles de `components/icono.tsx`: el clásico no se ha
 *   tocado, y quitarlo es borrar ese bloque.
 *
 * Se guarda en una **cookie del dispositivo** y no en la cuenta: es para
 * probar, y así no hay que tocar la base de datos para algo que puede
 * desaparecer.
 */

export const COOKIE_DE_ESTILO = "hexaapp_estilo";
export const ESTILOS = ["clasico", "nuevo"] as const;
export type Estilo = (typeof ESTILOS)[number];

export async function getEstilo(): Promise<Estilo> {
  const valor = (await cookies()).get(COOKIE_DE_ESTILO)?.value;
  return ESTILOS.includes(valor as Estilo) ? (valor as Estilo) : "clasico";
}
