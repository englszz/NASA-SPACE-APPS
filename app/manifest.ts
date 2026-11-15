import type { MetadataRoute } from "next";

// Para «Agregar a pantalla de inicio» en Android e iPhone
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Conuco",
    short_name: "The Conuco",
    description: "Datos de la NASA para decidir qué sembrar, cuándo y dónde en el Cibao.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6e6",
    theme_color: "#1d4a19",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
