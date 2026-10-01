import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { getCurrentUser } from "@/lib/auth";
import { colorDeBarra, getTheme } from "@/lib/themes";
import { TemaEnElSistema } from "@/components/tema-en-el-sistema";
import { CazadorDeErrores } from "@/components/cazador-de-errores";
import { getEstilo } from "@/lib/estilo";
// Las letras del aspecto nuevo. Solo se descargan si se usan: un @font-face
// que no pide ningún texto no baja nada, así que al clásico no le cuestan.
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "HexaApp",
  title: {
    default: "HexaApp — gestor de lockes competitivos",
    template: "%s — HexaApp",
  },
  description:
    "Reglas, level caps, cementerio, notas privadas, ruleta y puntuación para competiciones tipo Hexalocke.",
  appleWebApp: {
    capable: true,
    title: "HexaApp",
    statusBarStyle: "black-translucent",
  },
  // Los iconos no van aquí: son archivos de `src/app` (icon.svg, favicon.ico,
  // apple-icon.png), que Next enlaza solo. Poner `icons` aquí anulaba el SVG y
  // la pestaña se quedaba con el .ico. Los genera scripts/iconos.ts.
  formatDetection: { telephone: false },
};

/**
 * La barra del sistema del móvil lleva **el color de tu tema**: llega ya en el
 * HTML, así que al abrir la app no se ve primero negra y luego de color.
 */
export async function generateViewport(): Promise<Viewport> {
  const user = await getCurrentUser();
  return {
    themeColor: colorDeBarra(getTheme(user?.theme)),
    width: "device-width",
    initialScale: 1,
    // Deja que el contenido llegue hasta los bordes en móviles con notch
    viewportFit: "cover",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El tema es de cada usuario, así que se aplica en el servidor y llega ya
  // pintado: nada de cambio de color a mitad de carga.
  const [user, estilo] = await Promise.all([getCurrentUser(), getEstilo()]);
  const theme = getTheme(user?.theme);

  return (
    <html
      lang="es"
      data-theme={theme.id}
      data-estilo={estilo}
      style={theme.vars as React.CSSProperties}
    >
      <body className="font-sans antialiased">
        {/* La franja de luz de arriba, del color del tema: en el iPhone rellena
            el hueco de la cámara, que si no se quedaba en negro */}
        <div aria-hidden className="franja-del-tema" />
        {children}
        <ServiceWorkerRegistration />
        <TemaEnElSistema tema={theme.id} />
        {user ? <CazadorDeErrores /> : null}
      </body>
    </html>
  );
}
