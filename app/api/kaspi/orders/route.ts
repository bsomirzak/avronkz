import {
  fetchOrders,
  KaspiError,
  MAX_RANGE_DAYS,
  ORDER_STATES,
} from "@/lib/kaspi";

// Выгрузка за большой период идёт десятками запросов к Kaspi — держим лимит повыше.
export const maxDuration = 60;

const TZ = "+05:00"; // Алматы
const startOfDay = (s: string) => new Date(`${s}T00:00:00${TZ}`).getTime();
const endOfDay = (s: string) => new Date(`${s}T23:59:59${TZ}`).getTime();

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const token = process.env.KASPI_TOKEN;
  if (!token) {
    return bad(
      "KASPI_TOKEN не задан. Добавьте его в .env.local (локально) или в переменные окружения Vercel.",
      500,
    );
  }

  const q = new URL(request.url).searchParams;

  const toRaw = q.get("to");
  const fromRaw = q.get("from");
  const toMs = toRaw ? endOfDay(toRaw) : Date.now();
  const fromMs = fromRaw ? startOfDay(fromRaw) : toMs - 30 * 864e5;

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
    return bad("Некорректные даты периода.");
  }
  if ((toMs - fromMs) / 864e5 > MAX_RANGE_DAYS) {
    return bad(`Период больше ${MAX_RANGE_DAYS} дней. Разбейте на части.`);
  }

  const requested = (q.get("states") ?? "ARCHIVE").split(",").map((s) => s.trim());
  const states = ORDER_STATES.filter((s) => requested.includes(s));
  if (!states.length) return bad("Не выбрано ни одного статуса заказа.");

  try {
    const { orders, warnings } = await fetchOrders({ token, fromMs, toMs, states });
    return Response.json({ orders, warnings });
  } catch (e) {
    if (e instanceof KaspiError) return bad(e.message, e.status === 401 ? 401 : 502);
    return bad((e as Error).message, 502);
  }
}
