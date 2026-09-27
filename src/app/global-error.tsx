"use client";

import { Icono } from "@/components/icono";
/**
 * El último cortafuegos: si lo que falla es la propia plantilla de la página
 * (por ejemplo, leer el tema del usuario), ni siquiera hay hojas de estilo, así
 * que esta pantalla se pinta sola con los colores puestos a mano. Es la única
 * que tiene que traer su propio `<html>`.
 */
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0b0b0e",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "2.5rem", margin: 0 }}><Icono emoji="💥" /></p>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
          La aplicación no ha podido arrancar
        </h1>
        <p style={{ color: "#94a3b8", margin: 0, maxWidth: "28rem" }}>
          Vuelve a intentarlo. Si sigue igual, es cosa del servidor y no de tu
          móvil.
        </p>
        {error.digest ? (
          <p style={{ color: "#475569", fontSize: "0.75rem", margin: 0 }}>
            Código del fallo: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "0.6rem",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#e2e8f0",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
