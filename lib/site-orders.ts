/**
 * Заказы, оформленные на самом сайте (кнопка «Заказать» на странице товара).
 *
 * Merchant Center требует, чтобы товар покупался в нашем магазине по цене со
 * страницы, а не только через Kaspi. Заказ ложится списком в тот же Upstash
 * Redis, что цены и /chats, и виден на /orders/site (закрыт паролем, proxy.ts);
 * покупатель после отправки может продублировать его нам в WhatsApp.
 */
import { pipeline, redis } from "@/lib/redis";
import { formatPrice } from "@/lib/products";
import { SITE } from "@/lib/site";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/order-options";

const KEY = "site:orders";
/** Хвост длиннее этого обрезаем — заказы не должны копиться вечно. */
const KEEP = 1000;

export type SiteOrder = {
  id: string;
  createdAt: number;
  productId: string;
  productName: string;
  /** Цена за штуку на момент заказа, с сервера; null — «цена по запросу». */
  price: number | null;
  qty: number;
  name: string;
  /** 7XXXXXXXXXX */
  phone: string;
  city: string;
  payment: PaymentMethod;
  company?: string;
  bin?: string;
  comment?: string;
};

/** Короткий номер для разговора с покупателем: «Заказ №K7Q2XA». */
export function newOrderId(): string {
  const time = Date.now().toString(36).slice(-4);
  const rand = Math.floor(Math.random() * 36 ** 2).toString(36).padStart(2, "0");
  return `${time}${rand}`.toUpperCase();
}

export async function saveOrder(order: SiteOrder): Promise<boolean> {
  const res = await pipeline([
    ["LPUSH", KEY, JSON.stringify(order)],
    ["LTRIM", KEY, 0, KEEP - 1],
  ]);
  return res !== null;
}

export async function listOrders(limit = 200): Promise<SiteOrder[] | null> {
  const raw = await redis<string[]>(["LRANGE", KEY, 0, limit - 1]);
  if (!raw) return null;
  return raw.flatMap((item) => {
    try {
      return [JSON.parse(item) as SiteOrder];
    } catch {
      return [];
    }
  });
}

export function prettyPhone(phone: string): string {
  return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
}

export function orderTotal(order: SiteOrder): number | null {
  return order.price === null ? null : order.price * order.qty;
}

/** Текст, с которым покупатель открывает WhatsApp магазина. */
export function orderWhatsAppUrl(order: SiteOrder): string {
  const total = orderTotal(order);
  const lines = [
    `Здравствуйте! Заказ №${order.id} с сайта avron.kz`,
    `Товар: ${order.productName} × ${order.qty}`,
    `Сумма: ${total === null ? "цена по запросу" : formatPrice(total)}`,
    `Имя: ${order.name}`,
    `Телефон: ${prettyPhone(order.phone)}`,
    `Город: ${order.city}`,
    `Оплата: ${PAYMENT_METHODS[order.payment]}`,
    ...(order.company ? [`Компания: ${order.company}${order.bin ? `, БИН ${order.bin}` : ""}`] : []),
    ...(order.comment ? [`Комментарий: ${order.comment}`] : []),
  ];
  return `https://wa.me/${SITE.phoneRaw.replace(/\D/g, "")}?text=${encodeURIComponent(lines.join("\n"))}`;
}
