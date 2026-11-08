/**
 * Выгрузка в формат импорта ИС ЭСФ (InvoiceV2, контейнер esf:invoiceContainer).
 *
 * Источник структуры — официальная XSD InvoiceV2 (ответ queryInvoiceXsd) и
 * образец «One InvoiceV2.xml» из SDK КГД; изменения 2026 года: paymentForm
 * обязателен (CASH | NON_CASH), «Без НДС» — это отсутствие ndsRate (0 означает
 * ставку 0%). Порядок элементов строгий (xs:sequence) — не переставлять.
 * Числа без незначащих нулей: 449990, 449990.5. Даты — дд.мм.гггг.
 *
 * Что ещё нужно сверить с актуальным SDK (270426): тег новой графы B9 «дата
 * постановки на учёт по НДС» — пока не выгружаем, ИС ЭСФ подставит/спросит.
 */

import { mulDiv, type Money } from "../money.ts";
import { lineSum, ruDate, totals } from "../totals.ts";
import type { Doc, Seller } from "../types.ts";

/** Тиыны → «449990» / «449990.5» / «449990.55». */
export function esfNum(t: Money): string {
  const neg = t < 0;
  const a = Math.abs(t);
  let s = String(Math.floor(a / 100));
  const f = a % 100;
  if (f) s += "." + String(f).padStart(2, "0").replace(/0$/, "");
  return (neg ? "-" : "") + s;
}

