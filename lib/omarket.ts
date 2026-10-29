/**
 * Ценовые предложения ИП ОМЫРЗАК на Omarket.kz и XML-фид для них.
 *
 * Omarket умеет сам забирать прайс по ссылке: Кабинет поставщика → Загрузка ЦП
 * → XML. Формат совместим с Kaspi (kaspi_catalog), файл перечитывается раз
 * в 60 минут. Ссылка на наш файл — https://avron.kz/omarket-feed.xml.
 *
 * Цены лежат в data/omarket-offers.json. Их пересчитывает
 * scripts/omarket-reprice.mjs по правилу «минимальная чужая цена − 1 000 ₸,
 * но не ниже порога» — см. комментарий в скрипте. Сайт только отдаёт файл.
 */

import offers from "@/data/omarket-offers.json";

export type OmarketOffer = {
  /** Артикул ЦП в кабинете Omarket: только латиница и цифры, до 20 символов. */
  sku: string;
  name: string;
  /** Диагональ, от неё зависит порог цены. */
  diag: 65 | 75;
  /** Цена ИП ОМЫРЗАК — упрощёнка, НДС нет. */
  price: number;
  /**
   * auto — цену ведёт скрипт; fixed — наша карточка (AVRON), цену ставим
   * руками; archived — характеристики у карточки сильнее наших, в фид не идёт.
   */
  mode: "auto" | "fixed" | "archived";
  /** Карточка на omarket.kz — по ней смотрим чужие цены. */
  url: string;
};

/** Точка продаж в кабинете (Настройки профиля → Точки продаж), г. Алматы. */
export const OMARKET_STORE_ID = "POS11310271";

export const OMARKET_OFFERS = offers as OmarketOffer[];

/** Предложения, которые уходят в фид. */
export function feedOffers(): OmarketOffer[] {
  return OMARKET_OFFERS.filter((o) => o.mode !== "archived");
}
