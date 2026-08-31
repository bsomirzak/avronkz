/**
 * Данные для страницы /stats. Раздел закрыт Basic Auth в proxy.ts.
 */

import { readStats, statsAvailable } from "@/lib/stats";

export async function GET(request: Request) {
  const days = Number(new URL(request.url).searchParams.get("days") ?? 7);
  const period = [1, 7, 30].includes(days) ? days : 7;

  try {
    const [report, storage] = await Promise.all([readStats(period), statsAvailable()]);
    return Response.json({ ...report, storage, period });
  } catch (e) {
    console.error("[stats] не смогли прочитать статистику", e);
    return Response.json({ error: "Не удалось загрузить статистику." }, { status: 502 });
  }
}