function qtyNum(q: number): string {
  return String(Number(q.toFixed(6)));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function el(tag: string, v: string | undefined | null, pad: string): string {
  return v == null || v === "" ? "" : `${pad}<${tag}>${esc(v)}</${tag}>\n`;
}

/** «№ 7 от 01.11.2026» → номер и дата договора. */
export function parseContract(s: string | undefined): { num: string; date: string } | null {
  if (!s?.trim()) return null;
  const num = /№\s*([^\s,]+)/.exec(s)?.[1] ?? s.replace(/от.*$/i, "").replace(/№/g, "").trim();
  const date = /(\d{2}\.\d{2}\.\d{4})/.exec(s)?.[1] ?? "";
  return { num, date };
}

export type EsfInput = {
  doc: Doc;
  seller: Seller;
  /** Накладная к счёту — номер и дата товаросопроводительного документа. */
  waybill?: Pick<Doc, "number" | "date"> | null;
  /** Дата выписки ЭСФ (ISO). По умолчанию — дата документа. */
  issueDate?: string;
  /** Дата совершения оборота (ISO) — дата отгрузки. */
  turnoverDate?: string;
  paymentForm?: "CASH" | "NON_CASH";
};

export function invoiceXml(inp: EsfInput): string {
  const { doc, seller } = inp;
  const t = totals(doc);
  const vat = doc.vatRate;
  const P = "      ";
  const PP = P + "  ";
  const PPP = PP + "  ";
  const PPPP = PPP + "  ";
  let x = `    <v2:invoice xmlns:a="abstractInvoice.esf" xmlns:v2="v2.esf">\n`;
  // ── абстрактная часть ──
  x += el("date", ruDate(inp.issueDate ?? doc.date), P);
  x += el("invoiceType", "ORDINARY_INVOICE", P);
  x += el("num", doc.number.replace(/\D/g, ""), P);
  x += el("operatorFullname", seller.signer, P);
  x += el("turnoverDate", ruDate(inp.turnoverDate ?? inp.waybill?.date ?? doc.date), P);
  // ── V2 ──
  const b = doc.buyer;
  x += `${P}<customers>\n${PP}<customer>\n`;
  x += el("address", b.address, PPP);
  x += el("countryCode", "KZ", PPP);
  x += el("name", b.name, PPP);
  const status = b.nonResident ? "NONRESIDENT" : b.type === "person" ? (b.bin ? "INDIVIDUAL" : "RETAIL") : null;
  if (status) x += `${PPP}<statuses>\n${PPPP}<status>${status}</status>\n${PPP}</statuses>\n`;
  x += el("tin", b.bin, PPP);
  x += `${PP}</customer>\n${P}</customers>\n`;
  if (inp.waybill) {
    x += el("deliveryDocDate", ruDate(inp.waybill.date), P);
    x += el("deliveryDocNum", inp.waybill.number, P);
  }
  const contract = parseContract(doc.contract);
  x += `${P}<deliveryTerm>\n`;
  if (contract) {
    x += el("contractDate", contract.date, PP);
    x += el("contractNum", contract.num, PP);
  }
  x += el("hasContract", contract ? "true" : "false", PP);
  x += el("paymentForm", inp.paymentForm ?? "NON_CASH", PP);
  x += `${P}</deliveryTerm>\n`;

  x += `${P}<productSet>\n`;
  x += el("currencyCode", "KZT", PP);
  x += `${PP}<products>\n`;
  let totWithout = 0;
  doc.items.forEach((l, i) => {
    const sum = lineSum(l);
    const nds = t.lines[i].vat;
    const without = sum - nds;
    totWithout += without;
    const unitPrice = l.qty ? mulDiv(without, 1000, Math.round(l.qty * 1000)) : without;
    const origin = l.delivery ? "6" : l.origin || "";
    const imported = origin === "1" || origin === "2";
    x += `${PPP}<product>\n`;
    x += el("catalogTruId", "1", PPPP);
    x += el("description", l.name, PPPP);
    x += el("ndsAmount", esfNum(nds), PPPP);
    if (vat != null) x += el("ndsRate", String(vat / 100), PPPP);
    x += el("priceWithTax", esfNum(sum), PPPP);
    x += el("priceWithoutTax", esfNum(without), PPPP);
    if (imported) {
      x += el("productDeclaration", l.declNo, PPPP);
      x += el("productNumberInDeclaration", l.declPos, PPPP);
    }
    // quantitativeQuantity / quantitativeUnitNomenclature — только для прослеживаемых товаров: не выгружаем.
    if (!(origin === "6" && l.delivery)) x += el("quantity", qtyNum(l.qty), PPPP);
    if (imported) x += el("tnvedName", l.name, PPPP);
    x += el("truOriginCode", origin, PPPP);
    x += el("turnoverSize", esfNum(without), PPPP);
    x += el("unitCode", (l.tnved ?? "").replace(/\D/g, ""), PPPP);
    if (!(origin === "6" && l.delivery)) x += el("unitNomenclature", l.unitCode || "796", PPPP);
    x += el("unitPrice", esfNum(unitPrice), PPPP);
    x += `${PPP}</product>\n`;
  });
  x += `${PP}</products>\n`;
  x += el("totalExciseAmount", "0", PP);
  x += el("totalNdsAmount", esfNum(t.vat), PP);
  x += el("totalPriceWithTax", esfNum(t.total), PP);
  x += el("totalPriceWithoutTax", esfNum(totWithout), PP);
  x += el("totalTurnoverSize", esfNum(totWithout), PP);
  x += `${P}</productSet>\n`;

  x += `${P}<sellers>\n${PP}<seller>\n`;
  x += el("address", seller.address, PPP);
  x += el("bank", seller.bank, PPP);
  x += el("bik", seller.bik, PPP);
  if (vat != null) {
    x += el("certificateNum", seller.vatCertNum, PPP);
    x += el("certificateSeries", seller.vatCertSeries, PPP);
  }
  x += el("iik", seller.iik, PPP);
  x += el("kbe", seller.kbe, PPP);
  x += el("name", seller.name, PPP);
  x += el("tin", seller.iin, PPP);
  x += `${PP}</seller>\n${P}</sellers>\n`;
  x += `    </v2:invoice>\n`;
  return x;
}

/** Файл для «ЭСФ → Импорт» в веб-интерфейсе: один или несколько счетов. */
export function esfContainer(items: EsfInput[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<esf:invoiceContainer xmlns:esf="esf" xmlns:a="abstractInvoice.esf" xmlns:v2="v2.esf">\n  <invoiceSet>\n` +
    items.map(invoiceXml).join("") +
    `  </invoiceSet>\n</esf:invoiceContainer>\n`
  );
}

/** Запасной вариант — таблица в порядке граф раздела G для ручного переноса. */
export function esfCsv(inp: EsfInput): string {
  const { doc, seller } = inp;
  const t = totals(doc);
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const num = (m: Money) => (m / 100).toFixed(2).replace(".", ",");
  const rows: (string | number)[][] = [
    ["Раздел", "Поле", "Значение"],
    ["A", "Номер", doc.number],
    ["A", "Дата выписки", ruDate(inp.issueDate ?? doc.date)],
    ["A", "Дата совершения оборота", ruDate(inp.turnoverDate ?? inp.waybill?.date ?? doc.date)],
    ["B", "ИИН поставщика", seller.iin],
    ["B", "Поставщик", seller.name],
    ["B", "Адрес", seller.address],
    ["B", "ИИК / БИК / Кбе", `${seller.iik} / ${seller.bik} / ${seller.kbe}`],
    ["C", "БИН/ИИН получателя", doc.buyer.bin],
    ["C", "Получатель", doc.buyer.name],
    ["C", "Адрес", doc.buyer.address],
    ["E", "Договор", doc.contract || "без договора"],
    ["E", "Форма оплаты", inp.paymentForm === "CASH" ? "наличный" : "безналичный"],
    ["F", "Товаросопроводительный документ", inp.waybill ? `№ ${inp.waybill.number} от ${ruDate(inp.waybill.date)}` : ""],
    [],
    ["G: №", "Признак происхождения (2)", "Наименование (3)", "Наименование по ТН ВЭД (3/1)", "Код ТН ВЭД (4)", "Ед. изм. (5)", "Кол-во (6)", "Цена за ед. без НДС (7)", "Стоимость без косв. налогов (8)", "Ставка НДС (12)", "Сумма НДС (13)", "Стоимость с НДС (14)", "№ декларации (16)", "№ позиции в декларации (17)"],
  ];
  doc.items.forEach((l, i) => {
    const sum = lineSum(l);
    const nds = t.lines[i].vat;
    const without = sum - nds;
    rows.push([
      i + 1, l.delivery ? "6" : l.origin ?? "", l.name, l.origin === "1" || l.origin === "2" ? l.name : "", l.tnved ?? "", l.unitCode || "796",
      l.qty, num(l.qty ? mulDiv(without, 1000, Math.round(l.qty * 1000)) : without), num(without),
      doc.vatRate == null ? "Без НДС" : `${doc.vatRate / 100}%`, num(nds), num(sum), l.declNo ?? "", l.declPos ?? "",
    ]);
  });
  rows.push(["Итого", "", "", "", "", "", "", "", num(t.total - t.vat), "", num(t.vat), num(t.total), "", ""]);
  // BOM + «;» — Excel открывает кириллицу и колонки без мастера импорта.
  return "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n") + "\r\n";
}
