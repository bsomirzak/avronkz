"use server";

import { revalidatePath } from "next/cache";
import { deleteOrder } from "@/lib/site-orders";

/** Удаление заказа со страницы /orders/site — сама страница закрыта паролем (proxy.ts). */
export async function deleteOrderAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteOrder(id);
  if (ok) revalidatePath("/orders/site");
  return { ok };
}
