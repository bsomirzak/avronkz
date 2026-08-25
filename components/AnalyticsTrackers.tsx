"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track, trackPageview, type AnalyticsEvent } from "@/lib/analytics";

/** Определяем цель по ссылке, на которую кликнули: не нужно оборачивать каждую кнопку. */
function eventForHref(href: string): AnalyticsEvent | null {
  if (href.startsWith("tel:")) return "click_phone";
  if (href.includes("wa.me") || href.includes("whatsapp")) return "click_whatsapp";
  if (href.includes("instagram.com")) return "click_instagram";
  if (href.includes("kaspi.kz")) return "click_kaspi";
  return null;
}

function ClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!href) return;
      const event = eventForHref(href);
      if (!event) return;
      // data-analytics-value ставит карточка товара: сумма для конверсии Google Ads.
      const rawValue = link?.getAttribute("data-analytics-value");
      const value = rawValue ? Number(rawValue) : null;
      track(event, {
        href,
        page: window.location.pathname,
        ...(value !== null && Number.isFinite(value) ? { value } : {}),
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

/** Метрика сама шлёт первый хит при init — дальше хиты шлём руками на клиентской навигации. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const query = searchParams.toString();
    trackPageview(window.location.origin + pathname + (query ? `?${query}` : ""));
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTrackers() {
  return (
    <>
      <ClickTracker />
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}
