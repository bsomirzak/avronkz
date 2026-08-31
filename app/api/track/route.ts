/**
 * Приём кликов с сайта. Эндпоинт публичный — его дёргает браузер посетителя,
 * поэтому принимаем только известные события и ничего лишнего не храним:
 * ни IP, ни идентификаторов пользователя.
 */

import { isTracked, recordClick } from "@/lib/stats";

export async function POST(request: Request) {
  let body: { event?: unknown; product?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!isTracked(body.event)) return new Response(null, { status: 204 });

  // id товара — короткий слаг из каталога; длинное и постороннее отбрасываем.
  const product =
    typeof body.product === "string" && /^[a-z0-9-]{1,48}$/.test(body.product)
      ? body.product
      : undefined;

  try {
    await recordClick(body.event, product);
  } catch (e) {
    console.error("[track] не смогли записать клик", e);
  }
  // Ответ посетителю не важен — он уже ушёл по ссылке.
  return new Response(null, { status: 204 });
}
