"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent, type EventProps } from "@/lib/analytics";

/** Отправляет событие один раз при открытии страницы (view_product, view_contacts). */
export function TrackView({ event, props }: { event: AnalyticsEvent; props?: EventProps }) {
  useEffect(() => {
    track(event, props);
    // props — литерал из серверного компонента, следим только за самим событием
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
