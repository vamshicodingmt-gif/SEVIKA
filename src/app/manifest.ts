import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sevika — Beauty & Grooming Marketplace",
    short_name: "Sevika",
    description:
      "Sevika connects customers with beauty and grooming professionals. 0% commission.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf5f6",
    theme_color: "#e11d48",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
