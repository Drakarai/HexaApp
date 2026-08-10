import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { getCurrentUser } from "@/lib/auth";
import { getTheme } from "@/lib/themes";
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
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070a13",
  width: "device-width",
  initialScale: 1,
  // Deja que el contenido llegue hasta los bordes en móviles con notch
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El tema es de cada usuario, así que se aplica en el servidor y llega ya
  // pintado: nada de cambio de color a mitad de carga.
  const user = await getCurrentUser();
  const theme = getTheme(user?.theme);

  return (
    <html
      lang="es"
      data-theme={theme.id}
      style={theme.vars as React.CSSProperties}
    >
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
