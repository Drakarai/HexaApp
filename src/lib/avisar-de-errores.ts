/**
 * Mandar al registro de errores lo que falla **en el navegador** (ver
 * `/api/errores`). Con freno: como mucho unos pocos por visita y cada uno una
 * vez, que un fallo dentro de un bucle no puede convertirse en mil avisos. Sin
 * cobertura no se manda nada: lo que falla sin línea es lo esperable.
 */

const MAXIMO_POR_VISITA = 8;
const mandados = new Set<string>();

export function avisarDeUnError(mensaje: string, detalle?: string | null) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const clave = `${mensaje}|${(detalle ?? "").slice(0, 200)}`;
  if (mandados.has(clave) || mandados.size >= MAXIMO_POR_VISITA) return;
  mandados.add(clave);
  try {
    void fetch("/api/errores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje: mensaje.slice(0, 500),
        detalle: detalle?.slice(0, 4000) ?? null,
        ruta: location.pathname + location.search,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Avisar de un fallo no puede provocar otro
  }
}
