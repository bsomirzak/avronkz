/**
 * Вебхук WhatsApp Cloud API.
 *
 * GET  — разовая проверка адреса при подключении вебхука в кабинете Meta.
 * POST — входящие сообщения клиентов: отвечает Claude, менеджера зовём только
 *        когда он действительно нужен.
 *
 * Meta ждёт 200 за несколько секунд и ретраит доставку при таймауте, поэтому
 * ответ модели считается в after() — уже после того, как мы ответили 200.
 */

import { after } from "next/server";
import { answer } from "@/lib/assistant";
import { markRead, parseIncoming, sendText, verifySignature, type IncomingMessage } from "@/lib/whatsapp";

// Ответ модели плюс отправка — держим запас, дефолтных 10 секунд мало.
export const maxDuration = 60;

/** Обработанные wamid: Meta повторяет доставку, а клиент не должен получить дубль. */
const handled = new Map<string, number>();
const HANDLED_TTL_MS = 60 * 60 * 1000;

function alreadyHandled(id: string): boolean {
  const now = Date.now();
  for (const [key, at] of handled) {
    if (now - at > HANDLED_TTL_MS) handled.delete(key);
  }
  if (handled.has(id)) return true;
  handled.set(id, now);
  return false;
}

/** Подключение вебхука: Meta дёргает адрес с hub.challenge и ждёт его обратно. */
export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return new Response("WHATSAPP_VERIFY_TOKEN не задан", { status: 500 });
  }

  const q = new URL(request.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === verifyToken) {
    return new Response(q.get("hub.challenge") ?? "", {
      headers: { "content-type": "text/plain" },
    });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(request: Request) {
  // Подпись считается по «сырому» телу — читаем текстом, не request.json().
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const messages = parseIncoming(payload).filter((m) => !alreadyHandled(m.id));
  if (messages.length) {
    after(async () => {
      for (const message of messages) {
        try {
          await handle(message);
        } catch (e) {
          console.error("[whatsapp] не смогли ответить", message.from, e);
        }
      }
    });
  }

  return new Response("ok");
}

async function handle(message: IncomingMessage): Promise<void> {
  await markRead(message.id).catch(() => {});

  // Бота можно выключить на время, не трогая деплой: тогда просто зовём владельца.
  if (process.env.WHATSAPP_BOT_ENABLED === "0") {
    await notifyOwner(message, "бот выключен");
    return;
  }

  if (message.type !== "text" || !message.text.trim()) {
    await sendText(
      message.from,
      "Спасибо! Я читаю только текст — напишите вопрос словами, а голосовые и файлы посмотрит менеджер.",
    );
    await notifyOwner(message, `прислал ${message.type}`);
    return;
  }

  const { reply, escalate } = await answer(message.from, message.name, message.text);
  await sendText(message.from, reply);
  if (escalate) await notifyOwner(message, "нужен менеджер");
}

/**
 * Сообщение владельцу. Дойдёт, только если он писал боту в последние 24 часа —
 * таково правило Meta для свободных сообщений, поэтому ошибку просто логируем.
 */
async function notifyOwner(message: IncomingMessage, reason: string): Promise<void> {
  const owner = process.env.OWNER_WHATSAPP;
  if (!owner) return;

  const who = message.name ? `${message.name} (+${message.from})` : `+${message.from}`;
  const text = message.text || `[${message.type}]`;
  await sendText(owner, `❗️ ${reason}\nКлиент: ${who}\nСообщение: ${text}`).catch((e) =>
    console.error("[whatsapp] не смогли уведомить владельца", e),
  );
}
