import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Web app manifest — the last place a browser (and Google's brand-icon
// crawler) looks for the AVRON logo, next to app/favicon.ico, app/icon.png
// and app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0F1B3D",
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
