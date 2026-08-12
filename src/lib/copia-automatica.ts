import "server-only";
import { after } from "next/server";
import {
  crearCopia,
  horasDesdeLaUltimaCopia,
  HORAS_ENTRE_COPIAS,
} from "@/lib/copias";

/**
 * La copia del día, sin tareas programadas ni configuración.
 *
 * Se mira al cargar el resumen —la página por la que pasa todo el mundo— y, si
 * la última copia tiene más de un día, se hace otra. Con `after()` el trabajo
 * ocurre **después de mandar la página**, así que nadie espera por ello.
 *
 * Se descartó una tarea programada de Vercel porque obliga a configurar a mano
 * una variable de entorno (`CRON_SECRET`) para que el enlace no quede abierto a
 * cualquiera, y este proyecto va de no depender de la terminal. Y si nadie abre
 * la aplicación en una semana, tampoco hay nada nuevo que copiar.
 */
export function copiarSiTocaDeFondo() {
  after(async () => {
    try {
      const horas = await horasDesdeLaUltimaCopia();
      if (horas !== null && horas < HORAS_ENTRE_COPIAS) return;
      await crearCopia("auto");
    } catch (error) {
      // Que falle la copia no puede tumbar la página de nadie
      console.error("No se ha podido hacer la copia automática:", error);
    }
  });
}
