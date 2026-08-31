"use client";

import { useEffect, useState } from "react";
import { EVENT_LABEL, TRACKED } from "@/lib/events";

type Report = {
  totals: Record<string, number>;
  byProduct: Record<string, number>;
  daily: { day: string; counts: Record<string, number> }[];
  storage: boolean;
  period: number;
};

const PERIODS = [
  { days: 1, label: "Сегодня" },
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
];

const fmtDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });

export function StatsView({ names }: { names: Record<string, string> }) {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stats?days=${days}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить статистику.");
        if (!alive) return;
        setReport(data as Report);
        setError(null);
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [days]);

  const products = Object.entries(report?.byProduct ?? {}).sort((a, b) => b[1] - a[1]);
  const daily = [...(report?.daily ?? [])].reverse();

  return (
    <div className="stats">
      <div className="stats-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            className={p.days === days ? "active" : undefined}
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="stats-error">{error}</p>}
      {report && !report.storage && (
        <p className="stats-warn">
          Хранилище не отвечает — цифры считаются в памяти сервера и обнуляются при каждом
          перезапуске. Проверьте подключение Upstash в Vercel.
        </p>
      )}

      <div className="stats-cards">
        {TRACKED.map((event) => (
          <div key={event} className="stats-card">
            <span className="stats-card-label">{EVENT_LABEL[event]}</span>
            <b>{report?.totals[event] ?? 0}</b>
          </div>
        ))}
      </div>

      <h2 className="stats-h2">Переходы в Kaspi по товарам</h2>
      {products.length ? (
        <table className="stats-table">
          <thead>
            <tr>
              <th>Товар</th>
              <th>Нажатий</th>
            </tr>
          </thead>
          <tbody>
            {products.map(([id, count]) => (
              <tr key={id}>
                <td>{names[id] ?? id}</td>
                <td className="num">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="stats-empty">
          Пока никто не нажимал «Купить на Kaspi» на карточках товаров за выбранный период.
        </p>
      )}

      <h2 className="stats-h2">По дням</h2>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Дата</th>
            {TRACKED.map((event) => (
              <th key={event}>{EVENT_LABEL[event]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daily.map(({ day, counts }) => (
            <tr key={day}>
              <td>{fmtDay(day)}</td>
              {TRACKED.map((event) => (
                <td key={event} className="num">
                  {counts[event] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
