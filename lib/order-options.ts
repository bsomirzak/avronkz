/**
 * Варианты формы заказа на сайте. Отдельный модуль без серверного кода: список
 * нужен и форме в браузере, и API, и странице заказов (как lib/events.ts).
 */

export const PAYMENT_METHODS = {
  cash: "Наличные",
  transfer: "Перевод на карту / Kaspi Gold",
  kaspi_qr: "Kaspi QR",
  invoice: "Счёт для компании (безнал)",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && Object.hasOwn(PAYMENT_METHODS, value);
}

/** «+7 777 123 45 67», «87771234567», «7771234567» → «77771234567»; иначе null. */
export function normalizeKzPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  return /^7\d{10}$/.test(digits) ? digits : null;
}

export const MAX_QTY = 99;
