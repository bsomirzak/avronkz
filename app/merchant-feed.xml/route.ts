/**
 * Фид товаров для Google Merchant Center (бесплатные товарные объявления и
 * Shopping). Merchant Center сам забирает его по расписанию: в разделе
 * «Источники данных» добавляется URL https://avron.kz/merchant-feed.xml.
 *
 * Формат — RSS 2.0 со схемой g:, см. «Спецификация данных о товарах»
 * в справке Merchant Center. Цены берём из того же каталога, что и сайт,
 * с правками из /admin: цена в фиде обязана совпадать с ценой на странице,
 * иначе Google отклонит товар.
 */

import { getCatalog } from "@/lib/prices";
import type { Product } from "@/lib/products";
import { SITE } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

/** Спецсимволы XML. Названия товаров содержат кавычки и «&» не бывает лишним. */
function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const money = (n: number) => `${n.toFixed(2)} KZT`;

function item(p: Product & { price: number }): string {
  const images = (p.images ?? []).map((src) => absoluteUrl(src));
  const description = [p.desc, ...(p.details ?? [])].join(" ").slice(0, 5000);
  // Скидка: Google хочет обычную цену в g:price и акционную в g:sale_price —
  // так же, как на странице показаны зачёркнутая и текущая цены.
  const onSale = p.oldPrice !== null && p.oldPrice > p.price;

  const fields: Array<[string, string]> = [
    ["g:id", p.id],
    ["g:title", (p.seoTitle ?? p.name).slice(0, 150)],
    ["g:description", description],
    ["g:link", absoluteUrl(`/products/${p.id}`)],
    ...(images[0] ? [["g:image_link", images[0]] as [string, string]] : []),
    ...images.slice(1, 11).map((src) => ["g:additional_image_link", src] as [string, string]),
    ["g:availability", "in_stock"],
    ["g:condition", "new"],
    ["g:price", money(onSale ? p.oldPrice! : p.price)],
    ...(onSale ? [["g:sale_price", money(p.price)] as [string, string]] : []),
    ["g:brand", SITE.name],
    // У товаров нет GTIN (штрихкода производителя) — честно говорим об этом,
    // иначе Merchant Center требует его и ограничивает показы.
    ["g:identifier_exists", "no"],
    ["g:product_type", p.cat],
  ];

  const body = fields.map(([tag, value]) => `      <${tag}>${xml(value)}</${tag}>`).join("\n");
  return `    <item>\n${body}\n    </item>`;
}

export async function GET() {
  const catalog = await getCatalog();
  // Без цены товар в Merchant Center не примут — такие («цена по запросу») пропускаем.
  const priced = catalog.filter((p): p is Product & { price: number } => p.price !== null);

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(SITE.name)}</title>
    <link>${xml(SITE.url)}</link>
    <description>${xml(SITE.description)}</description>
${priced.map(item).join("\n")}
  </channel>
</rss>
`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Google забирает фид раз в сутки; час кэша на CDN не даст цене из /admin
      // надолго разойтись с сайтом.
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
