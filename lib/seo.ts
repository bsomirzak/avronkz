import { SITE } from "./site";
import type { Product } from "./products";

export const absoluteUrl = (path = "/") =>
  new URL(path, SITE.url).toString();

const ALL_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    // Store is a LocalBusiness subtype — gives Google the signals it needs to
    // surface AVRON for local "магазин техники в Алматы"-style searches.
    "@type": "Store",
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/products/logo/logo.png"),
    image: absoluteUrl("/products/logo/logo.png"),
    description: SITE.description,
    telephone: SITE.phone,
    email: SITE.email,
    priceRange: "₸₸",
    currenciesAccepted: "KZT",
    paymentAccepted: "Kaspi, Наличные, Рассрочка 0-0-12",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postal,
      addressCountry: "KZ",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.lat,
      longitude: SITE.geo.lon,
    },
    hasMap: SITE.address.mapUrl,
    areaServed: [
      { "@type": "City", name: SITE.city },
      { "@type": "Country", name: "Казахстан" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ALL_WEEK,
        opens: SITE.opensAt,
        closes: SITE.closesAt,
      },
    ],
    sameAs: [
      SITE.social.instagram,
      SITE.social.tiktok,
      SITE.social.telegram,
      SITE.social.whatsapp,
      SITE.social.kaspi,
    ],
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
  const images = (p.images ?? []).map((src) => absoluteUrl(src));
  // Static prices, but Google wants a validity date or it warns in Search Console.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url,
    name: p.name,
    description: p.desc,
    // image is REQUIRED for Google product rich results / image search.
    ...(images.length ? { image: images } : {}),
    sku: p.shortName,
    mpn: p.shortName,
    brand: { "@type": "Brand", name: SITE.name },
    category: p.cat,
    ...(p.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating.toFixed(1),
            reviewCount: p.reviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      ...(p.price !== null
        ? {
            priceCurrency: "KZT",
            price: p.price,
            priceValidUntil,
          }
        : {}),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": absoluteUrl("/#organization") },
      // Shipping + return policy unlock Google "merchant listing" rich results
      // and silence the related Search Console warnings.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 0,
          currency: "KZT",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "KZ",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "KZ",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };
}

// ItemList for the homepage — helps search engines discover every product URL
// and understand the catalog as a structured collection.
export function catalogJsonLd(products: ReadonlyArray<Product>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": absoluteUrl("/#catalog"),
    name: `Каталог ${SITE.name}`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/products/${p.id}`),
      name: p.name,
    })),
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
