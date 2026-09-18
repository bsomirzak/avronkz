import { PRODUCTS } from "@/lib/products";
import { REDIS_KEY, knownProductIds, parseKaspiSnapshot } from "@/lib/kaspi-reviews";
import { persistent, redis } from "@/lib/redis";

/**
 * Приём отзывов с Kaspi от scripts/kaspi-reviews.mjs, который крутится по cron
 * на нашем сервере во Франкфурте (Vercel Kaspi не пускает — см. lib/kaspi-reviews.ts).
 *
 *   GET  — список товаров и ссылок на Kaspi: что собирать.
 *   POST — готовый снимок { updatedAt, products } → Redis.
 *
 * Не под proxy.ts: у сервера свой ключ KASPI_REVIEWS_TOKEN (Bearer), а не
 * пароль от /admin и /orders.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512 * 1024;

/** Сравнение без раннего выхода, чтобы по времени ответа нельзя было подбирать ключ. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authError(request: Request): Response | null {
  const token = process.env.KASPI_REVIEWS_TOKEN;
  if (!token) {
    return Response.json({ error: "KASPI_REVIEWS_TOKEN не задан на Vercel." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || !safeEqual(header.slice(7), token)) {
    return Response.json({ error: "Неверный ключ." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authError(request);
  if (denied) return denied;
  return Response.json({
    products: PRODUCTS.filter((p) => p.kaspiUrl).map((p) => ({ id: p.id, kaspiUrl: p.kaspiUrl })),
  });
}

export async function POST(request: Request) {
  const denied = authError(request);
  if (denied) return denied;
  if (!persistent) {
    return Response.json({ error: "Redis не подключён — сохранить некуда." }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Слишком большой снимок." }, { status: 413 });
  }
  const snapshot = parseKaspiSnapshot(raw, knownProductIds());
  if (!snapshot) {
    return Response.json({ error: "Снимок не прошёл проверку." }, { status: 400 });
  }

  const saved = await redis<string>(["SET", REDIS_KEY, JSON.stringify(snapshot)]);
  if (saved !== "OK") {
    return Response.json({ error: "Redis не сохранил снимок." }, { status: 502 });
  }
  return Response.json({ ok: true, products: Object.keys(snapshot.products).length });
}
