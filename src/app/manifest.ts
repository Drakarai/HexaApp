import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HexaApp — gestor de lockes",
    short_name: "HexaApp",
    description:
      "Reglas, level caps, cementerio, notas privadas, ruleta y puntuación de tu locke competitivo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // El fondo del aspecto de ahora, no el azul marino del clásico
    background_color: "#0b0b0e",
    theme_color: "#0b0b0e",
    lang: "es",
    categories: ["games", "sports", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Cementerio", url: "/muertes" },
      { name: "Puntos", url: "/puntos" },
      { name: "Ruleta", url: "/ruleta" },
    ],
  };
}
