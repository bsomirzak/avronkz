"use client";

/**
 * Таблица цен для /admin. Данные тянем с /api/admin/prices, а не с сервера
 * страницы: после сохранения надо перерисовать строку, не перезагружая раздел.
 */

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/products";

type Item = {
  id: string;
  name: string;
  shortName: string;
  cat: string;
  basePrice: number | null;
  baseOldPrice: number | null;
  price: number | null;
  oldPrice: number | null;
  months: number;
  installment: string;
  updatedAt: number | null;
};

type Payload = { storage: boolean; items: Item[] };

/** Поле ввода терпит пробелы и ₸ — цену часто копируют прямо с Kaspi. */
function parseInput(raw: string): number | null | "bad" {
  const clean = raw.replace(/[\s ₸]/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) return "bad";
  return Math.round(n);
}

const asInput = (value: number | null) => (value === null ? "" : String(value));

const fmtDate = (at: number) =>
  new Date(at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Row({
  item,
  disabled,
  onSaved,
  onError,
}: {
  item: Item;
  disabled: boolean;
  onSaved: (items: Item[]) => void;
  onError: (message: string) => void;
}) {
  const [price, setPrice] = useState(asInput(item.price));
  const [oldPrice, setOldPrice] = useState(asInput(item.oldPrice));
  const [busy, setBusy] = useState(false);

  const parsedPrice = parseInput(price);
  const parsedOld = parseInput(oldPrice);
  const bad = parsedPrice === "bad" || parsedOld === "bad";
  const changed = parsedPrice !== item.price || parsedOld !== item.oldPrice;
  const edited = item.updatedAt !== null;

  // Что увидит покупатель, если нажать «Сохранить».
  const preview =
    typeof parsedPrice === "number"
      ? `${formatPrice(Math.round(parsedPrice / item.months))} × ${item.months} мес`
      : item.installment;
  const discount =
    typeof parsedPrice === "number" && typeof parsedOld === "number" && parsedOld > parsedPrice
      ? `-${Math.round((1 - parsedPrice / parsedOld) * 100)}%`
      : null;

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    onError("");
    try {
      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...body }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить.");
      onSaved((data as Payload).items);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className={edited ? "edited" : undefined}>
      <td>
        <a href={`/products/${item.id}`} target="_blank" rel="noopener noreferrer">
          {item.name}
        </a>
        <span className="admin-cat">{item.cat}</span>
      </td>
      <td className="num admin-base">
        {item.basePrice !== null ? formatPrice(item.basePrice) : "—"}
      </td>
      <td>
        <input
          className={parsedPrice === "bad" ? "admin-input bad" : "admin-input"}
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="цена по запросу"
          aria-label={`Цена: ${item.name}`}
          disabled={disabled || busy}
        />
      </td>
      <td>
        <input
          className={parsedOld === "bad" ? "admin-input bad" : "admin-input"}
          inputMode="numeric"
          value={oldPrice}
          onChange={(e) => setOldPrice(e.target.value)}
          placeholder="нет"
          aria-label={`Старая цена: ${item.name}`}
          disabled={disabled || busy}
        />
      </td>
      <td className="admin-preview">
        {preview}
        {discount && <span className="admin-discount">{discount}</span>}
        {edited && item.updatedAt !== null && (
          <span className="admin-when">изменено {fmtDate(item.updatedAt)}</span>
        )}
      </td>
      <td className="admin-actions">
        <button
          type="button"
          className="admin-btn"
          disabled={disabled || busy || bad || !changed}
          onClick={() =>
            send({
              price: parsedPrice === "bad" ? null : parsedPrice,
              oldPrice: parsedOld === "bad" ? null : parsedOld,
            })
          }
        >
          {busy ? "…" : "Сохранить"}
        </button>
        {edited && (
          <button
            type="button"
            className="admin-btn ghost"
            disabled={disabled || busy}
            onClick={() => send({ reset: true })}
          >
            Вернуть
          </button>
        )}
      </td>
    </tr>
  );
}

export function PricesEditor() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/prices", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Не удалось загрузить цены.");
        if (alive) setData(payload as Payload);
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-empty">Загружаем каталог…</p>;

  return (
    <div className="admin">
      {!data.storage && (
        <p className="admin-warn">
          Хранилище не подключено, поэтому цены править нельзя. Vercel → проект avronkz → Storage →
          Marketplace → Upstash Redis (бесплатного тарифа хватает). После подключения переменные
          KV_REST_API_URL и KV_REST_API_TOKEN появятся сами — останется передеплоить проект.
        </p>
      )}
      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Товар</th>
            <th>В коде</th>
            <th>Цена, ₸</th>
            <th>Старая цена, ₸</th>
            <th>Будет на сайте</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <Row
              // В ключе — сохранённые цены: после записи строка пересоздаётся,
              // и поля показывают то, что реально лежит в хранилище.
              key={`${item.id}:${item.price}:${item.oldPrice}`}
              item={item}
              disabled={!data.storage}
              onSaved={(items) => setData({ storage: true, items })}
              onError={setError}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
