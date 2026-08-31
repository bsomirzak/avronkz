import { track as vercelTrack } from "@vercel/analytics";
import { isTracked } from "@/lib/events";

/**
 * Единая точка отправки событий: Яндекс.Метрика (reachGoal), Google Ads (gtag)
 * и Vercel Analytics. ID Метрики берётся из NEXT_PUBLIC_YM_ID — без него
 * счётчик просто не подключается.
 */
export const YM_ID = process.env.NEXT_PUBLIC_YM_ID;

/** Google tag для avron.kz. Переопределяется через NEXT_PUBLIC_GADS_ID. */
export const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID ?? "AW-18255849918";

/** Валюта магазина — в ней уходит сумма конверсии в Google Ads. */
const CURRENCY = "KZT";

export type AnalyticsEvent =
  | "view_product"
  | "view_contacts"
  | "click_kaspi"
  | "click_whatsapp"
  | "click_phone"
  | "click_instagram";

/**
 * Ярлыки конверсий Google Ads (Цели → Конверсии → действие-конверсия → тег).
 * Конверсия «Покупка» повешена на click_kaspi: оформление заказа происходит
 * уже на стороне Kaspi, и уход туда — единственное, что сайт может измерить.
 */
const GADS_CONVERSION_LABELS: Partial<Record<AnalyticsEvent, string>> = {
  click_kaspi: "OQT3CIK8succEL7TiIFE",
  click_whatsapp: "D6uECNq_2-ccEL7TiIFE",
  click_phone: "baNKCN2_2-ccEL7TiIFE",
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

/**
 * Свой счётчик на /stats. Считаем сами, потому что блокировщики режут и Метрику,
 * и Google Ads, а Vercel показывает свои события только на платном тарифе.
 */
function reportToOwnStats(event: AnalyticsEvent, props?: EventProps) {
  if (!isTracked(event) || typeof navigator === "undefined") return;
  const product = typeof props?.product === "string" ? props.product : undefined;
  const body = JSON.stringify({ event, product });
  try {
    // sendBeacon переживает уход со страницы — клик по ссылке как раз такой случай.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
    }
  } catch {
    // Статистика не должна мешать посетителю уйти по ссылке.
  }
}

/** Целевое событие: цель в Метрике + событие в Google Ads + custom event в Vercel. */
export function track(event: AnalyticsEvent, props?: EventProps) {
  if (typeof window === "undefined") return;
  ymCall("reachGoal", event, props);
  vercelTrack(event, props);
  gtagCall("event", event, props);
  reportToOwnStats(event, props);

  const label = GADS_CONVERSION_LABELS[event];
  if (label) {
    const conversion: Record<string, unknown> = { send_to: `${GADS_ID}/${label}` };
    // Цена товара, с карточки которого ушли на Kaspi. Это потенциальная сумма
    // заказа, а не подтверждённая выручка — Kaspi о самой покупке не сообщает.
    if (typeof props?.value === "number") {
      conversion.value = props.value;
      conversion.currency = CURRENCY;
    }
    gtagCall("event", "conversion", conversion);
  }
}
