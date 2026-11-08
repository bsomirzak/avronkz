/**
 * Документы из документов: накладная и гарантийный талон из счёта,
 * «Перевыпустить» (та же сделка сегодняшним числом), «Дублировать» (похожая
 * сделка для другого покупателя). Чистые функции — номер подставляет вызывающий.
 */

import type { Buyer, Doc, DocType, Line } from "./types.ts";

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyBuyer(): Buyer {
  return {
    id: "", type: "too", name: "", bin: "", address: "", bank: "", bik: "", iik: "", kbe: "", phone: "", email: "",
    headName: "", headPosition: "", headBasis: "", idNumber: "", idIssuer: "", idDate: "",
  };
}

function base(src: Doc, type: DocType, number: string, date: string): Doc {
  const now = Date.now();
  return {
    ...src,
    id: newId(),
    type,
    number,
    date,
    status: "draft",
    parentId: src.id,
    items: src.items.map((l): Line => ({ ...l })),
    createdAt: now,
    updatedAt: now,
  };
}

/** Накладная / гарантийный талон / КП из счёта. Номер накладной по умолчанию = номер счёта. */
export function deriveFrom(src: Doc, type: DocType, opts: { number?: string; date: string }): Doc {
  const d = base(src, type, opts.number ?? src.number, opts.date);
  if (type === "waybill") {
    d.items = d.items.map((l, i) => ({ ...l, nomenclature: l.nomenclature || String(i + 1).padStart(4, "0") }));
    d.attorney ??= src.buyer.type === "person"
      ? { mode: "id", idNumber: src.buyer.idNumber, iin: src.buyer.bin, name: src.buyer.name }
      : { mode: "blank" };
  }
  if (type === "warranty") {
    d.items = d.items.filter((l) => !l.delivery);
    d.paymentBasis ||= src.type === "invoice" ? `Счет на оплату № ${src.number} от ${ruShort(src.date)}` : "";
    d.saleDate = opts.date;
  }
  return d;
}

/** Та же сделка сегодняшним числом — новый документ с новым номером. */
export function reissue(src: Doc, opts: { number: string; date: string }): Doc {
  const d = base(src, src.type, opts.number, opts.date);
  d.parentId = src.parentId;
  return d;
}

/** Похожая сделка: те же позиции и условия, покупатель — пустой. */
export function duplicate(src: Doc, opts: { number: string; date: string }): Doc {
  const d = base(src, src.type, opts.number, opts.date);
  d.parentId = undefined;
  d.buyer = emptyBuyer();
  d.attorney = undefined;
  d.contract = "";
  d.paymentBasis = "";
  d.items = d.items.map((l) => ({ ...l, serial: "" }));
  return d;
}

function ruShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Пустой документ для формы «Новый». */
export function blankDoc(p: { type: DocType; sellerId: string; number: string; date: string; vatRate: number | null }): Doc {
  const now = Date.now();
  return {
    id: newId(),
    ...p,
    status: "draft",
    buyer: emptyBuyer(),
    items: [{ name: "", unit: "шт.", qty: 1, price: 0, unitCode: "796" }],
    withStamp: false,
    withSign: false,
    attorney: p.type === "waybill" ? { mode: "blank" } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}
