/**
 * Разовая регистрация вебхука Telegram-бота: открыть в браузере
 * (закрыто паролем раздела /orders через proxy.ts). Повторный вызов безопасен.
 */
import { ensureWebhook, listSubscribers, listPending } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const webhook = await ensureWebhook(true);
    return Response.json({ webhook, subscribers: await listSubscribers(), pending: await listPending() });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
