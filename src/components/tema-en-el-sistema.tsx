"use client";

import { useEffect } from "react";
import { EVENTO_DE_TEMA, colorDeBarra, getTheme, iconoDelTema } from "@/lib/themes";

/**
 * Lleva el tema **fuera de la página**: la barra del sistema del móvil (y la
 * del navegador) y el icono de la pestaña, que es la media ball pintada con
 * tus colores. El color de la barra llega ya del servidor (`generateViewport`);
 * esto lo mantiene al día cuando se prueba otro tema en Mi perfil, sin
 * recargar, y pinta el icono, que no se puede hacer desde el servidor sin un
 * fichero por tema.
 */
export function TemaEnElSistema({ tema }: { tema: string }) {
  useEffect(() => {
    function aplicar(id: string) {
      const theme = getTheme(id);
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.content = colorDeBarra(theme);
      }
      let icono = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
      if (!icono) {
        icono = document.createElement("link");
        icono.rel = "icon";
        icono.type = "image/svg+xml";
        document.head.appendChild(icono);
      }
      icono.href = iconoDelTema(theme);
    }
    aplicar(tema);
    const alProbar = (evento: Event) => aplicar((evento as CustomEvent<string>).detail);
    window.addEventListener(EVENTO_DE_TEMA, alProbar);
    return () => window.removeEventListener(EVENTO_DE_TEMA, alProbar);
  }, [tema]);

  return null;
}
