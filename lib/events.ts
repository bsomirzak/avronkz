/**
 * Названия событий и их подписи. Отдельный модуль, потому что список нужен
 * и на клиенте (отправка клика), и на сервере (счётчик) — а тянуть в браузер
 * серверный код с Redis ради четырёх строк ни к чему.
 */

export const TRACKED = ["click_kaspi", "click_whatsapp", "click_phone", "click_instagram"] as const;
export type TrackedEvent = (typeof TRACKED)[number];

export const EVENT_LABEL: Record<TrackedEvent, string> = {
  click_kaspi: "Купить на Kaspi",
  click_whatsapp: "WhatsApp",
  click_phone: "Звонок",
  click_instagram: "Instagram",
};

export function isTracked(value: unknown): value is TrackedEvent {
  return typeof value === "string" && (TRACKED as readonly string[]).includes(value);
}
