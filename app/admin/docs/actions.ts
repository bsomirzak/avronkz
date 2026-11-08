"use server";

/**
 * Серверные действия модуля документов. Страницы /admin/* закрыты паролем в
 * proxy.ts, действия вызываются с этих страниц — POST идёт на тот же адрес.
 */

import { revalidatePath } from "next/cache";
import { deriveFrom, duplicate, reissue } from "@/lib/docs/derive";
import {
  deleteBuyer,
  deleteDoc,
  findDuplicates,
  getDoc,
  nextNumber,
  saveBuyer,
  saveDoc,
  saveProducts,
  saveSellers,
  saveSettings,
  setCounter,
} from "@/lib/docs/store";
import { todayIso } from "@/lib/docs/totals";
import type { Buyer, CatalogItem, Doc, DocStatus, DocType, Seller, Settings } from "@/lib/docs/types";

function touch() {
  revalidatePath("/admin/docs", "layout");
}

export async function saveDocAction(doc: Doc, saveBuyerToo: boolean): Promise<{ ok: true; doc: Doc; duplicates: string[] } | { ok: false; error: string }> {
  if (!doc.number.trim()) return { ok: false, error: "Укажите номер документа" };
  if (!doc.items.length) return { ok: false, error: "Добавьте хотя бы одну позицию" };
  let buyer = doc.buyer;
  if (saveBuyerToo && buyer.name.trim()) {
    buyer = await saveBuyer({ ...buyer, id: buyer.id || `b${Date.now().toString(36)}` });
  }
  const saved = await saveDoc({ ...doc, buyer });
  const dups = await findDuplicates(saved);
  touch();
  return { ok: true, doc: saved, duplicates: dups.map((d) => d.id) };
}

export async function checkNumberAction(doc: Pick<Doc, "id" | "sellerId" | "type" | "number">): Promise<number> {
  return (await findDuplicates(doc)).length;
}

export async function nextNumberAction(sellerId: string, type: DocType): Promise<string> {
  return nextNumber(sellerId, type);
}

export async function deleteDocAction(id: string): Promise<void> {
  await deleteDoc(id);
  touch();
}

export async function setStatusAction(id: string, status: DocStatus): Promise<void> {
  const d = await getDoc(id);
  if (!d) return;
  await saveDoc({ ...d, status });
  touch();
}

/** Накладная / талон / КП из документа, перевыпуск, дубль — сразу сохраняются черновиком. */
export async function deriveAction(id: string, kind: DocType | "reissue" | "duplicate"): Promise<{ id: string } | { error: string }> {
  const src = await getDoc(id);
  if (!src) return { error: "Документ не найден" };
  const date = todayIso();
  let d: Doc;
  if (kind === "reissue") d = reissue(src, { number: await nextNumber(src.sellerId, src.type), date });
  else if (kind === "duplicate") d = duplicate(src, { number: await nextNumber(src.sellerId, src.type), date });
  else {
    // Номер накладной по умолчанию = номер счёта; если уже занят — следующий свободный.
    const want = kind === "waybill" || kind === "warranty" ? src.number : await nextNumber(src.sellerId, kind);
    const busy = (await findDuplicates({ id: "", sellerId: src.sellerId, type: kind, number: want })).length > 0;
    d = deriveFrom(src, kind, { number: busy ? await nextNumber(src.sellerId, kind) : want, date });
  }
  await saveDoc(d);
  touch();
  return { id: d.id };
}

export async function saveBuyerAction(b: Buyer): Promise<Buyer> {
  const saved = await saveBuyer({ ...b, id: b.id || `b${Date.now().toString(36)}` });
  touch();
  return saved;
}

export async function deleteBuyerAction(id: string): Promise<void> {
  await deleteBuyer(id);
  touch();
}

export async function saveProductsAction(list: CatalogItem[]): Promise<void> {
  await saveProducts(list);
  touch();
}

export async function saveSellersAction(list: Seller[]): Promise<void> {
  await saveSellers(list);
  touch();
}

export async function saveSettingsAction(s: Settings): Promise<void> {
  await saveSettings(s);
  touch();
}

export async function setCounterAction(sellerId: string, type: DocType, value: number): Promise<void> {
  await setCounter(sellerId, type, Math.max(0, Math.floor(value)));
  touch();
}
