/**
 * Снимок отзывов о наших товарах с Kaspi.kz → lib/kaspi-reviews.json.
 *
 *   npm run kaspi:reviews
 *
 * Запускать с обычного компьютера в Казахстане: серверам Vercel Kaspi отвечает
 * 403/429, поэтому сайт показывает этот снимок, а не ходит в Kaspi сам.
 * После запуска закоммитить JSON и задеплоить.
 */
import { writeFile } from "node:fs/promises";
import { PRODUCTS } from "../lib/products.ts";

const MERCHANT_CODE = "30391363";
const LIMIT = 6;
const OUT = new URL("../lib/kaspi-reviews.json", import.meta.url);

const codeOf = (url) => url?.match(/-(\d+)\/?(?:\?|$)/)?.[1] ?? null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchReviews(kaspiUrl, code) {
  const api =
    `https://kaspi.kz/yml/review-view/api/v1/reviews/product/${code}` +
    `?filter=COMMENT&sort=POPULARITY&limit=${LIMIT}&merchantCodes=${MERCHANT_CODE}&withAgg=true`;
  const res = await fetch(api, {
    headers: {
      Accept: "application/json",
      Referer: kaspiUrl,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
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
}

const products = {};
let failed = 0;
for (const p of PRODUCTS) {
  const code = codeOf(p.kaspiUrl);
  if (!code) {
    console.log(`—  ${p.id}: нет ссылки на Kaspi`);
    continue;
  }
  try {
    const data = await fetchReviews(p.kaspiUrl, code);
    if (data) products[p.id] = data;
    console.log(`${data ? "✓" : "·"}  ${p.id}: ${data ? `${data.rating} · ${data.count}` : "отзывов нет"}`);
  } catch (e) {
    failed++;
    console.log(`✗  ${p.id}: ${e.message}`);
  }
  await sleep(400);
}

if (failed > 0) {
  // Не затираем рабочий снимок частичным: лучше старые данные, чем пропавшие отзывы.
  console.error(`\nНе удалось получить ${failed} из ${PRODUCTS.length}. Файл не изменён — повторите позже.`);
  process.exit(1);
}

const updatedAt = new Date().toISOString().slice(0, 10);
await writeFile(OUT, JSON.stringify({ updatedAt, products }, null, 2) + "\n");
console.log(`\nГотово: ${Object.keys(products).length} товаров с отзывами → lib/kaspi-reviews.json`);
