/**
 * Товарный фид в формате YML — для Яндекса.
 *
 * Один и тот же файл забирают:
 *  • Яндекс Директ — Библиотека → Фиды, для товарной кампании, смарт-баннеров
 *    и динамических объявлений;
 *  • Яндекс Маркет — если магазин туда подключат.
 *
 * Google в /merchant-feed.xml ждёт RSS 2.0 со схемой g:, Яндекс — свой YML
 * с деревом yml_catalog → shop → offers. Поэтому это отдельный маршрут,
 * а не ещё один формат внутри существующего.
 *
 * Описание формата: Директ → Справка → «Требования к фиду» (упрощённый тип
 * описания предложения, vendor.model для товаров с производителем).
 */

import { CATEGORIES } from "@/lib/products";
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

/** Описание в YML ограничено 3000 символами. */
const DESCRIPTION_LIMIT = 3000;
/** Больше десяти картинок Яндекс у одного предложения не берёт. */
const MAX_PICTURES = 10;
/** sales_notes — короткая строка, до 50 символов. */
const SALES_NOTES_LIMIT = 50;
const SALES_NOTES = "Наличные, перевод, Kaspi QR, счёт для компаний";

/**
 * Категориям нужны числовые id. Берём порядок из CATEGORIES (кроме «Все
 * товары» — это не категория, а фильтр) и нумеруем с единицы: id должны быть
 * постоянными между выгрузками, а порядок в каталоге меняется редко.
 */
const CATEGORY_IDS = new Map(
  CATEGORIES.filter((c) => c.key !== "all").map((c, i) => [c.key, i + 1]),
);

/** Дата выгрузки в формате, который ждёт Яндекс: YYYY-MM-DD HH:mm по Алматы. */
function feedDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function offer(p: PricedProduct): string {
  const categoryId = CATEGORY_IDS.get(p.catKey);
  // Предложение без категории Яндекс отклонит — такие пропускаем выше.
  if (!categoryId) return "";

  const lines: string[] = [
    `        <url>${xml(productUrl(p))}</url>`,
    `        <price>${Math.round(p.price)}</price>`,
  ];

  // oldprice имеет смысл только когда он действительно больше текущей цены —
  // иначе Яндекс считает это ошибкой и снимает предложение с показа.
  if (p.oldPrice !== null && p.oldPrice > p.price) {
    lines.push(`        <oldprice>${Math.round(p.oldPrice)}</oldprice>`);
  }

  lines.push(`        <currencyId>KZT</currencyId>`);
  lines.push(`        <categoryId>${categoryId}</categoryId>`);

  for (const src of productImages(p).slice(0, MAX_PICTURES)) {
    lines.push(`        <picture>${xml(src)}</picture>`);
  }

  lines.push(`        <vendor>${xml(SITE.name)}</vendor>`);
  lines.push(`        <model>${xml(p.seoTitle ?? p.name)}</model>`);
  lines.push(`        <name>${xml(p.seoTitle ?? p.name)}</name>`);
  lines.push(
    `        <description>${xml(plainDescription(p, DESCRIPTION_LIMIT))}</description>`,
  );

  // Рассрочка у нас только на Kaspi.kz по цене Kaspi — в объявлении по цене сайта её не обещаем.
  lines.push(`        <sales_notes>${xml(SALES_NOTES.slice(0, SALES_NOTES_LIMIT))}</sales_notes>`);

  // Характеристики карточки идут параметрами: по ним работают фильтры
  // и подстановка в динамические объявления.
  for (const [label, value] of p.specs) {
    lines.push(`        <param name="${xml(label)}">${xml(value)}</param>`);
  }

  return `      <offer id="${xml(p.id)}" available="true">\n${lines.join("\n")}\n      </offer>`;
}

export async function GET() {
  const priced = await pricedCatalog();
  const offers = priced.map(offer).filter(Boolean);

  const categories = CATEGORIES.filter((c) => c.key !== "all")
    .map((c) => `      <category id="${CATEGORY_IDS.get(c.key)}">${xml(c.label)}</category>`)
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${feedDate()}">
  <shop>
    <name>${xml(SITE.name)}</name>
    <company>${xml(SITE.name)}</company>
    <url>${xml(SITE.url)}</url>
    <currencies>
      <currency id="KZT" rate="1"/>
    </currencies>
    <categories>
${categories}
    </categories>
    <offers>
${offers.join("\n")}
    </offers>
  </shop>
</yml_catalog>
`;

  return xmlResponse(feed);
}
