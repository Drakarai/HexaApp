import "server-only";
import { cookies } from "next/headers";

/**
 * El **aspecto** de la aplicación, que no es lo mismo que el tema.
 *
 * El tema (`lib/themes.ts`) es el color de cada juego. El aspecto es la forma:
 * tipografía, superficies, esquinas, iconos. Hay dos:
 *
 * - **nuevo**: el de todo el mundo. Más sobrio y deportivo; vive en
 *   `globals.css` bajo `[data-estilo="nuevo"]` y en los iconos dobles de
 *   `components/icono.tsx`.
 * - **clásico**: el de antes, que se puede seguir eligiendo en Mi perfil.
 *
 * Se guarda en una **cookie del dispositivo** y no en la cuenta: nació como
 * prueba y así no hizo falta tocar la base de datos.
 *
 * La cookie **se llamaba `hexaapp_estilo`** mientras el nuevo era de prueba.
 * Al hacerlo el de todos se le cambió el nombre para que nadie se quedara en
 * el clásico por lo que pulsó probando: todo el mundo empieza en el nuevo.
 */

export const COOKIE_DE_ESTILO = "hexaapp_aspecto";
export const ESTILOS = ["clasico", "nuevo"] as const;
export type Estilo = (typeof ESTILOS)[number];
export const ESTILO_POR_DEFECTO: Estilo = "nuevo";

export async function getEstilo(): Promise<Estilo> {
  const valor = (await cookies()).get(COOKIE_DE_ESTILO)?.value;
  return ESTILOS.includes(valor as Estilo) ? (valor as Estilo) : ESTILO_POR_DEFECTO;
}
