import { getCatalogProduct } from "@/lib/prices";
import { isPaymentMethod, MAX_QTY, normalizeKzPhone } from "@/lib/order-options";
import { persistent, pipeline } from "@/lib/redis";
import { newOrderId, orderWhatsAppUrl, saveOrder, type SiteOrder } from "@/lib/site-orders";

/**
 * Приём заказа с формы на странице товара. Эндпоинт публичный, поэтому всё
 * проверяем сами: товар и цену берём из каталога, а не из запроса, режем длину
 * полей, отсекаем ботов скрытым полем и ограничиваем частоту с одного адреса.
 */

const RATE_LIMIT = 8;
const RATE_WINDOW_SECONDS = 600;

const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad("Не удалось прочитать заказ.");
  }

  // Скрытое поле: человек его не видит, спам-бот заполняет.
  if (text(body.website, 100)) return Response.json({ ok: true, id: "OK" });

  const product = await getCatalogProduct(text(body.productId, 60));
  if (!product) return bad("Товар не найден.");

  const name = text(body.name, 80);
  const phone = normalizeKzPhone(text(body.phone, 30));
  const city = text(body.city, 80);
  const payment = body.payment;
  const qty = Number(body.qty);
  const comment = text(body.comment, 500);
  const company = text(body.company, 120);
  const bin = text(body.bin, 20).replace(/\D/g, "");

  if (!name) return bad("Укажите имя.");
  if (!phone) return bad("Укажите телефон в формате +7 7XX XXX XX XX.");
  if (!city) return bad("Укажите город.");
  if (!isPaymentMethod(payment)) return bad("Выберите способ оплаты.");
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return bad("Проверьте количество.");
  if (payment === "invoice") {
    if (!company) return bad("Для счёта укажите название компании.");
    if (!/^\d{12}$/.test(bin)) return bad("Для счёта укажите БИН — 12 цифр.");
  }

  if (!persistent) return bad("Приём заказов временно недоступен — напишите нам в WhatsApp.", 503);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateKey = `order-rate:${ip}`;
  const counts = await pipeline<number | string | null>([
    ["SET", rateKey, 0, "EX", RATE_WINDOW_SECONDS, "NX"],
    ["INCR", rateKey],
  ]);
  if (counts && Number(counts[1]) > RATE_LIMIT) {
    return bad("Слишком много заказов подряд. Позвоните или напишите нам в WhatsApp.", 429);
  }

  const order: SiteOrder = {
    id: newOrderId(),
    createdAt: Date.now(),
    productId: product.id,
    productName: product.name,
    price: product.price,
    qty,
    name,
    phone,
    city,
    payment,
    ...(payment === "invoice" ? { company, bin } : {}),
    ...(comment ? { comment } : {}),
  };

  if (!(await saveOrder(order))) {
    return bad("Не получилось сохранить заказ — напишите нам в WhatsApp.", 502);
  }
  return Response.json({ ok: true, id: order.id, whatsappUrl: orderWhatsAppUrl(order) });
}
