import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dondoquinha Gestão",
    short_name: "Dondoquinha",
    description: "Sistema de gestão comercial e financeira - Dondoquinha Moda e Beleza",
    start_url: "/login?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf6f0",
    theme_color: "#7f1d1d",
    lang: "pt-BR",
    categories: ["business", "finance"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "768x768",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
