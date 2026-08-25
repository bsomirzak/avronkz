import { track as vercelTrack } from "@vercel/analytics";

/**
 * Единая точка отправки событий: Яндекс.Метрика (reachGoal), Google Ads (gtag)
 * и Vercel Analytics. ID Метрики берётся из NEXT_PUBLIC_YM_ID — без него
 * счётчик просто не подключается.
 */
export const YM_ID = process.env.NEXT_PUBLIC_YM_ID;

/** Google tag для avron.kz. Переопределяется через NEXT_PUBLIC_GADS_ID. */
export const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID ?? "AW-18255849918";

export type AnalyticsEvent =
  | "view_product"
  | "view_contacts"
  | "click_kaspi"
  | "click_whatsapp"
  | "click_phone"
  | "click_instagram";

/**
 * Ярлыки конверсий Google Ads (Цели → Конверсии → «Действие-конверсия» → тег).
 * Пока пусто — события уходят как обычные, Google Ads их видит и позволяет
 * сделать конверсией. Когда в интерфейсе появится ярлык вида "AbCdEfGh",
 * впиши его сюда, и событие дополнительно уйдёт как настоящая конверсия.
 */
const GADS_CONVERSION_LABELS: Partial<Record<AnalyticsEvent, string>> = {
  // click_kaspi: "AbCdEfGhIjKlMnOp",
};

export type EventProps = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    ym?: {
      (id: number, action: string, ...args: unknown[]): void;
      a?: unknown[][];
      l?: number;
    };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ymCall(action: string, ...args: unknown[]) {
  if (typeof window === "undefined" || !YM_ID || !window.ym) return;
  window.ym(Number(YM_ID), action, ...args);
}

function gtagCall(...args: unknown[]) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag(...args);
}

/** Просмотр страницы при клиентской навигации (App Router не перезагружает страницу). */
export function trackPageview(url: string) {
  ymCall("hit", url);
  gtagCall("event", "page_view", { page_location: url });
}

/** Целевое событие: цель в Метрике + событие в Google Ads + custom event в Vercel. */
export function track(event: AnalyticsEvent, props?: EventProps) {
  if (typeof window === "undefined") return;
  ymCall("reachGoal", event, props);
  vercelTrack(event, props);
  gtagCall("event", event, props);

  const label = GADS_CONVERSION_LABELS[event];
  if (label) {
    gtagCall("event", "conversion", { send_to: `${GADS_ID}/${label}`, ...props });
  }
}
