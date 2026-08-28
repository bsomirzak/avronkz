import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    // /orders — внутренний раздел с контактами покупателей, из индекса исключён.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/orders", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
