/**
 * Вебхук WhatsApp Cloud API.
 *
 * GET  — разовая проверка адреса при подключении вебхука в кабинете Meta.
 * POST — входящие сообщения: клиентам отвечает Claude, а владельцу магазина
 *        доступен режим менеджера — он пишет боту «77011234567 текст»,
 *        и бот пересылает это клиенту, после чего замолкает в том диалоге.
 *
 * Meta ждёт 200 за несколько секунд и ретраит доставку при таймауте, поэтому
 * ответ модели считается в after() — уже после того, как мы ответили 200.
 */

import { after } from "next/server";
import { answer } from "@/lib/assistant";
import { isManual, saveMessage, setManual, MANUAL_TTL_SEC } from "@/lib/store";
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

  const owner = process.env.OWNER_WHATSAPP;
  if (owner && message.from === owner) {
    await handleManager(message);
    return;
  }

  await saveMessage(message.from, message.name, {
    id: message.id,
    author: "client",
    text: message.text || `[${message.type}]`,
    at: Date.now(),
  });

  // Бота можно выключить на время, не трогая деплой: тогда просто зовём владельца.
  if (process.env.WHATSAPP_BOT_ENABLED === "0") {
    await notifyOwner(message, "бот выключен");
    return;
  }

  // Клиента ведёт живой менеджер — не перебиваем, только пересылаем сообщение.
  if (await isManual(message.from)) {
    await notifyOwner(message, "вы отвечаете этому клиенту");
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

  const { reply, escalate } = await answer(message.from, message.name);
  await sendText(message.from, reply);
  await saveMessage(message.from, message.name, {
    id: `bot-${message.id}`,
    author: "bot",
    text: reply,
    at: Date.now(),
  });
  if (escalate) await notifyOwner(message, "нужен менеджер");
}

/** `77011234567 текст` — переслать клиенту; `бот 77011234567` — вернуть бота. */
const REPLY_RE = /^\+?(\d{10,15})[\s,:-]+([\s\S]+)$/;
const RESUME_RE = /^(?:бот|bot)\s+\+?(\d{10,15})\s*$/i;

async function handleManager(message: IncomingMessage): Promise<void> {
  const text = message.text.trim();

  const resume = text.match(RESUME_RE);
  if (resume) {
    await setManual(resume[1], false);
    await sendText(message.from, `Готово — бот снова отвечает клиенту +${resume[1]}.`);
    return;
  }

  const reply = text.match(REPLY_RE);
  if (!reply) {
    await sendText(
      message.from,
      "Чтобы ответить клиенту, начните сообщение с его номера:\n" +
        "77011234567 Здравствуйте, это Бексултан\n\n" +
        "Вернуть бота в диалог: бот 77011234567",
    );
    return;
  }

  const [, clientPhone, body] = reply;
  try {
    await sendText(clientPhone, body.trim());
  } catch (e) {
    // Чаще всего это закрытое 24-часовое окно — владелец должен об этом узнать,
    // иначе он будет думать, что клиент получил ответ.
    console.error("[whatsapp] не смогли передать ответ клиенту", clientPhone, e);
    await sendText(
      message.from,
      `Не смог отправить сообщение клиенту +${clientPhone}. Скорее всего прошло больше 24 часов ` +
        `с его последнего сообщения — WhatsApp запрещает писать первым без шаблона.`,
    ).catch(() => {});
    return;
  }
  await saveMessage(clientPhone, "", {
    id: `mgr-${message.id}`,
    author: "manager",
    text: body.trim(),
    at: Date.now(),
  });
  await setManual(clientPhone, true);
  await sendText(
    message.from,
    `Отправил клиенту +${clientPhone}. Бот не будет вмешиваться ${MANUAL_TTL_SEC / 3600} часа — ` +
      `чтобы вернуть его раньше, напишите: бот ${clientPhone}`,
  );
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
  await sendText(
    owner,
    `❗️ ${reason}\nКлиент: ${who}\nСообщение: ${text}\n\nОтветить: ${message.from} ваш текст`,
  ).catch((e) => console.error("[whatsapp] не смогли уведомить владельца", e));
}
