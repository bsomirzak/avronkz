/**
 * Ответы клиентам в WhatsApp: системный промпт из каталога AVRON + вызов Claude.
 *
 * Каталог собирается из lib/products.ts, поэтому цены в чате и на сайте
 * не разъезжаются: правим товар — меняется и ответ бота.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PRODUCTS, formatPrice } from "@/lib/products";
import { SITE } from "@/lib/site";
import { history, type StoredMessage } from "@/lib/store";

const MODEL = "claude-haiku-4-5";

/** Маркер, которым модель просит подключить живого менеджера. */
const ESCALATION_MARK = "[МЕНЕДЖЕР]";

/** Сколько последних реплик показываем модели. */
const HISTORY_LIMIT = 20;

function catalogue(): string {
  return PRODUCTS.map((p) => {
    const price = p.price === null ? (p.priceNote ?? "цена по запросу") : formatPrice(p.price);
    const specs = p.specs.slice(0, 4).map(([k, v]) => `${k}: ${v}`).join("; ");
    return [
      `• ${p.name} (${p.cat})`,
      `  цена: ${price}${p.oldPrice ? `, было ${formatPrice(p.oldPrice)}` : ""}`,
      `  рассрочка: ${p.installment}`,
      specs ? `  характеристики: ${specs}` : null,
      `  страница: ${SITE.url}/products/${p.id}`,
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n");
}

function systemPrompt(): string {
  return `Ты — помощник магазина ${SITE.name} (${SITE.city}, Казахстан). Отвечаешь клиентам в WhatsApp вместо владельца, пока он занят.

О магазине:
- ${SITE.tagline}. Гарантия 12 месяцев, рассрочка Kaspi 0-0-12.
- Адрес: ${SITE.address.street}, ${SITE.address.locality}, ${SITE.address.region}.
- Телефоны: ${SITE.phone}, ${SITE.phoneAlt}. Почта: ${SITE.email}. Работаем ${SITE.hours.toLowerCase()}.
- Сайт: ${SITE.url}. Магазин на Kaspi: ${SITE.social.kaspi}.

Каталог (единственный источник правды о ценах и наличии):
${catalogue()}

Как отвечать:
- Пиши на языке клиента: русский или казахский. Коротко, 2–4 предложения, как живой продавец, без канцелярита и без markdown-разметки — это обычный чат.
- Цены, характеристики и названия бери только из каталога выше. Если товара в каталоге нет или клиент спрашивает про то, чего ты не знаешь, честно скажи, что уточнишь у менеджера.
- Никогда не выдумывай сроки доставки, остатки на складе и технические детали, которых нет в каталоге. Доставка по Алматы и Казахстану есть — точные сроки и стоимость называет менеджер.
- Полезно давать ссылку на страницу товара, когда клиент выбирает.
- Не обещай скидок и не торгуйся, не оформляй заказ сам, не проси у клиента данные карты или документы.

Когда нужен живой человек — добавь в самый конец ответа отдельной строкой ${ESCALATION_MARK} (клиент этой строки не увидит). Это обязательно, если клиент: просит скидку или торгуется, жалуется, говорит о браке, возврате или гарантийном случае, спрашивает про оптовые цены, счёт на юрлицо или доставку в другой город, просит позвать человека, либо ты просто не уверен в ответе. В самом тексте при этом спокойно скажи, что передаёшь вопрос менеджеру и он скоро ответит.

В первом сообщении диалога представься: ты — бот-помощник ${SITE.name}, а менеджер подключится, если понадобится.`;
}

/** Промпт стабилен внутри процесса — считаем один раз, так он лучше кэшируется. */
let cachedSystem: string | null = null;
function system(): string {
  cachedSystem ??= systemPrompt();
  return cachedSystem;
}

/** Переписка из хранилища — в формат, который понимает модель. */
function toMessages(stored: StoredMessage[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const item of stored.slice(-HISTORY_LIMIT)) {
    const role = item.author === "client" ? "user" : "assistant";
    const text = item.author === "manager" ? `[Ответил менеджер] ${item.text}` : item.text;
    // Модель не принимает две реплики одной роли подряд как разные ходы —
    // склеиваем их, иначе диалог рассыпается на обрывки.
    const previous = messages[messages.length - 1];
    if (previous && previous.role === role) {
      previous.content = `${previous.content}\n${text}`;
    } else {
      messages.push({ role, content: text });
    }
  }
  return messages;
}

const client = new Anthropic();

export type Answer = {
  /** Текст для клиента, уже без служебного маркера. */
  reply: string;
  /** Нужно ли дёрнуть владельца. */
  escalate: boolean;
};

/** Ответ, когда модель недоступна: клиента нельзя оставлять в тишине. */
const FALLBACK_REPLY =
  "Спасибо за сообщение! Передал его менеджеру — он ответит вам в ближайшее время.";

export async function answer(phone: string, name: string): Promise<Answer> {
  const messages = toMessages(await history(phone));
  if (!messages.length || messages[0].role !== "user") {
    // Первым ходом всегда должен идти клиент, иначе запрос отклонят.
    messages.unshift({ role: "user", content: "Здравствуйте" });
  }

  let raw: string;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: [
        // Каталог не меняется от запроса к запросу — пусть кэшируется.
        { type: "text", text: system(), cache_control: { type: "ephemeral" } },
        ...(name ? [{ type: "text" as const, text: `Клиента зовут ${name}.` }] : []),
      ],
      messages,
    });

    raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (response.stop_reason === "refusal" || !raw) {
      return { reply: FALLBACK_REPLY, escalate: true };
    }
  } catch (e) {
    console.error("[whatsapp] Claude недоступен", e);
    return { reply: FALLBACK_REPLY, escalate: true };
  }

  const escalate = raw.includes(ESCALATION_MARK);
  const reply = raw.split(ESCALATION_MARK).join("").trim();
  return { reply: reply || FALLBACK_REPLY, escalate };
}
