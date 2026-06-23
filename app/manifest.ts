import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Makes SaveBack installable and full-screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SaveBack · save for save",
    short_name: "SaveBack",
    description:
      "Grow your WhatsApp reach. Save for save with real people. Your number stays hidden until you both save.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#e9efe7",
    theme_color: "#ffffff",
    categories: ["social", "business", "networking"],
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
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
