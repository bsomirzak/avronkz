import { SITE } from "./site";
import type { Product } from "./products";

export const absoluteUrl = (path = "/") =>
  new URL(path, SITE.url).toString();

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/icon.svg"),
    description: SITE.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressCountry: "KZ",
    },
    telephone: SITE.phone,
    email: SITE.email,
    sameAs: [SITE.social.instagram, SITE.social.kaspi],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "ru-KZ",
    publisher: { "@id": absoluteUrl("/#organization") },
  };
}

export function productJsonLd(p: Product) {
  const url = absoluteUrl(`/products/${p.id}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url,
    name: p.name,
    description: p.desc,
    sku: p.shortName,
    brand: { "@type": "Brand", name: SITE.name },
    category: p.cat,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating.toFixed(1),
      reviewCount: p.reviews,
      bestRating: 5,
      worstRating: 1,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "KZT",
      price: p.price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": absoluteUrl("/#organization") },
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
