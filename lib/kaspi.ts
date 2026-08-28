/**
 * Клиент официального Kaspi Merchant API (Магазин на Kaspi.kz).
 *
 * Отдаёт заказы нашего же магазина вместе с контактами покупателей.
 * Токен читается только на сервере и в браузер не попадает — см. app/api/kaspi.
 */

const API = "https://kaspi.kz/shop/api/v2/orders";

/** Состояния заказа. Kaspi требует фильтр по состоянию, «все сразу» он не отдаёт. */
export const ORDER_STATES = [
  "NEW",
  "SIGN_REQUIRED",
  "PICKUP",
  "DELIVERY",
  "KASPI_DELIVERY",
  "ARCHIVE",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export const STATE_LABELS: Record<OrderState, string> = {
  NEW: "Новые",
  SIGN_REQUIRED: "Ждут подписи",
  PICKUP: "Самовывоз",
  DELIVERY: "Наша доставка",
  KASPI_DELIVERY: "Kaspi Доставка",
  ARCHIVE: "Завершённые",
};

const PAGE_SIZE = 100; // максимум, который отдаёт Kaspi
const WINDOW_DAYS = 13; // Kaspi не принимает интервал длиннее 14 дней
export const MAX_RANGE_DAYS = 90;
const THROTTLE_MS = 220; // пауза между запросами, чтобы не ловить 429
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

export type KaspiOrder = {
  id: string;
  code: string;
  date: number | null;
  state: string;
  status: string;
  name: string;
  /** 77XXXXXXXXX либо пустая строка, если Kaspi номер скрыл. */
  phone: string;
  phonePretty: string;
  masked: boolean;
  total: number;
  city: string;
  address: string;
  kaspiDelivery: boolean;
};

export class KaspiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function kaspiGet(
  params: URLSearchParams,
  token: string,
  attempt = 0,
): Promise<{ data?: unknown[] }> {
  let res: Response;
  try {
    res = await fetch(`${API}?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
      headers: {
        "X-Auth-Token": token,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
    });
  } catch {
    if (attempt < MAX_RETRIES) {
      await sleep(800 * (attempt + 1));
      return kaspiGet(params, token, attempt + 1);
    }
    throw new KaspiError("Kaspi не отвечает. Попробуйте ещё раз.", 504);
  }

  // 429 и 5xx — временные, повторяем с паузой
  if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
    await sleep(1200 * (attempt + 1));
    return kaspiGet(params, token, attempt + 1);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new KaspiError(
      res.status === 401 || res.status === 403
        ? "Kaspi отклонил токен. Сформируйте новый: кабинет продавца → Настройки → Токен API."
        : `Kaspi ответил ${res.status}: ${text.slice(0, 200)}`,
      res.status,
    );
  }
  try {
    return JSON.parse(text) as { data?: unknown[] };
  } catch {
    throw new KaspiError("Kaspi вернул не JSON — обычно это неверный токен.", 502);
  }
}

/** Одно состояние + одно окно дат, со всеми страницами. */
async function fetchWindow(
  token: string,
  state: string,
  from: number,
  to: number,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 0; page < 200; page++) {
    const params = new URLSearchParams({
      "page[number]": String(page),
      "page[size]": String(PAGE_SIZE),
      "filter[orders][state]": state,
      "filter[orders][creationDate][$ge]": String(from),
      "filter[orders][creationDate][$le]": String(to),
    });
    const json = await kaspiGet(params, token);
    const data = Array.isArray(json.data) ? json.data : [];
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    await sleep(THROTTLE_MS);
  }
  return rows;
}

/** Приводит номер к 77XXXXXXXXX. Пустая строка — значит на номер не похоже. */
export function normalizePhone(input: unknown): string {
  if (!input) return "";
  const d = String(input).replace(/\D/g, "");
  if (d.length === 10) return "7" + d;
  if (d.length === 11 && (d[0] === "8" || d[0] === "7")) return "7" + d.slice(1);
  return "";
}

export function prettyPhone(e164: string): string {
  if (e164.length !== 11) return e164;
  return `+${e164[0]} (${e164.slice(1, 4)}) ${e164.slice(4, 7)}-${e164.slice(7, 9)}-${e164.slice(9)}`;
}

type Attrs = Record<string, unknown>;
const obj = (v: unknown): Attrs => (v && typeof v === "object" ? (v as Attrs) : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Номер лежит то в customer.cellPhone, то только в phoneAlias («+ 7 (705) 943-05-21,111…»). */
function pickPhone(a: Attrs): string {
  const alias = a.phoneAlias;
  for (const c of [
    obj(a.customer).cellPhone,
    obj(a.recipient).cellPhone,
    typeof alias === "string" ? alias.split(",")[0] : null,
  ]) {
    const n = normalizePhone(c);
    if (n) return n;
  }
  return "";
}

function fullName(a: Attrs): string {
  const c = obj(a.customer);
  const r = obj(a.recipient);
  return (
    [str(c.lastName), str(c.firstName), str(c.name)].filter(Boolean).join(" ").trim() ||
    [str(r.lastName), str(r.firstName)].filter(Boolean).join(" ").trim() ||
    "—"
  );
}

function normalize(order: unknown): KaspiOrder {
  const o = obj(order);
  const a = obj(o.attributes);
  const addr = obj(a.deliveryAddress);
  const phone = pickPhone(a);
  return {
    id: str(o.id),
    code: str(a.code),
    date: typeof a.creationDate === "number" ? a.creationDate : null,
    state: str(a.state),
    status: str(a.status),
    name: fullName(a),
    phone,
    phonePretty: phone ? prettyPhone(phone) : "",
    masked: !phone,
    total: Number(a.totalPrice ?? 0),
    city: str(addr.town),
    address: str(addr.formattedAddress),
    kaspiDelivery: Boolean(a.isKaspiDelivery),
  };
}

export type FetchResult = { orders: KaspiOrder[]; warnings: string[] };

/**
 * Тянет заказы за период. Период режется на окна по 13 дней, потому что более
 * длинный интервал Kaspi не принимает; по каждому состоянию идёт отдельный обход.
 */
export async function fetchOrders(args: {
  token: string;
  fromMs: number;
  toMs: number;
  states: readonly string[];
}): Promise<FetchResult> {
  const { token, fromMs, toMs, states } = args;
  const warnings: string[] = [];
  const byId = new Map<string, KaspiOrder>();
  const step = WINDOW_DAYS * 864e5;

  for (let start = fromMs; start <= toMs; start += step) {
    const end = Math.min(start + step - 1, toMs);
    for (const state of states) {
      try {
        for (const raw of await fetchWindow(token, state, start, end)) {
          const order = normalize(raw);
          if (order.id && !byId.has(order.id)) byId.set(order.id, order);
        }
      } catch (e) {
        // Неверный токен — дальше идти бессмысленно, остальное просто помечаем.
        if (e instanceof KaspiError && (e.status === 401 || e.status === 403)) throw e;
        const day = new Date(start).toISOString().slice(0, 10);
        warnings.push(`${state} ${day}: ${(e as Error).message}`);
      }
      await sleep(THROTTLE_MS);
    }
  }

  const orders = [...byId.values()].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  return { orders, warnings };
}
