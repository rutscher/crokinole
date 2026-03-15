import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crokinole Scorekeeper",
    short_name: "Crokinole",
    description: "Keep score for your crokinole games",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1f1b17",
    theme_color: "#1f1b17",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
