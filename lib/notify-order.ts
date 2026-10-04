/**
 * Уведомление владельцу о новом заказе с сайта — чтобы не заглядывать
 * в /orders/site вручную. Два канала, каждый включается своими переменными:
 *
 *  - Telegram: TELEGRAM_BOT_TOKEN (от @BotFather) + TELEGRAM_CHAT_ID (id
 *    владельца). Владелец получает всё, сотрудники подписываются через
 *    самого бота (lib/telegram.ts). Самый надёжный канал.
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
import { broadcast, ensureWebhook } from "@/lib/telegram";
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
  // Вебхук для команд подписки ставится лениво — отдельной настройки не нужно.
  await ensureWebhook().catch((e) => console.error("[telegram] setWebhook", e));
  await broadcast(text);
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
