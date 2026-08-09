import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HexaApp — gestor de lockes competitivos",
  description:
    "Reglas, level caps, muertes, notas privadas, ruleta y puntuación para competiciones tipo Hexalocke.",
};

export const viewport: Viewport = {
  themeColor: "#070a13",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
