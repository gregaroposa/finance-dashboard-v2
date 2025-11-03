import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance Dashboard",
    short_name: "Finance",
    description: "A dashboard for managing finances",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    icons: [
      // PWA-recommended PNG sizes
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Keep .ico variants as additional fallbacks
      { src: "/icons/icon-32px.ico", sizes: "32x32", type: "image/x-icon", purpose: "any" },
      { src: "/icons/icon-48px.ico", sizes: "48x48", type: "image/x-icon", purpose: "any" },
      { src: "/icons/icon-64px.ico", sizes: "64x64", type: "image/x-icon", purpose: "any" },
    ],
  };
}
