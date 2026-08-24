import { track as vercelTrack } from "@vercel/analytics";

/**
 * Единая точка отправки событий: Яндекс.Метрика (reachGoal) + Vercel Analytics.
 * ID счётчика берётся из NEXT_PUBLIC_YM_ID — без него метрика просто не грузится.
 */
export const YM_ID = process.env.NEXT_PUBLIC_YM_ID;

export type AnalyticsEvent =
  | "view_product"
  | "view_contacts"
  | "click_kaspi"
  | "click_whatsapp"
  | "click_phone"
  | "click_instagram";

export type EventProps = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    ym?: {
      (id: number, action: string, ...args: unknown[]): void;
      a?: unknown[][];
      l?: number;
    };
  }
}

function ymCall(action: string, ...args: unknown[]) {
  if (typeof window === "undefined" || !YM_ID || !window.ym) return;
  window.ym(Number(YM_ID), action, ...args);
}

/** Просмотр страницы при клиентской навигации (App Router не перезагружает страницу). */
export function trackPageview(url: string) {
  ymCall("hit", url);
}

/** Целевое событие: цель в Метрике + custom event в Vercel Analytics. */
export function track(event: AnalyticsEvent, props?: EventProps) {
  if (typeof window === "undefined") return;
  ymCall("reachGoal", event, props);
  vercelTrack(event, props);
}
