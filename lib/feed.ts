/**
 * Общее для товарных фидов: /merchant-feed.xml (Google Merchant Center),
 * /yml-feed.xml (Яндекс Директ и Маркет) и /olx-feed.xml (OLX).
 *
 * Каталог и цены у всех площадок одни и те же — различается только разметка,
 * которую каждая из них ждёт. Держим общую часть здесь, чтобы правка цены
 * в /admin расходилась по всем фидам сразу и они не разъезжались между собой.
 */

import { getCatalog } from "@/lib/prices";
import type { Product } from "@/lib/products";
import { absoluteUrl } from "@/lib/seo";

/** Товар, который уже можно отдать площадке: с ценой. */
export type PricedProduct = Product & { price: number };

/** Спецсимволы XML. Названия товаров содержат кавычки, «&» тоже встречается. */
export function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Товары, которые вообще имеет смысл отдавать: без цены («цена по запросу»)
 * объявление не примет ни одна из площадок.
 */
export async function pricedCatalog(): Promise<PricedProduct[]> {
  const catalog = await getCatalog();
  return catalog.filter((p): p is PricedProduct => p.price !== null);
}

/** Описание одним куском: текст карточки плюс подробности. */
export function plainDescription(p: Product, limit: number): string {
  return [p.desc, ...(p.details ?? [])].join(" ").slice(0, limit);
}

/** Абсолютные ссылки на фотографии товара — площадки забирают их по URL. */
export function productImages(p: Product): string[] {
  return (p.images ?? []).map((src) => absoluteUrl(src));
}

/** Ссылка на карточку товара на сайте. */
export function productUrl(p: Product): string {
  return absoluteUrl(`/products/${p.id}`);
}

/** Ответ с XML: общий для всех фидов кэш и заголовки. */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Площадки забирают фид раз в сутки; час кэша на CDN не даст цене
      // из /admin надолго разойтись с сайтом.
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
