/**
 * Отзывы о наших товарах на Kaspi.kz — те же, что покупатель видит на карточке
 * товара, только отзывы на наш магазин.
 *
 * Сайт читает снимок lib/kaspi-reviews.json, а не ходит в Kaspi сам: серверам
 * Vercel Kaspi отвечает 403/429. Обновить снимок: `npm run kaspi:reviews`
 * (scripts/kaspi-reviews.mjs) с компьютера в Казахстане, затем закоммитить.
 *
 * Эти рейтинги нельзя отдавать в JSON-LD как AggregateRating: Google запрещает
 * размечать отзывы, собранные с других сайтов. Только показ со ссылкой на Kaspi.
 */
import snapshot from "./kaspi-reviews.json";

export type KaspiReview = {
  id: string;
  author: string;
  date: string;
  rating: number;
  text: string;
  plus: string;
  minus: string;
};

export type KaspiReviews = {
  rating: number;
  /** Отзывов с текстом — это число Kaspi показывает на карточке товара. */
  count: number;
  url: string;
  reviews: KaspiReview[];
};

const PRODUCTS: Record<string, KaspiReviews | undefined> = snapshot.products;

/** Дата снимка в виде «18.09.2026». */
export const KASPI_REVIEWS_DATE = snapshot.updatedAt.split("-").reverse().join(".");

export function getKaspiReviews(productId: string): KaspiReviews | null {
  return PRODUCTS[productId] ?? null;
}

/** «1 отзыв», «3 отзыва», «16 отзывов». */
export function reviewsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} отзыва`;
  return `${n} отзывов`;
}
