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

import { SITE } from "@/lib/site";
import {
  plainDescription,
  pricedCatalog,
  productImages,
  productUrl,
  xml,
  xmlResponse,
  type PricedProduct,
} from "@/lib/feed";

/** Описание товара в Merchant Center — до 5000 символов. */
const DESCRIPTION_LIMIT = 5000;

const money = (n: number) => `${n.toFixed(2)} KZT`;

function item(p: PricedProduct): string {
  const images = productImages(p);
  const description = plainDescription(p, DESCRIPTION_LIMIT);
  // Скидка: Google хочет обычную цену в g:price и акционную в g:sale_price —
  // так же, как на странице показаны зачёркнутая и текущая цены.
  const onSale = p.oldPrice !== null && p.oldPrice > p.price;

  const fields: Array<[string, string]> = [
    ["g:id", p.id],
    ["g:title", (p.seoTitle ?? p.name).slice(0, 150)],
    ["g:description", description],
    ["g:link", productUrl(p)],
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
  // Без цены товар в Merchant Center не примут — такие («цена по запросу») отсеяны.
  const priced = await pricedCatalog();

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

  return xmlResponse(feed);
}
