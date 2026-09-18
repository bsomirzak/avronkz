/**
 * Отзывы о наших товарах на Kaspi.kz — те же, что покупатель видит на карточке
 * товара, только отзывы на наш магазин.
 *
 * Сайт не ходит в Kaspi сам: серверам Vercel (AWS) Kaspi отвечает 403/429.
 * Отзывы собирает scripts/kaspi-reviews.mjs на нашем сервере во Франкфурте
 * (cron, 09:00 и 21:00 по Алматы) и отправляет в app/api/kaspi-reviews, а тот
 * кладёт их в Redis. Пока в Redis пусто, показываем lib/kaspi-reviews.json.
 *
 * Эти рейтинги нельзя отдавать в JSON-LD как AggregateRating: Google запрещает
 * размечать отзывы, собранные с других сайтов. Только показ со ссылкой на Kaspi.
 */
import fallback from "./kaspi-reviews.json";
import { PRODUCTS } from "@/lib/products";
import { redis } from "@/lib/redis";

export const REDIS_KEY = "kaspi:reviews";

/** Как часто процесс перечитывает Redis — снимок меняется дважды в день. */
const MEMO_TTL_MS = 60_000;

const MAX_REVIEWS = 20;
const MAX_TEXT = 3000;

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

export type KaspiSnapshot = {
  /** YYYY-MM-DD */
  updatedAt: string;
  products: Record<string, KaspiReviews>;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : null);

function parseReviews(raw: unknown): KaspiReviews | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rating = r.rating;
  const count = r.count;
  const url = str(r.url, 500);
  if (typeof rating !== "number" || !(rating > 0 && rating <= 5)) return null;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) return null;
  // Ссылка уходит в href — пускаем только карточки Kaspi.
  if (!url?.startsWith("https://kaspi.kz/")) return null;
  if (!Array.isArray(r.reviews)) return null;
  const reviews: KaspiReview[] = [];
  for (const item of r.reviews.slice(0, MAX_REVIEWS)) {
    if (!item || typeof item !== "object") return null;
    const x = item as Record<string, unknown>;
    const id = str(x.id, 100);
    const author = str(x.author, 100);
    const date = str(x.date, 20);
    if (!id || author === null || date === null) return null;
    if (typeof x.rating !== "number" || !Number.isInteger(x.rating) || x.rating < 1 || x.rating > 5) {
      return null;
    }
    reviews.push({
      id,
      author,
      date,
      rating: x.rating,
      text: str(x.text, MAX_TEXT) ?? "",
      plus: str(x.plus, MAX_TEXT) ?? "",
      minus: str(x.minus, MAX_TEXT) ?? "",
    });
  }
  return { rating, count, url, reviews };
}

/**
 * Проверяет снимок целиком: и присланный сервером, и прочитанный из Redis.
 * Любой кривой товар — весь снимок отклоняется, чтобы не показать полуправду.
 */
export function parseKaspiSnapshot(raw: unknown, knownIds: Set<string>): KaspiSnapshot | null {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.updatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.updatedAt)) return null;
  if (!d.products || typeof d.products !== "object") return null;
  const products: Record<string, KaspiReviews> = {};
  for (const [id, value] of Object.entries(d.products)) {
    if (!knownIds.has(id)) return null;
    const parsed = parseReviews(value);
    if (!parsed) return null;
    products[id] = parsed;
  }
  return { updatedAt: d.updatedAt, products };
}

export function knownProductIds(): Set<string> {
  return new Set(PRODUCTS.map((p) => p.id));
}

let memo: { snapshot: KaspiSnapshot; at: number } | null = null;

export async function getKaspiSnapshot(): Promise<KaspiSnapshot> {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.snapshot;
  const stored = await redis<string>(["GET", REDIS_KEY]);
  const snapshot =
    (stored && parseKaspiSnapshot(stored, knownProductIds())) ||
    (fallback as KaspiSnapshot);
  memo = { snapshot, at: Date.now() };
  return snapshot;
}

/** «2026-09-18» → «18.09.2026». */
export function formatSnapshotDate(isoDate: string): string {
  return isoDate.split("-").reverse().join(".");
}

/** «1 отзыв», «3 отзыва», «16 отзывов». */
export function reviewsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} отзыва`;
  return `${n} отзывов`;
}
