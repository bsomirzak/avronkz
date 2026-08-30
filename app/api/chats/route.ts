/**
 * Диалоги для страницы /chats: список переписок, история одного клиента
 * и отправка ответа от лица магазина.
 *
 * Раздел закрыт Basic Auth в proxy.ts — здесь переписка и телефоны клиентов.
 */

import { history, isManual, listChats, persistent, ping, saveMessage, setManual } from "@/lib/store";
import { sendText } from "@/lib/whatsapp";

export const maxDuration = 30;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const phone = params.get("phone");

  // /api/chats?ping=1 — быстрый ответ на вопрос «а база вообще пишется?».
  if (params.has("ping")) {
    return Response.json({ persistent, storage: await ping() });
  }

  try {
    if (!phone) return Response.json({ chats: await listChats() });
    const [messages, manual] = await Promise.all([history(phone), isManual(phone)]);
    return Response.json({ messages, manual });
  } catch (e) {
    console.error("[chats] не смогли прочитать диалоги", e);
    return Response.json({ error: "Не удалось загрузить переписку." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let body: { phone?: string; text?: string; action?: "resume" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const phone = body.phone?.replace(/\D/g, "");
  if (!phone) return Response.json({ error: "Не указан номер клиента." }, { status: 400 });

  // «Вернуть бота» — снимаем ручной режим и ничего не отправляем.
  if (body.action === "resume") {
    await setManual(phone, false);
    return Response.json({ ok: true, manual: false });
  }

  const text = body.text?.trim();
  if (!text) return Response.json({ error: "Пустое сообщение." }, { status: 400 });

  try {
    await sendText(phone, text);
  } catch (e) {
    console.error("[chats] не смогли отправить", phone, e);
    const detail = (e as Error).message;
    // 24-часовое окно закрылось — самая частая причина отказа, скажем об этом прямо.
    return Response.json(
      {
        error: detail.includes("131047")
          ? "Прошло больше 24 часов с последнего сообщения клиента — WhatsApp запрещает писать первым без шаблона."
          : "WhatsApp не принял сообщение. Подробности в логах.",
      },
      { status: 502 },
    );
  }

  const message = { id: `web-${Date.now()}`, author: "manager" as const, text, at: Date.now() };
  await saveMessage(phone, "", message);
  await setManual(phone, true);
  return Response.json({ ok: true, message, manual: true });
}
