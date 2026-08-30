/**
 * Хранилище переписки с клиентами.
 *
 * Если заданы KV_REST_API_URL и KV_REST_API_TOKEN (Vercel Marketplace → Upstash
 * Redis, бесплатного тарифа хватает с запасом) — диалоги переживают перезапуск
 * и видны на /chats. Без них всё работает как раньше: память процесса, короткая
 * жизнь, зато без внешних сервисов.
 */

export type Author = "client" | "bot" | "manager";

export type StoredMessage = {
  /** wamid входящего или исходящего сообщения; для служебных — произвольный id. */
  id: string;
  author: Author;
  text: string;
  at: number;
};

export type ChatSummary = {
  phone: string;
  name: string;
  /** Последнее сообщение — что показать в списке диалогов. */
  last: string;
  lastAuthor: Author;
  updated: number;
  /** Отвечает ли сейчас человек (бот молчит). */
  manual: boolean;
};

/** Сколько сообщений держим в одном диалоге. */
const HISTORY_LIMIT = 60;
/** Сколько диалогов показываем в списке. */
const CHATS_LIMIT = 100;
/** Через сколько молчания менеджера бот снова вступает в разговор. */
export const MANUAL_TTL_SEC = 2 * 60 * 60;

// Vercel Marketplace отдаёт переменные то как KV_*, то как UPSTASH_* — берём любые.
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const persistent = Boolean(KV_URL && KV_TOKEN);

/** Один запрос к Upstash REST: команда Redis приходит массивом. */
async function redis<T>(command: (string | number)[]): Promise<T | null> {
  if (!persistent) return null;
  const res = await fetch(KV_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[store] redis", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  return ((await res.json()) as { result: T }).result;
}

// ── Память процесса: и запасной вариант, и кэш на время запроса ──────────────

type MemoryChat = { name: string; messages: StoredMessage[]; updated: number; manualUntil: number };
const memory = new Map<string, MemoryChat>();

function memoryChat(phone: string): MemoryChat {
  let chat = memory.get(phone);
  if (!chat) {
    chat = { name: "", messages: [], updated: Date.now(), manualUntil: 0 };
    memory.set(phone, chat);
  }
  return chat;
}

// ── Публичное API ───────────────────────────────────────────────────────────

export async function saveMessage(
  phone: string,
  name: string,
  message: StoredMessage,
): Promise<void> {
  const chat = memoryChat(phone);
  if (name) chat.name = name;
  chat.messages.push(message);
  chat.messages = chat.messages.slice(-HISTORY_LIMIT);
  chat.updated = message.at;

  if (!persistent) return;
  await Promise.all([
    redis(["RPUSH", `wa:msg:${phone}`, JSON.stringify(message)]),
    redis(["LTRIM", `wa:msg:${phone}`, -HISTORY_LIMIT, -1]),
    redis(["ZADD", "wa:chats", message.at, phone]),
    name ? redis(["SET", `wa:name:${phone}`, name]) : Promise.resolve(null),
  ]);
}

export async function history(phone: string): Promise<StoredMessage[]> {
  if (!persistent) return memoryChat(phone).messages;

  const raw = await redis<string[]>(["LRANGE", `wa:msg:${phone}`, -HISTORY_LIMIT, -1]);
  if (!raw) return memoryChat(phone).messages;
  return raw.flatMap((item) => {
    try {
      return [JSON.parse(item) as StoredMessage];
    } catch {
      return [];
    }
  });
}

/** Клиент общается с живым менеджером — бот в разговор не лезет. */
export async function setManual(phone: string, on: boolean): Promise<void> {
  const chat = memoryChat(phone);
  chat.manualUntil = on ? Date.now() + MANUAL_TTL_SEC * 1000 : 0;

  if (!persistent) return;
  await (on
    ? redis(["SET", `wa:manual:${phone}`, "1", "EX", MANUAL_TTL_SEC])
    : redis(["DEL", `wa:manual:${phone}`]));
}

export async function isManual(phone: string): Promise<boolean> {
  if (!persistent) return memoryChat(phone).manualUntil > Date.now();
  return (await redis<string | null>(["GET", `wa:manual:${phone}`])) === "1";
}

/** Самопроверка: записывает и читает ключ, чтобы видеть, жива ли база. */
export async function ping(): Promise<"ok" | "unavailable" | "off"> {
  if (!persistent) return "off";
  const key = `wa:ping:${Date.now()}`;
  await redis(["SET", key, "ok", "EX", 60]);
  return (await redis<string | null>(["GET", key])) === "ok" ? "ok" : "unavailable";
}

export async function listChats(): Promise<ChatSummary[]> {
  if (!persistent) {
    const chats = [...memory.entries()]
      .filter(([, chat]) => chat.messages.length)
      .sort((a, b) => b[1].updated - a[1].updated)
      .slice(0, CHATS_LIMIT);
    return chats.map(([phone, chat]) => {
      const last = chat.messages[chat.messages.length - 1];
      return {
        phone,
        name: chat.name,
        last: last.text,
        lastAuthor: last.author,
        updated: chat.updated,
        manual: chat.manualUntil > Date.now(),
      };
    });
  }

  const phones = (await redis<string[]>(["ZRANGE", "wa:chats", 0, CHATS_LIMIT - 1, "REV"])) ?? [];
  const summaries = await Promise.all(
    phones.map(async (phone) => {
      const [tail, name, manual] = await Promise.all([
        redis<string[]>(["LRANGE", `wa:msg:${phone}`, -1, -1]),
        redis<string | null>(["GET", `wa:name:${phone}`]),
        redis<string | null>(["GET", `wa:manual:${phone}`]),
      ]);
      let last: StoredMessage | null = null;
      try {
        last = tail?.[0] ? (JSON.parse(tail[0]) as StoredMessage) : null;
      } catch {
        last = null;
      }
      if (!last) return null;
      return {
        phone,
        name: name ?? "",
        last: last.text,
        lastAuthor: last.author,
        updated: last.at,
        manual: manual === "1",
      } satisfies ChatSummary;
    }),
  );
  return summaries.filter((chat): chat is ChatSummary => chat !== null);
}
