import type { MetadataRoute } from "next";
import { PRODUCTS, CATEGORIES } from "@/lib/products";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE.url.replace(/\/$/, "");

  const home = {
    url: `${base}/`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 1,
  };

  const cats = CATEGORIES.filter((c) => c.key !== "all").map((c) => ({
    url: `${base}/?cat=${c.key}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const products = PRODUCTS.map((p) => ({
    url: `${base}/products/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [home, ...cats, ...products];
}
