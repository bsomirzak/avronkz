/**
 * Уведомление владельцу о новом заказе с сайта — чтобы не заглядывать
 * в /orders/site вручную. Два канала, каждый включается своими переменными:
 *
 *  - Telegram: TELEGRAM_BOT_TOKEN (от @BotFather) + TELEGRAM_CHAT_ID (ваш id,
 *    например из @userinfobot; боту нужно один раз написать /start).
 *    Самый надёжный вариант — приходит всегда и сразу.
 *  - WhatsApp: OWNER_WHATSAPP + токены Cloud API, которые уже стоят у бота.
 *    Meta доставляет обычный текст, только если владелец писал боту за
 *    последние 24 часа, поэтому этот канал — дополнительный.
 *
 * Вызывается после сохранения заказа из `after()`, ответ покупателю не ждёт.
 */
import { formatPrice } from "@/lib/products";
import { PAYMENT_METHODS } from "@/lib/order-options";
import { SITE } from "@/lib/site";
import { orderTotal, prettyPhone, type SiteOrder } from "@/lib/site-orders";
import { sendText } from "@/lib/whatsapp";

export function orderNotificationText(order: SiteOrder): string {
  const total = orderTotal(order);
  const lines = [
    `🛒 Новый заказ №${order.id} на сайте`,
    "",
    `${order.productName} × ${order.qty}`,
    `Сумма: ${total === null ? "цена по запросу" : formatPrice(total)}`,
    `Оплата: ${PAYMENT_METHODS[order.payment]}`,
    ...(order.company ? [`Компания: ${order.company}${order.bin ? `, БИН ${order.bin}` : ""}`] : []),
    "",
    `${order.name}, ${order.city}`,
    `${prettyPhone(order.phone)} · wa.me/${order.phone}`,
    ...(order.comment ? ["", `Комментарий: ${order.comment}`] : []),
    "",
    `${SITE.url}/orders/site`,
  ];
  return lines.join("\n");
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Telegram ${res.status}: ${detail.slice(0, 300)}`);
  }
}

async function sendWhatsApp(text: string): Promise<void> {
  const owner = process.env.OWNER_WHATSAPP;
  if (!owner || !process.env.WHATSAPP_TOKEN) return;
  await sendText(owner, text);
}

/** Шлёт во все настроенные каналы; сбой одного не мешает другому и не ломает заказ. */
export async function notifyNewOrder(order: SiteOrder): Promise<void> {
  const text = orderNotificationText(order);
  const results = await Promise.allSettled([sendTelegram(text), sendWhatsApp(text)]);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[order] не смогли уведомить владельца (${i === 0 ? "telegram" : "whatsapp"})`, r.reason);
    }
  });
}
