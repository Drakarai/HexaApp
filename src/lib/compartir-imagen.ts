/**
 * Mandar una imagen hecha en el servidor (el resumen del locke, la tarjeta de
 * un pokémon). En el móvil abre el menú de compartir del sistema, que es el que
 * lleva al grupo de WhatsApp; donde no lo hay —casi todos los ordenadores—, se
 * descarga y ya se pega a mano.
 *
 * Devuelve null si ha ido bien (o si se cerró el menú sin elegir nada, que no
 * es un error) y el motivo si no.
 */
export async function compartirImagen(
  url: string,
  fichero: string,
  titulo: string,
  que: "compartir" | "descargar",
): Promise<string | null> {
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return "No se ha podido hacer la imagen.";
    const imagen = new File([await respuesta.blob()], fichero, { type: "image/png" });
    if (que === "compartir" && navigator.canShare?.({ files: [imagen] })) {
      await navigator.share({ files: [imagen], title: titulo });
    } else {
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(imagen);
      enlace.download = fichero;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
    }
    return null;
  } catch (fallo) {
    if ((fallo as Error).name === "AbortError") return null;
    return (fallo as Error).message || "No se ha podido compartir.";
  }
}
