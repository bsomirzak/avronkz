/**
 * Правка цен из раздела /admin. Закрыт Basic Auth в proxy.ts — тем же логином
 * и паролем, что /orders и /stats.
 */

import { PRODUCTS } from "@/lib/products";
import {
  MAX_PRICE,
  persistent,
  readPrices,
  writePrice,
  installmentMonths,
  installmentText,
  type PriceMap,
} from "@/lib/prices";

const IDS = new Set(PRODUCTS.map((p) => p.id));

/** Строка из формы → число или null. Пустое поле значит «цены нет». */
function toPrice(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) return undefined;
  return Math.round(n);
}

/** Что показать в таблице: цена из кода, текущая цена и пересчитанная рассрочка. */
function rows(map: PriceMap) {
  return PRODUCTS.map((p) => {
    const edit = map[p.id];
    const price = edit ? edit.price : p.price;
    const oldPrice = edit ? edit.oldPrice : p.oldPrice;
    return {
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      cat: p.cat,
      basePrice: p.price,
      baseOldPrice: p.oldPrice,
      price,
      oldPrice,
      months: installmentMonths(p),
      installment: price !== null ? installmentText(price, installmentMonths(p)) : p.installment,
      updatedAt: edit?.updatedAt ?? null,
    };
  });
}

export async function GET() {
  try {
    const map = await readPrices({ fresh: true });
    return Response.json({ storage: persistent, items: rows(map) });
  } catch (e) {
    console.error("[admin] не смогли прочитать цены", e);
    return Response.json({ error: "Не удалось загрузить цены." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!persistent) {
    return Response.json(
      { error: "Хранилище не подключено: Vercel → Storage → Upstash Redis." },
      { status: 503 },
    );
  }

  let body: { id?: unknown; price?: unknown; oldPrice?: unknown; reset?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Не разобрали запрос." }, { status: 400 });
  }

  if (typeof body.id !== "string" || !IDS.has(body.id)) {
    return Response.json({ error: "Такого товара нет в каталоге." }, { status: 400 });
  }

  if (body.reset === true) {
    try {
      const map = await writePrice(body.id, null);
      return Response.json({ storage: true, items: rows(map) });
    } catch (e) {
      console.error("[admin] не смогли вернуть цену из кода", e);
      return Response.json({ error: "Хранилище не отвечает." }, { status: 502 });
    }
  }

  const price = toPrice(body.price);
  const oldPrice = toPrice(body.oldPrice);
  if (price === undefined || oldPrice === undefined) {
    return Response.json({ error: "Цена должна быть числом от 0 до 100 000 000." }, { status: 400 });
  }
  if (price === null && oldPrice !== null) {
    return Response.json({ error: "Старая цена без новой ничего не значит." }, { status: 400 });
  }

  try {
    const map = await writePrice(body.id, { price, oldPrice });
    return Response.json({ storage: true, items: rows(map) });
  } catch (e) {
    console.error("[admin] не смогли сохранить цену", e);
    return Response.json({ error: "Хранилище не отвечает — цена не сохранена." }, { status: 502 });
  }
}
