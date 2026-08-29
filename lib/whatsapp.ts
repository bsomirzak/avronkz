/**
 * Тонкая обёртка над WhatsApp Cloud API (Graph API).
 *
 * Всё, что связано с транспортом: проверка подписи вебхука, разбор входящих
 * сообщений и отправка ответа. Логика ответов — в lib/assistant.ts.
 *
 * Документация Meta: developers.facebook.com/docs/whatsapp/cloud-api
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = "v23.0";

export type IncomingMessage = {
  /** wamid.* — по нему отсекаем повторы, Meta ретраит доставку при таймауте. */
  id: string;
  /** Номер клиента без плюса: 77011234567. */
  from: string;
  /** Имя из профиля WhatsApp, может отсутствовать. */
  name: string;
  /** text | image | audio | document | … */
  type: string;
  /** Текст сообщения; для нетекстовых типов — пустая строка. */
  text: string;
};

type WebhookValue = {
  messaging_product?: string;
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<{
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
  }>;
  // Статусы доставки («доставлено», «прочитано») приходят сюда же — их игнорируем.
  statuses?: unknown[];
};

/** Достаёт из тела вебхука только сообщения клиентов, без статусов доставки. */
export function parseIncoming(payload: unknown): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = (payload as { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> })?.entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;
      const profileName = value.contacts?.[0]?.profile?.name ?? "";
      for (const msg of value.messages) {
        if (!msg.id || !msg.from) continue;
        out.push({
          id: msg.id,
          from: msg.from,
          name: profileName,
          type: msg.type ?? "unknown",
          text: msg.type === "text" ? (msg.text?.body ?? "") : "",
        });
      }
    }
  }
  return out;
}

/**
 * Подпись вебхука: HMAC-SHA256 от «сырого» тела на секрете приложения.
 * Без неё эндпоинт открыт всему интернету — писать в него сможет кто угодно.
 */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const got = Buffer.from(header.slice(7), "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

async function graph(path: string, body: Record<string, unknown>): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("WHATSAPP_TOKEN или WHATSAPP_PHONE_ID не заданы");

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp API ${res.status}: ${detail.slice(0, 500)}`);
  }
}

/** Отправляет текст клиенту. Работает только внутри 24 часов после его сообщения. */
export async function sendText(to: string, body: string): Promise<void> {
  // Лимит Meta — 4096 символов; режем с запасом, а не получаем ошибку.
  await graph("messages", { to, type: "text", text: { preview_url: false, body: body.slice(0, 4000) } });
}

/** Синяя галочка в чате: клиент видит, что сообщение прочитано. */
export async function markRead(messageId: string): Promise<void> {
  await graph("messages", { status: "read", message_id: messageId });
}
