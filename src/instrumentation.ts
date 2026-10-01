/**
 * Lo que Next llama cuando **algo falla en el servidor**: al pintar una
 * pantalla, en una acción o en una ruta de /api. Se apunta en el registro de
 * errores (ver lib/errores.ts) con quién estaba y dónde, para verlo en
 * Diagnóstico sin que nadie tenga que avisar. Lo que cuenta la pantalla de
 * error como «Código del fallo» es el `digest`, que se guarda también.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
) {
  // La base de datos solo se puede tocar desde Node, no desde el proxy
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const e = error as Error & { digest?: string };
  const { apuntarError } = await import("@/lib/errores");
  const { COOKIE_DE_SESION, leerSesion } = await import("@/lib/sesion-token");

  const cookies = String(request.headers.cookie ?? "");
  const token = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_DE_SESION}=([^;]+)`))?.[1];
  const sesion = token ? await leerSesion(decodeURIComponent(token)) : null;

  await apuntarError({
    origen: "servidor",
    mensaje: e?.message || String(error),
    detalle: e?.stack ?? null,
    codigo: e?.digest ?? null,
    ruta: `${request.method} ${request.path}`,
    userId: sesion?.sesion.userId ?? null,
    navegador: String(request.headers["user-agent"] ?? "") || null,
  });
}
