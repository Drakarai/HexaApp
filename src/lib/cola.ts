"use client";

/**
 * La cola de apuntes pendientes de subir.
 *
 * Cuando no hay línea, lo que escribes **no se pierde ni se inventa**: se
 * guarda aquí, en el propio móvil, y se sube en cuanto vuelve la conexión. La
 * pantalla nunca dice "guardado" a secas mientras algo esté aquí dentro: dice
 * "pendiente de subir", que es la verdad.
 *
 * Va en `localStorage` y no en una base de datos del navegador porque un
 * apunte son cuatro campos de texto —las imágenes las baja el servidor al
 * aplicarlo, no viajan— y así el código cabe en una pantalla. Si algún día se
 * encolan fotos, esto habría que mudarlo a IndexedDB.
 */

const LLAVE = "hexaapp.cola";
/** Para que los demás componentes se enteren sin recargar nada */
const EVENTO = "hexaapp:cola";

export type TipoDeApunte =
  | "captura"
  | "baja"
  | "gimnasio"
  | "nota"
  // Los del Equipo y PC: apuntar, mover, evolucionar y dar por muerto
  | "caja"
  | "movimiento"
  | "evolucion"
  | "caida";

export type Apunte = {
  /** Lo genera el móvil y es lo que evita que se suba dos veces */
  id: string;
  tipo: TipoDeApunte;
  /** Los campos del formulario, ya planos */
  datos: Record<string, string>;
  /** Cómo se lee en la lista de pendientes: "Sentret en Ruta 29" */
  resumen: string;
  creadoEn: number;
  /** Lo que dijo el servidor la última vez que se intentó, si falló */
  error?: string;
};

export const TIPOS: Record<TipoDeApunte, { nombre: string; icono: string }> = {
  captura: { nombre: "Captura", icono: "🗺️" },
  baja: { nombre: "Baja", icono: "💀" },
  gimnasio: { nombre: "Gimnasio", icono: "🎯" },
  nota: { nombre: "Nota", icono: "🗒️" },
  caja: { nombre: "Captura", icono: "📦" },
  movimiento: { nombre: "Movimiento", icono: "🔁" },
  evolucion: { nombre: "Evolución", icono: "🧬" },
  caida: { nombre: "Baja", icono: "💀" },
};

function hayNavegador() {
  return typeof window !== "undefined";
}

export function leerCola(): Apunte[] {
  if (!hayNavegador()) return [];
  try {
    const crudo = window.localStorage.getItem(LLAVE);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    // Un localStorage corrupto o bloqueado no puede tumbar la aplicación
    return [];
  }
}

function guardarCola(lista: Apunte[]) {
  if (!hayNavegador()) return;
  try {
    window.localStorage.setItem(LLAVE, JSON.stringify(lista));
  } catch {
    // Sin sitio: no hay nada que hacer, pero que no reviente la pantalla
  }
  window.dispatchEvent(new CustomEvent(EVENTO));
}

/** Mete un apunte al final de la cola. El orden se respeta al subir. */
export function encolar(
  tipo: TipoDeApunte,
  datos: Record<string, string>,
  resumen: string,
): Apunte {
  const apunte: Apunte = {
    id: nuevoId(),
    tipo,
    datos,
    resumen,
    creadoEn: Date.now(),
  };
  guardarCola([...leerCola(), apunte]);
  return apunte;
}

export function quitarDeLaCola(id: string) {
  guardarCola(leerCola().filter((apunte) => apunte.id !== id));
}

export function apuntarError(id: string, error: string) {
  guardarCola(
    leerCola().map((apunte) => (apunte.id === id ? { ...apunte, error } : apunte)),
  );
}

/** Avisa cada vez que la cola cambia, en esta pestaña y en las demás. */
export function alCambiarLaCola(hacer: () => void) {
  if (!hayNavegador()) return () => {};
  const enOtraPestana = (evento: StorageEvent) => {
    if (evento.key === LLAVE) hacer();
  };
  window.addEventListener(EVENTO, hacer);
  window.addEventListener("storage", enOtraPestana);
  return () => {
    window.removeEventListener(EVENTO, hacer);
    window.removeEventListener("storage", enOtraPestana);
  };
}

/** Un formulario entero como texto plano, listo para guardar en la cola. */
export function datosDelFormulario(formData: FormData): Record<string, string> {
  const datos: Record<string, string> = {};
  for (const [campo, valor] of formData.entries()) {
    if (typeof valor === "string") datos[campo] = valor;
  }
  return datos;
}

function nuevoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Navegadores viejos: vale cualquier cosa que no se repita
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type ResultadoDeSubida = {
  subidos: number;
  fallidos: number;
};

/**
 * Sube todo lo que haya, en orden, y va vaciando lo que el servidor da por
 * bueno. Lo que falle por un motivo del servidor —"esa zona ya no existe"— se
 * queda en la cola con su explicación, para poder verlo y quitarlo a mano; si
 * lo que falla es la conexión, se deja tal cual y se reintentará luego.
 */
export async function subirLaCola(): Promise<ResultadoDeSubida> {
  const pendientes = leerCola();
  if (!pendientes.length) return { subidos: 0, fallidos: 0 };

  let respuesta: Response;
  try {
    respuesta = await fetch("/api/sincronizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apuntes: pendientes }),
    });
  } catch {
    return { subidos: 0, fallidos: 0 };
  }
  if (!respuesta.ok) return { subidos: 0, fallidos: 0 };

  const { resultados } = (await respuesta.json()) as {
    resultados: { id: string; estado: "hecho" | "repetido" | "error"; mensaje?: string }[];
  };

  let subidos = 0;
  let fallidos = 0;
  for (const resultado of resultados) {
    if (resultado.estado === "error") {
      fallidos++;
      apuntarError(resultado.id, resultado.mensaje ?? "No se pudo subir.");
    } else {
      subidos++;
      quitarDeLaCola(resultado.id);
    }
  }
  return { subidos, fallidos };
}
