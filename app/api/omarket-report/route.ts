import { OWNER_CHAT_ID, enabled, sendMessage } from "@/lib/telegram";

/**
 * Отчёт о пересчёте цен Omarket владельцу в @avron_orders_bot.
 *
 * Токен бота живёт только на Vercel, поэтому скрипты с сервера и с мака
 * шлют текст сюда, а не в Telegram напрямую. Ключ — тот же
 * KASPI_REVIEWS_TOKEN, что у cron на claude-vps: отдельная переменная ради
 * отчёта означала бы ещё один ручной шаг на Vercel.
 *
 *   POST text/plain — текст отчёта; длинный режется на сообщения по ~3900 символов.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const CHUNK = 3900;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Режем по строкам, чтобы строка отчёта не разрывалась посередине. */
function chunks(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if (cur && cur.length + line.length + 1 > CHUNK) {
      out.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n${line}` : line.slice(0, CHUNK);
  }
  if (cur) out.push(cur);
  return out;
}

export async function POST(request: Request) {
  const token = process.env.KASPI_REVIEWS_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  if (!token || !header.startsWith("Bearer ") || !safeEqual(header.slice(7), token)) {
    return Response.json({ error: "Неверный ключ." }, { status: 401 });
  }
  if (!enabled) {
    return Response.json({ error: "Telegram-бот не настроен." }, { status: 503 });
  }

  const text = (await request.text()).trim();
  if (!text) return Response.json({ error: "Пустой отчёт." }, { status: 400 });
  if (text.length > MAX_BODY_BYTES) return Response.json({ error: "Слишком длинный отчёт." }, { status: 413 });

  const parts = chunks(text);
  for (const part of parts) await sendMessage(OWNER_CHAT_ID, part);
  return Response.json({ ok: true, messages: parts.length });
}
