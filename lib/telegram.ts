/**
 * Telegram-бот «AVRON заказы» (@avron_orders_bot): уведомления о заказах
 * с сайта владельцу и сотрудникам.
 *
 * Переменные: TELEGRAM_BOT_TOKEN (от @BotFather) и TELEGRAM_CHAT_ID — id
 * владельца. Владелец получает всё всегда; остальные подписываются сами:
 * жмут Start у бота, владелец видит запрос и отвечает «/allow <id>».
 * Списки живут в Redis, чтобы не трогать переменные на Vercel ради каждого
 * сотрудника. Вебхук бот ставит себе сам при первом уведомлении (или через
 * /api/telegram/setup), секрет вебхука выводится из токена — отдельной
 * переменной не нужно.
 */
import { createHash } from "node:crypto";
import { pipeline, redis } from "@/lib/redis";
import { SITE } from "@/lib/site";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
export const enabled = Boolean(TOKEN && OWNER_CHAT_ID);

const SUBSCRIBERS = "telegram:subscribers";
const PENDING = "telegram:pending";
const WEBHOOK_MARK = "telegram:webhook";

async function api<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
  if (!res.ok || !data?.ok) {
    throw new Error(`Telegram ${method} ${res.status}: ${data?.description ?? ""}`);
  }
  return data.result as T;
}

export async function sendMessage(chatId: string | number, text: string): Promise<void> {
  await api("sendMessage", { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true });
}

/** Секрет, который Telegram присылает в заголовке каждого вебхука. */
export function webhookSecret(): string {
  return createHash("sha256").update(`webhook:${TOKEN ?? ""}`).digest("hex").slice(0, 48);
}

/** Регистрирует вебхук, если ещё не делали этого для текущего токена и домена. */
export async function ensureWebhook(force = false): Promise<string> {
  if (!enabled) return "выключен";
  const url = `${SITE.url}/api/telegram`;
  const mark = createHash("sha256").update(`${url}:${webhookSecret()}`).digest("hex").slice(0, 16);
  if (!force && (await redis<string>(["GET", WEBHOOK_MARK])) === mark) return "уже стоит";

  await api("setWebhook", {
    url,
    secret_token: webhookSecret(),
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  await redis(["SET", WEBHOOK_MARK, mark]);
  return `поставлен: ${url}`;
}

/* ---------- подписчики ---------- */

function hashToRecord(raw: string[] | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (let i = 0; i + 1 < raw.length; i += 2) out[raw[i]] = raw[i + 1];
  return out;
}

export async function listSubscribers(): Promise<Record<string, string>> {
  return hashToRecord(await redis<string[]>(["HGETALL", SUBSCRIBERS]));
}

export async function listPending(): Promise<Record<string, string>> {
  return hashToRecord(await redis<string[]>(["HGETALL", PENDING]));
}

export async function addPending(chatId: string, name: string): Promise<void> {
  await redis(["HSET", PENDING, chatId, name]);
}

export async function approve(chatId: string): Promise<string | null> {
  const name = await redis<string | null>(["HGET", PENDING, chatId]);
  if (name === null) return null;
  await pipeline([
    ["HSET", SUBSCRIBERS, chatId, name],
    ["HDEL", PENDING, chatId],
  ]);
  return name;
}

export async function remove(chatId: string): Promise<boolean> {
  const res = await pipeline<number>([
    ["HDEL", SUBSCRIBERS, chatId],
    ["HDEL", PENDING, chatId],
  ]);
  return Boolean(res && (res[0] || res[1]));
}

/** Все, кому слать заказы: владелец плюс одобренные сотрудники. */
export async function recipients(): Promise<string[]> {
  const subs = Object.keys(await listSubscribers());
  return [OWNER_CHAT_ID, ...subs.filter((id) => id !== OWNER_CHAT_ID)];
}

/** Шлёт текст всем получателям; ошибки по каждому пишет в лог, не бросает. */
export async function broadcast(text: string): Promise<void> {
  if (!enabled) return;
  const ids = await recipients();
  const results = await Promise.allSettled(ids.map((id) => sendMessage(id, text)));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[telegram] не доставлено ${ids[i]}`, r.reason);
  });
}
