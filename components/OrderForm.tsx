"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import { MAX_QTY, PAYMENT_METHODS, type PaymentMethod } from "@/lib/order-options";

type Props = {
  productId: string;
  productName: string;
  /** Уже отформатированная цена со страницы — только для показа. */
  priceText: string;
  price: number | null;
};

type Result = { id: string; whatsappUrl: string };

/** Кнопка «Заказать» и форма под ней: заказ по цене сайта, без Kaspi. */
export function OrderForm({ productId, productName, priceText, price }: Props) {
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, productId, payment }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok || !body.id || !body.whatsappUrl) {
        setError(body.error ?? "Не получилось отправить заказ. Позвоните или напишите нам в WhatsApp.");
        return;
      }
      setResult({ id: body.id, whatsappUrl: body.whatsappUrl });
      track("order_submit", {
        product: productId,
        payment,
        ...(price !== null ? { value: price * Number(data.qty || 1) } : {}),
      });
    } catch {
      setError("Нет связи с сервером. Позвоните или напишите нам в WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="order-done" role="status">
        <b>Заказ №{result.id} принят</b>
        <p>
          Менеджер свяжется с вами, чтобы подтвердить заказ, доставку и оплату. Чтобы быстрее,
          отправьте заказ нам в WhatsApp — текст уже готов.
        </p>
        <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-order">
          Отправить в WhatsApp
        </a>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-order" onClick={() => setOpen(true)}>
        Заказать
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <form className="order-form" onSubmit={submit}>
      <div className="order-form-head">
        <b>Заказ: {productName}</b>
        <span>{priceText} — цена при заказе на сайте</span>
      </div>

      <label className="order-field">
        <span>Имя</span>
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label className="order-field">
        <span>Телефон</span>
        <input name="phone" required type="tel" inputMode="tel" placeholder="+7 7XX XXX XX XX" autoComplete="tel" />
      </label>
      <div className="order-row">
        <label className="order-field">
          <span>Город</span>
          <input name="city" required maxLength={80} defaultValue="Алматы" autoComplete="address-level2" />
        </label>
        <label className="order-field order-qty">
          <span>Кол-во</span>
          <input name="qty" type="number" min={1} max={MAX_QTY} defaultValue={1} required />
        </label>
      </div>

      <fieldset className="order-field">
        <legend>Оплата</legend>
        <div className="order-payments">
          {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => (
            <label key={key} className={`order-payment${payment === key ? " active" : ""}`}>
              <input
                type="radio"
                name="payment-choice"
                value={key}
                checked={payment === key}
                onChange={() => setPayment(key)}
              />
              {PAYMENT_METHODS[key]}
            </label>
          ))}
        </div>
      </fieldset>

      {payment === "invoice" && (
        <div className="order-row">
          <label className="order-field">
            <span>Компания</span>
            <input name="company" required maxLength={120} autoComplete="organization" />
          </label>
          <label className="order-field">
            <span>БИН</span>
            <input name="bin" required inputMode="numeric" pattern="\d{12}" maxLength={12} title="12 цифр" />
          </label>
        </div>
      )}

      <label className="order-field">
        <span>Комментарий (необязательно)</span>
        <textarea name="comment" rows={2} maxLength={500} />
      </label>

      {/* Ловушка для ботов: поле спрятано от людей и от экранных дикторов. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="order-trap" aria-hidden="true" />

      {error && <p className="order-error" role="alert">{error}</p>}

      <button type="submit" className="btn-order" disabled={sending}>
        {sending ? "Отправляем…" : "Отправить заказ"}
      </button>
      <p className="order-note">
        Оплата после подтверждения заказа менеджером. Доставка — по{" "}
        <Link href="/dostavka">условиям доставки</Link>.
      </p>
    </form>
  );
}
