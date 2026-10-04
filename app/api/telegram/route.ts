/**
 * Вебхук Telegram-бота «AVRON заказы» — только команды подписки.
 *
 * Сотрудник жмёт Start → сразу получает заказы; владелец (TELEGRAM_CHAT_ID)
 * узнаёт о новом подписчике и может отключить его через /remove <id>,
 * список — /list. Любой подписчик отписывается через /stop.
 * Подлинность запроса проверяем по заголовку с секретом (ставится в setWebhook).
 */
import { after } from "next/server";
import { enabled, listSubscribers, OWNER_CHAT_ID, remove, sendMessage, subscribe, webhookSecret } from "@/lib/telegram";

type Update = {
  message?: {
    text?: string;
    chat?: { id?: number; type?: string };
    from?: { id?: number; first_name?: string; last_name?: string; username?: string };
  };
};

function displayName(from: NonNullable<Update["message"]>["from"]): string {
  const full = [from?.first_name, from?.last_name].filter(Boolean).join(" ");
  return from?.username ? `${full || from.username} (@${from.username})` : full || "без имени";
}

function fmt(list: Record<string, string>): string {
  const rows = Object.entries(list).map(([id, name]) => `• ${name} — ${id}`);
  return rows.length ? rows.join("\n") : "— пусто —";
}

async function handle(update: Update): Promise<void> {
  const msg = update.message;
  const chatId = msg?.chat?.id;
  if (!msg || !chatId || msg.chat?.type !== "private") return;
  const id = String(chatId);
  const text = (msg.text ?? "").trim();
  const [cmd, arg] = text.split(/\s+/, 2);
  const isOwner = id === OWNER_CHAT_ID;

  if (isOwner) {
    if (cmd === "/remove" && arg) {
      const ok = await remove(arg);
      return sendMessage(id, ok ? `Отключил ${arg}.` : `${arg} не было в списке.`);
    }
    if (cmd === "/list") return sendMessage(id, `Получают заказы:\n${fmt(await listSubscribers())}`);
    return sendMessage(
      id,
      "Вы владелец — заказы приходят вам всегда.\n\nКоманды:\n/list — кто получает заказы\n/remove <id> — отключить",
    );
  }

  if (cmd === "/stop") {
    await remove(id);
    return sendMessage(id, "Отписал: заказы больше не приходят. Снова подключиться — /start");
  }

  const subs = await listSubscribers();
  if (subs[id]) return sendMessage(id, "Вы уже получаете заказы с сайта. Отписаться — /stop");

  const name = displayName(msg.from);
  await subscribe(id, name);
  await sendMessage(id, "Подключено: заказы с сайта avron.kz будут приходить сюда. Отписаться — /stop");
  if (OWNER_CHAT_ID) {
    await sendMessage(OWNER_CHAT_ID, `${name} подключился к заказам (id ${id}). Отключить: /remove ${id}`).catch((e) =>
      console.error("[telegram] не уведомили владельца", e),
    );
  }
}

export async function POST(request: Request) {
  if (!enabled) return new Response("telegram off", { status: 503 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return new Response("forbidden", { status: 403 });
  }
  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  // Telegram ждёт быстрый 200 и повторяет доставку при таймауте.
  after(() => handle(update).catch((e) => console.error("[telegram] webhook", e)));
  return new Response("ok");
}
