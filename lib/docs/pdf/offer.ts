/** Коммерческое предложение, A4 книжная. */

import type { PDFDocument } from "pdf-lib";
import { fmt, fmtBp } from "../money.ts";
import { lineSum, ruDate } from "../totals.ts";
import { brandHeader } from "./brand.ts";
import { drawSeal, qtyFmt, unitShort, type Ctx } from "./common.ts";
import { A4, Canvas, type Fonts } from "./kit.ts";
import { months } from "./warranty.ts";

const L = 42;
const R = 553;
const W = R - L;

export function drawOffer(pdf: PDFDocument, fonts: Fonts, ctx: Ctx): void {
  const { doc, seller, t, settings } = ctx;
  let c = new Canvas(pdf.addPage(A4), fonts);
  let y = brandHeader(c, seller, L, R);
  const ensure = (need: number) => {
    if (y + need > c.H - 40) {
      c = new Canvas(pdf.addPage(A4), fonts);
      y = 42;
    }
  };

  if (doc.buyer.name) {
    c.text("Кому:", L, y, { size: 9, font: "b" });
    y += c.para([doc.buyer.name, doc.buyer.bin ? `БИН/ИИН ${doc.buyer.bin}` : "", doc.buyer.address].filter(Boolean).join(", "), L + 40, y, W - 40, { size: 9, lead: 12 });
    if (doc.buyer.headName) y += c.para(`${doc.buyer.headPosition || "Руководителю"} ${doc.buyer.headName}`, L + 40, y, W - 40, { size: 9, lead: 12 });
    y += 14;
  }
  c.text(`КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № ${doc.number} от ${ruDate(doc.date)}`, L, y, { size: 13, font: "b", align: "center", w: W });
  y += 26;
  y += c.para(`${seller.name} предлагает к поставке следующие товары:`, L, y, W, { size: 9, lead: 12 }) + 8;

  const vat = doc.vatRate != null;
  const cols = [
    { t: "№", w: 24, a: "center" as const },
    { t: "Наименование", w: 245, a: "left" as const },
    { t: "Кол-во", w: 52, a: "center" as const },
    { t: vat ? "Цена с НДС, ₸" : "Цена, ₸", w: 95, a: "right" as const },
    { t: vat ? "Сумма с НДС, ₸" : "Сумма, ₸", w: W - 24 - 245 - 52 - 95, a: "right" as const },
  ];
  let x = L;
  for (const col of cols) {
    c.fill(x, y, col.w, 20, 0.9);
    c.cell(col.t, x, y, col.w, 20, { size: 8, font: "b", align: "center" });
    x += col.w;
  }
  y += 20;
  doc.items.forEach((it, i) => {
    const vals = [String(i + 1), it.name, `${qtyFmt(it.qty)} ${unitShort(it.unit)}`, fmt(it.price), fmt(lineSum(it))];
    const h = Math.max(19, c.cellHeight(it.name, cols[1].w, { size: 8.5, pad: 4 }));
    ensure(h);
    x = L;
    cols.forEach((col, j) => {
      c.cell(vals[j], x, y, col.w, h, { size: 8.5, align: col.a, pad: 4 });
      x += col.w;
    });
    y += h;
  });
  y += 8;
  c.text("Итого:", L, y, { size: 9.5, font: "b", align: "right", w: W - cols[4].w - 8 });
  c.text(`${fmt(t.total)} ₸`, L, y, { size: 9.5, font: "b", align: "right", w: W });
  y += 14;
  c.text(vat ? `В том числе НДС ${fmtBp(doc.vatRate!)}%: ${fmt(t.vat)} ₸` : "Без НДС", L, y, { size: 8.5, align: "right", w: W });
  y += 24;

  // Характеристики — по разу на товар
  const seen = new Set<string>();
  for (const it of doc.items) {
    const key = it.productId ?? it.name;
    if (seen.has(key) || !(it.specs?.length || it.kit)) continue;
    seen.add(key);
    ensure(40);
    c.text(it.name, L, y, { size: 9.5, font: "b" });
    y += 15;
    for (const s of it.specs ?? []) {
      ensure(12);
      c.text("•", L + 2, y, { size: 8.5 });
      y += c.para(s, L + 12, y, W - 12, { size: 8.5, lead: 11 });
    }
    if (it.kit) {
      ensure(24);
      y += c.para(`Комплект поставки: ${it.kit}.`, L, y + 3, W, { size: 8.5, lead: 11 }) + 3;
    }
    y += 10;
  }

  // Условия
  ensure(110);
  c.text("Условия поставки", L, y, { size: 10, font: "b" });
  y += 16;
  const term = doc.warrantyMonths ?? doc.items.find((i) => i.warrantyMonths)?.warrantyMonths ?? 12;
  const terms: [string, string][] = [
    ["Оплата", doc.paymentTerms || settings.texts.offerPayment],
    ["Срок поставки", doc.deliveryDays || "по наличию на складе"],
    ["Доставка", doc.deliveryTerms || settings.texts.offerDelivery],
    ["Гарантия", months(term)],
    ["Срок действия предложения", `${doc.validDays ?? 10} календарных дней`],
  ];
  for (const [k, v] of terms) {
    const h = c.paraHeight(v, W - 150, 8.5, "r", 11);
    ensure(h + 4);
    c.text(`${k}:`, L, y, { size: 8.5, font: "b" });
    y += c.para(v, L + 150, y, W - 150, { size: 8.5, lead: 11 }) + 4;
  }
  y += 8;
  if (settings.texts.offerFooter) y += c.para(settings.texts.offerFooter, L, y, W, { size: 9, font: "i", lead: 12 }) + 6;

  ensure(80);
  y += 26;
  c.text(seller.name, L, y, { size: 9, font: "b" });
  c.line(L + 170, y + 9, L + 330, y + 9, 0.6);
  c.text(seller.signer, L + 340, y, { size: 9 });
  c.text("М.П.", L + 120, y + 30, { size: 8.5 });
  drawSeal(c, ctx, { sign: [{ x: L + 250, y: y + 2 }], stamp: { x: L + 170, y: y + 24 } });
}
