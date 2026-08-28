"use client";

import { useMemo, useState } from "react";
import {
  ORDER_STATES,
  STATE_LABELS,
  prettyPhone,
  type KaspiOrder,
  type OrderState,
} from "@/lib/kaspi";
import { formatPrice } from "@/lib/products";

const DEFAULT_STATES: OrderState[] = ["ARCHIVE", "KASPI_DELIVERY", "DELIVERY", "PICKUP"];

/** Дата в формате YYYY-MM-DD по местному календарю, без сдвига через UTC. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
}

/** Покупатель, склеенный по номеру телефона. */
type Client = {
  phone: string;
  phonePretty: string;
  name: string;
  orders: number;
  total: number;
  lastDate: number | null;
};

function groupClients(orders: KaspiOrder[]): Client[] {
  const map = new Map<string, Client>();
  for (const o of orders) {
    if (!o.phone) continue;
    const prev = map.get(o.phone);
    if (prev) {
      prev.orders += 1;
      prev.total += o.total;
      if ((o.date ?? 0) > (prev.lastDate ?? 0)) {
        prev.lastDate = o.date;
        if (o.name !== "—") prev.name = o.name;
      }
    } else {
      map.set(o.phone, {
        phone: o.phone,
        phonePretty: prettyPhone(o.phone),
        name: o.name,
        orders: 1,
        total: o.total,
        lastDate: o.date,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders || (b.lastDate ?? 0) - (a.lastDate ?? 0));
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** BOM нужен, иначе Excel открывает кириллицу кракозябрами. */
function downloadCsv(name: string, rows: (string | number)[][]) {
  const body = rows.map((r) => r.map(csvEscape).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const fmtDate = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

export function OrdersView() {
  const [from, setFrom] = useState(() => daysAgo(30));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [states, setStates] = useState<OrderState[]>(DEFAULT_STATES);
  const [orders, setOrders] = useState<KaspiOrder[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"orders" | "clients">("orders");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");

  const clients = useMemo(() => (orders ? groupClients(orders) : []), [orders]);

  const visibleOrders = useMemo(() => {
    if (!orders) return [];
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    const digits = q.replace(/\D/g, "");
    return orders.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        (digits.length >= 3 && o.phone.includes(digits)),
    );
  }, [orders, query]);

  const visibleClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const digits = q.replace(/\D/g, "");
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)),
    );
  }, [clients, query]);

  const maskedCount = orders?.filter((o) => o.masked).length ?? 0;

  function toggleState(s: OrderState) {
    setStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Браузер не дал скопировать. Выделите номер вручную.");
    }
  }

  async function load() {
    if (!states.length) {
      setError("Выберите хотя бы один статус заказа.");
      return;
    }
    setLoading(true);
    setError("");
    setWarnings([]);
    try {
      const qs = new URLSearchParams({ from, to, states: states.join(",") });
      const res = await fetch(`/api/kaspi/orders?${qs}`, { cache: "no-store" });
      const json = (await res.json()) as {
        orders?: KaspiOrder[];
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `Ошибка ${res.status}`);
      setOrders(json.orders ?? []);
      setWarnings(json.warnings ?? []);
    } catch (e) {
      setError((e as Error).message);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="orders">
      <div className="orders-controls">
        <label className="orders-field">
          <span>С</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="orders-field">
          <span>По</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="orders-load" onClick={load} disabled={loading}>
          {loading ? "Загружаю…" : "Загрузить"}
        </button>
      </div>

      <div className="orders-chips">
        {ORDER_STATES.map((s) => (
          <button
            key={s}
            className={`orders-chip${states.includes(s) ? " active" : ""}`}
            onClick={() => toggleState(s)}
            type="button"
          >
            {STATE_LABELS[s]}
          </button>
        ))}
      </div>

      {loading && (
        <p className="orders-note">
          Kaspi отдаёт максимум 100 заказов за запрос и не больше 14 дней за раз, поэтому период
          идёт окнами. За месяц это обычно 10–30 секунд.
        </p>
      )}
      {error && <p className="orders-error">{error}</p>}

      {orders && (
        <>
          <div className="orders-summary">
            <div>
              <b>{orders.length}</b> заказов
            </div>
            <div>
              <b>{clients.length}</b> уникальных покупателей
            </div>
            {maskedCount > 0 && (
              <div className="muted">
                у <b>{maskedCount}</b> номер скрыт Kaspi
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <details className="orders-warnings">
              <summary>Часть окон не загрузилась ({warnings.length})</summary>
              <ul>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="orders-toolbar">
            <div className="orders-tabs">
              <button
                className={tab === "orders" ? "active" : ""}
                onClick={() => setTab("orders")}
                type="button"
              >
                Заказы
              </button>
              <button
                className={tab === "clients" ? "active" : ""}
                onClick={() => setTab("clients")}
                type="button"
              >
                Покупатели
              </button>
            </div>
            <input
              className="orders-search"
              placeholder="Поиск: имя, номер, код заказа, город"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="orders-action"
              onClick={() => copy(clients.map((c) => c.phone).join("\n"), "all")}
              disabled={!clients.length}
            >
              {copied === "all" ? "Скопировано" : "Все номера"}
            </button>
            <button
              type="button"
              className="orders-action"
              disabled={!orders.length}
              onClick={() =>
                tab === "orders"
                  ? downloadCsv(`avron-zakazy-${from}_${to}.csv`, [
                      ["Дата", "Код", "Статус", "Покупатель", "Телефон", "Сумма", "Город", "Адрес"],
                      ...visibleOrders.map((o) => [
                        fmtDate(o.date),
                        o.code,
                        o.state,
                        o.name,
                        o.phone || "скрыт",
                        o.total,
                        o.city,
                        o.address,
                      ]),
                    ])
                  : downloadCsv(`avron-pokupateli-${from}_${to}.csv`, [
                      ["Покупатель", "Телефон", "Заказов", "Сумма", "Последний заказ"],
                      ...visibleClients.map((c) => [
                        c.name,
                        c.phone,
                        c.orders,
                        c.total,
                        fmtDate(c.lastDate),
                      ]),
                    ])
              }
            >
              Выгрузить CSV
            </button>
          </div>

          <div className="orders-table-wrap">
            {tab === "orders" ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Телефон</th>
                    <th>Покупатель</th>
                    <th>Дата</th>
                    <th>Код</th>
                    <th>Сумма</th>
                    <th>Город</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.phone ? (
                          <span className="phone-cell">
                            <button
                              type="button"
                              className="phone"
                              onClick={() => copy(o.phone, o.id)}
                              title="Скопировать"
                            >
                              {copied === o.id ? "Скопировано" : o.phonePretty}
                            </button>
                            <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noopener noreferrer">
                              WA
                            </a>
                            <a href={`tel:+${o.phone}`}>Звонок</a>
                          </span>
                        ) : (
                          <span className="phone-masked">скрыт Kaspi</span>
                        )}
                      </td>
                      <td>{o.name}</td>
                      <td>{fmtDate(o.date)}</td>
                      <td className="mono">{o.code}</td>
                      <td>{formatPrice(o.total)}</td>
                      <td>{o.city || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Телефон</th>
                    <th>Покупатель</th>
                    <th>Заказов</th>
                    <th>Сумма</th>
                    <th>Последний</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.map((c) => (
                    <tr key={c.phone}>
                      <td>
                        <span className="phone-cell">
                          <button
                            type="button"
                            className="phone"
                            onClick={() => copy(c.phone, c.phone)}
                            title="Скопировать"
                          >
                            {copied === c.phone ? "Скопировано" : c.phonePretty}
                          </button>
                          <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer">
                            WA
                          </a>
                          <a href={`tel:+${c.phone}`}>Звонок</a>
                        </span>
                      </td>
                      <td>{c.name}</td>
                      <td>
                        {c.orders}
                        {c.orders > 1 && <span className="repeat"> повторный</span>}
                      </td>
                      <td>{formatPrice(c.total)}</td>
                      <td>{fmtDate(c.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!visibleOrders.length && !visibleClients.length && (
            <p className="orders-note">Ничего не найдено — попробуйте другой период или запрос.</p>
          )}
        </>
      )}
    </div>
  );
}
