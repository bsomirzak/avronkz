/**
 * Свой счётчик кликов: сколько человек ушли в Kaspi, написали в WhatsApp
 * или позвонили — и с каких товаров.
 *
 * Считаем у себя, потому что Google Ads и Метрику вырезает любой блокировщик
 * рекламы, а Vercel Analytics показывает свои события только на платном тарифе.
 */

import { persistent, pipeline, redis } from "@/lib/redis";
import type { TrackedEvent } from "@/lib/events";

export { EVENT_LABEL, TRACKED, isTracked } from "@/lib/events";

/** Сколько храним дневную статистику. */
const TTL_SEC = 400 * 24 * 60 * 60;
/** Разделитель «событие/товар» внутри поля хэша. */
const SEP = "|";

/** Ключ дня по времени Алматы: сутки статистики должны совпадать с рабочим днём. */
export function statsDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function key(day: string): string {
  return `stats:${day}`;
}

// Без базы считать негде — держим счётчики в памяти, чтобы локальная разработка
// не падала и цифры хоть как-то были видны до подключения Upstash.
const memory = new Map<string, Map<string, number>>();

function bump(day: string, field: string) {
  const fields = memory.get(day) ?? new Map<string, number>();
  fields.set(field, (fields.get(field) ?? 0) + 1);
  memory.set(day, fields);
}

/** Записать клик. product — id товара, если клик был с его карточки. */
export async function recordClick(event: TrackedEvent, product?: string): Promise<void> {
  const day = statsDay();
  const fields = [event, ...(product ? [`${event}${SEP}${product}`] : [])];

  if (!persistent) {
    for (const field of fields) bump(day, field);
    return;
  }

  await pipeline([
    ...fields.map((field) => ["HINCRBY", key(day), field, 1]),
    ["EXPIRE", key(day), TTL_SEC],
  ]);
}

export type DayStats = { day: string; fields: Record<string, number> };

export type StatsReport = {
  /** Итог по событиям за период. */
  totals: Record<string, number>;
  /** Клики по Kaspi в разрезе товаров: id → количество. */
  byProduct: Record<string, number>;
  /** По дням, для графика и таблицы. */
  daily: { day: string; counts: Record<string, number> }[];
};

/** Последние `days` дней, включая сегодня. */
export async function readStats(days: number): Promise<StatsReport> {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    list.push(statsDay(new Date(Date.now() - i * 86_400_000)));
  }

  let raw: DayStats[];
  if (!persistent) {
    raw = list.map((day) => ({
      day,
      fields: Object.fromEntries(memory.get(day) ?? new Map()),
    }));
  } else {
    const results = await pipeline<Record<string, string>>(list.map((day) => ["HGETALL", key(day)]));
    raw = list.map((day, i) => ({
      day,
      // Upstash отдаёт хэш объектом; на всякий случай переживаем и null.
      fields: Object.fromEntries(
        Object.entries(results?.[i] ?? {}).map(([field, value]) => [field, Number(value) || 0]),
      ),
    }));
  }

  const totals: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  const daily = raw.map(({ day, fields }) => {
    const counts: Record<string, number> = {};
    for (const [field, count] of Object.entries(fields)) {
      const [event, product] = field.split(SEP);
      if (product) {
        if (event === "click_kaspi") byProduct[product] = (byProduct[product] ?? 0) + count;
        continue; // в итогах по дням держим только события целиком
      }
      counts[event] = (counts[event] ?? 0) + count;
      totals[event] = (totals[event] ?? 0) + count;
    }
    return { day, counts };
  });

  return { totals, byProduct, daily };
}

/** Всё ли в порядке с хранилищем статистики. */
export async function statsAvailable(): Promise<boolean> {
  if (!persistent) return false;
  return (await redis<string>(["PING"])) === "PONG";
}
