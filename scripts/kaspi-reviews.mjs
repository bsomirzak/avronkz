/**
 * Отзывы о наших товарах с Kaspi.kz.
 *
 *   npm run kaspi:reviews     — снимок в lib/kaspi-reviews.json (запасной, в git)
 *   node kaspi-reviews.mjs --push
 *                             — на сервере по cron: список товаров берёт с сайта,
 *                               готовый снимок отправляет в /api/kaspi-reviews → Redis
 *
 * В режиме --push файл самодостаточен: на сервер копируется только он, без репозитория.
 * Ключ: переменная KASPI_REVIEWS_TOKEN или файл из KASPI_REVIEWS_TOKEN_FILE
 * (по умолчанию ~/avron-kaspi/token). Адрес сайта: AVRON_URL (по умолчанию https://avron.kz).
 *
 * Kaspi пускает не все адреса: серверам Vercel (AWS) он отвечает 403/429. Поэтому
 * на первой же ошибке останавливаемся без повторов и ничего не отправляем —
 * на сайте остаётся прошлый снимок. Обходить блокировку нельзя: это риск для
 * самого магазина на Kaspi.
 */
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";

const MERCHANT_CODE = "30391363";
const LIMIT = 6;
const PAUSE_MS = 400;
const SITE = (process.env.AVRON_URL ?? "https://avron.kz").replace(/\/$/, "");
const PUSH = process.argv.includes("--push");

const log = (msg) => console.log(`${new Date().toISOString()}  ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const codeOf = (url) => url?.match(/-(\d+)\/?(?:\?|$)/)?.[1] ?? null;

async function token() {
  if (process.env.KASPI_REVIEWS_TOKEN) return process.env.KASPI_REVIEWS_TOKEN.trim();
  const file = process.env.KASPI_REVIEWS_TOKEN_FILE ?? `${homedir()}/avron-kaspi/token`;
  return (await readFile(file, "utf8")).trim();
}

/** Что собирать: [{ id, kaspiUrl }]. */
async function targets(auth) {
  if (!PUSH) {
    const { PRODUCTS } = await import("../lib/products.ts");
    return PRODUCTS.filter((p) => p.kaspiUrl).map((p) => ({ id: p.id, kaspiUrl: p.kaspiUrl }));
  }
  const res = await fetch(`${SITE}/api/kaspi-reviews`, {
    headers: { Authorization: `Bearer ${auth}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`сайт не отдал список товаров: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).products;
}

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
  if (!res.ok) throw new Error(`Kaspi ответил HTTP ${res.status}`);
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

async function main() {
  const auth = PUSH ? await token() : null;
  const list = await targets(auth);

  const products = {};
  for (const { id, kaspiUrl } of list) {
    const code = codeOf(kaspiUrl);
    if (!code) continue;
    // Первая же ошибка — стоп: не долбим Kaspi повторами, прошлый снимок остаётся на сайте.
    const data = await fetchReviews(kaspiUrl, code).catch((e) => {
      throw new Error(`${id}: ${e.message}. Снимок не обновлён.`);
    });
    if (data) products[id] = data;
    await sleep(PAUSE_MS);
  }

  // Дата по Алматы, а не по UTC: запуск в 21:00 не должен подписываться вчерашним днём.
  const updatedAt = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Almaty" });
  const snapshot = { updatedAt, products };
  const summary = Object.entries(products).map(([id, p]) => `${id} ${p.rating}/${p.count}`).join(", ");

  if (!PUSH) {
    await writeFile(new URL("../lib/kaspi-reviews.json", import.meta.url), JSON.stringify(snapshot, null, 2) + "\n");
    log(`lib/kaspi-reviews.json: ${Object.keys(products).length} товаров — ${summary}`);
    return;
  }

  const res = await fetch(`${SITE}/api/kaspi-reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`сайт не принял снимок: HTTP ${res.status} ${text.slice(0, 200)}`);
  log(`отправлено на ${SITE}: ${Object.keys(products).length} товаров — ${summary}`);
}

main().catch((e) => {
  log(`ОШИБКА: ${e.message}`);
  process.exit(1);
});
