/**
 * Фид объявлений для OLX — «Автозагрузка» в бизнес-аккаунте.
 *
 * ВАЖНО, пока фид не заработал: OLX принимает только свои числовые id
 * категорий, одинаковых названий с нашим каталогом у него нет. Их берут
 * в кабинете OLX (Автозагрузка → справочник категорий) и проставляют
 * в OLX_CATEGORY ниже. Товар без сопоставленной категории в выгрузку
 * НЕ попадает: пустая позиция всё равно была бы отклонена при импорте,
 * а так сразу видно, чего не хватает.
 *
 * Схему полей перед первым импортом стоит сверить со спецификацией
 * автозагрузки в самом кабинете — она у OLX различается по странам,
 * и в Казахстане набор обязательных полей может отличаться.
 */

import { PRODUCTS } from "@/lib/products";
import { SITE } from "@/lib/site";
import {
  plainDescription,
  pricedCatalog,
  productImages,
  xml,
  xmlResponse,
  type PricedProduct,
} from "@/lib/feed";

/** Описание объявления на OLX — до 9000 символов. */
const DESCRIPTION_LIMIT = 9000;
/** Больше восьми фотографий в одно объявление OLX не берёт. */
const MAX_IMAGES = 8;

/**
 * Наши категории → id категорий OLX. Заполняется из кабинета OLX.
 * null — категория ещё не сопоставлена, товары из неё не выгружаются.
 */
const OLX_CATEGORY: Record<string, number | null> = Object.fromEntries(
  [...new Set(PRODUCTS.map((p) => p.catKey))].map((key) => [key, null]),
);

function advert(p: PricedProduct): string {
  const category = OLX_CATEGORY[p.catKey];
  if (category === null || category === undefined) return "";

  const images = productImages(p)
    .slice(0, MAX_IMAGES)
    .map((src) => `          <image url="${xml(src)}"/>`)
    .join("\n");

  return `    <advert>
      <id>${xml(p.id)}</id>
      <title>${xml(p.seoTitle ?? p.name)}</title>
      <description>${xml(plainDescription(p, DESCRIPTION_LIMIT))}</description>
      <category>${category}</category>
      <price>${Math.round(p.price)}</price>
      <currency>KZT</currency>
      <type>sell</type>
      <state>new</state>
      <city>${xml(SITE.city)}</city>
      <person>${xml(SITE.name)}</person>
      <phone>${xml(SITE.phoneRaw)}</phone>
      <images>
${images}
      </images>
    </advert>`;
}

export async function GET() {
  const priced = await pricedCatalog();
  const adverts = priced.map(advert).filter(Boolean);

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<olx>
  <adverts>
${adverts.join("\n")}
  </adverts>
</olx>
`;

  return xmlResponse(feed);
}
