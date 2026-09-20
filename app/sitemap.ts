import type { MetadataRoute } from "next";
import { PRODUCTS, CATEGORIES, categoryHref } from "@/lib/products";
import { ARTICLES } from "@/lib/articles";
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

  const contacts = {
    url: `${base}/contacts`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  };

  const reviews = {
    url: `${base}/reviews`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  const returns = {
    url: `${base}/vozvrat`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  };

  const delivery = {
    url: `${base}/dostavka`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  };

  const articles = [
    {
      url: `${base}/stati`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    ...ARTICLES.map((a) => ({
      url: `${base}/stati/${a.slug}`,
      lastModified: new Date(a.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  const cats = CATEGORIES.filter((c) => c.key !== "all").map((c) => ({
    url: `${base}${categoryHref(c.key)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const products = PRODUCTS.map((p) => ({
    url: `${base}/products/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    images: (p.images ?? []).slice(0, 5).map((src) => `${base}${src}`),
  }));

  return [home, contacts, reviews, delivery, returns, ...articles, ...cats, ...products];
}
