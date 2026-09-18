/**
 * Публичные отзывы о наших товарах на Kaspi.kz — те же, что покупатель видит на
 * карточке товара. Kaspi отдаёт их без токена (в отличие от Merchant API в
 * lib/kaspi.ts). Берём только отзывы на наш магазин и кешируем на 6 часов,
 * чтобы не ходить в Kaspi на каждый показ страницы.
 *
 * Эти рейтинги нельзя отдавать в JSON-LD как AggregateRating: Google запрещает
 * размечать отзывы, собранные с других сайтов. Только показ со ссылкой на Kaspi.
 */

const MERCHANT_CODE = "30391363";
const REVALIDATE_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 5000;

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

/** Код товара Kaspi — число в конце ссылки .../shop/p/<slug>-<code>/ */
export function kaspiProductCode(url: string | undefined): string | null {
  return url?.match(/-(\d+)\/?(?:\?|$)/)?.[1] ?? null;
}

type ApiReview = {
  id: string;
  author: string;
  date: string;
  rating: number;
  comment?: { text?: string; plus?: string; minus?: string };
};

type ApiResponse = {
  data?: ApiReview[];
  summary?: { global?: number };
  groupSummary?: { id: string; total: number }[];
};

export async function getKaspiReviews(
  kaspiUrl: string | undefined,
  limit = 6,
): Promise<KaspiReviews | null> {
  const code = kaspiProductCode(kaspiUrl);
  if (!kaspiUrl || !code) return null;
  const api =
    `https://kaspi.kz/yml/review-view/api/v1/reviews/product/${code}` +
    `?filter=COMMENT&sort=POPULARITY&limit=${limit}&merchantCodes=${MERCHANT_CODE}&withAgg=true`;
  try {
    const res = await fetch(api, {
      headers: { Accept: "application/json", Referer: kaspiUrl },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse;
    const count = body.groupSummary?.find((g) => g.id === "COMMENT")?.total ?? 0;
    const rating = body.summary?.global ?? 0;
    if (count === 0 || rating === 0) return null;
    return {
      rating,
      count,
      url: kaspiUrl,
      reviews: (body.data ?? []).map((r) => ({
        id: r.id,
        author: r.author,
        date: r.date,
        rating: r.rating,
        text: r.comment?.text?.trim() ?? "",
        plus: r.comment?.plus?.trim() ?? "",
        minus: r.comment?.minus?.trim() ?? "",
      })),
    };
  } catch {
    // Kaspi недоступен или поменял формат — страница просто показывается без блока отзывов.
    return null;
  }
}

/** «1 отзыв», «3 отзыва», «16 отзывов». */
export function reviewsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} отзыва`;
  return `${n} отзывов`;
}
