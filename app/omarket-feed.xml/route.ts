/**
 * Прайс ИП ОМЫРЗАК для Omarket.kz в формате kaspi_catalog.
 *
 * Подключается в кабинете поставщика: Загрузка ЦП → XML → ссылка на этот
 * файл. Omarket забирает его каждый час. Артикул (sku) совпадает с артикулом
 * уже опубликованного ЦП, поэтому цена обновляется на той же карточке.
 *
 * Формат: wiki.omarket.kz → Инструкции для Поставщиков → XML.
 */

import { xml, xmlResponse } from "@/lib/feed";
import { OMARKET_STORE_ID, feedOffers } from "@/lib/omarket";

export function GET() {
  const items = feedOffers()
    .map(
      (o) => `    <offer sku="${xml(o.sku)}">
      <model>${xml(o.name)}</model>
      <availabilities>
        <availability available="yes" storeId="${OMARKET_STORE_ID}"/>
      </availabilities>
      <price>${Math.round(o.price)}</price>
    </offer>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="utf-8"?>
<kaspi_catalog xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" date="${new Date().toISOString()}">
  <company>ИП ОМЫРЗАК</company>
  <merchantid>OMYRZAK</merchantid>
  <offers>
${items}
  </offers>
</kaspi_catalog>
`;
  return xmlResponse(body);
}
