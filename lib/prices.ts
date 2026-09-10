/**
 * Цены, которые можно править прямо на сайте — раздел /admin.
 *
 * lib/products.ts остаётся источником правды для всего остального: названий,
 * описаний, характеристик и картинок. Здесь лежит только тонкий слой поверх —
 * карта «id товара → новая цена». Она хранится одним JSON-ключом в том же
 * Upstash Redis, что и переписка из /chats, поэтому переживает деплой и
 * одинаково видна всем серверам Vercel.
 *
 * Без хранилища (KV_REST_API_URL / KV_REST_API_TOKEN не заданы) сайт работает
 * ровно как раньше: цены берутся из кода, страницы остаются статическими,
 * а /admin честно говорит, что править пока нечем.
 */

import { persistent, redis } from "@/lib/redis";
import { PRODUCTS, formatPrice, type Product } from "@/lib/products";

export { persistent };

/** Один ключ на весь каталог: товаров десятки, JSON целиком дешевле хэша. */
const KEY = "prices:override";

/**
 * Сколько секунд карта цен живёт в памяти процесса. Нужна не ради скорости, а
 * чтобы всплеск посещений не съел лимит бесплатного Upstash: один запрос в
 * хранилище на инстанс раз в 10 секунд вместо запроса на каждый просмотр.
 */
const MEMO_TTL_MS = 10_000;

export type PriceEdit = {
  price: number | null;
  oldPrice: number | null;
  /** Когда цену поменяли — показываем в /admin, чтобы видеть свежесть. */
  updatedAt: number;
};

export type PriceMap = Record<string, PriceEdit>;

/** Потолок на цену: защита от опечатки в лишний ноль, а не от злого умысла. */
export const MAX_PRICE = 100_000_000;

let memo: { map: PriceMap; at: number } | null = null;

function isPriceValue(value: unknown): value is number | null {
  if (value === null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_PRICE;
}

/** Читаем чужой JSON осторожно: мусор молча выбрасываем, а не роняем страницу. */
function parseMap(raw: unknown): PriceMap {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object") return {};

  const map: PriceMap = {};
  for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const edit = value as Record<string, unknown>;
    if (!isPriceValue(edit.price) || !isPriceValue(edit.oldPrice)) continue;
    map[id] = {
      price: edit.price,
      oldPrice: edit.oldPrice,
      updatedAt: typeof edit.updatedAt === "number" ? edit.updatedAt : 0,
    };
  }
  return map;
}

/** Карта правок из хранилища. `fresh` — для /admin, где важна точность, а не кэш. */
export async function readPrices({ fresh = false } = {}): Promise<PriceMap> {
  if (!persistent) return {};
  if (!fresh && memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.map;

  const raw = await redis<unknown>(["GET", KEY]);
  // null бывает и когда правок ещё нет, и когда база не ответила: в обоих
  // случаях показываем цены из кода — это безопаснее пустого прочерка.
  const map = parseMap(raw);
  memo = { map, at: Date.now() };
  return map;
}

/**
 * Записать новую цену товара. `edit === null` — вернуть цену из кода.
 * Возвращает карту целиком, чтобы вызывающий сразу видел итог.
 */
export async function writePrice(
  id: string,
  edit: { price: number | null; oldPrice: number | null } | null,
): Promise<PriceMap> {
  if (!persistent) throw new Error("Хранилище не подключено");

  const map = await readPrices({ fresh: true });
  if (edit === null) {
    delete map[id];
  } else {
    map[id] = { price: edit.price, oldPrice: edit.oldPrice, updatedAt: Date.now() };
  }

  const ok = await redis(["SET", KEY, JSON.stringify(map)]);
  if (ok === null) throw new Error("Хранилище не приняло запись");

  memo = { map, at: Date.now() };
  return map;
}

/** Сколько месяцев рассрочки обещает бейдж «0·0·12» или «0·0·24». */
export function installmentMonths(product: Product): number {
  const match = (product.installmentBadge ?? "0·0·12").match(/(\d+)\s*$/);
  const months = match ? Number(match[1]) : 12;
  return months > 0 ? months : 12;
}

/** «35 833 ₸ × 12 мес» — тот же вид, что и у цен, вбитых руками в каталог. */
export function installmentText(price: number, months: number): string {
  return `${formatPrice(Math.round(price / months))} × ${months} мес`;
}

/** Скидка в том же формате, что в каталоге: «-21%». Без старой цены — null. */
export function discountText(price: number | null, oldPrice: number | null): string | null {
  if (price === null || !oldPrice || oldPrice <= price) return null;
  return `-${Math.round((1 - price / oldPrice) * 100)}%`;
}

/**
 * Товар с учётом правки. Рассрочку и скидку пересчитываем сами: иначе на
 * карточке рядом с новой ценой останется старый платёж по рассрочке.
 */
export function withPrice(product: Product, edit: PriceEdit | undefined): Product {
  if (!edit) return product;
  return {
    ...product,
    price: edit.price,
    oldPrice: edit.oldPrice,
    discount: discountText(edit.price, edit.oldPrice),
    installment:
      edit.price !== null
        ? installmentText(edit.price, installmentMonths(product))
        : product.installment,
  };
}

/** Каталог с актуальными ценами — то, что видит покупатель. */
export async function getCatalog(): Promise<Product[]> {
  const map = await readPrices();
  return PRODUCTS.map((p) => withPrice(p, map[p.id]));
}

export async function getCatalogProduct(id: string): Promise<Product | undefined> {
  const map = await readPrices();
  const product = PRODUCTS.find((p) => p.id === id);
  return product && withPrice(product, map[product.id]);
}
