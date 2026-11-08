/** Гарантийный талон, A4 книжная. */

import type { PDFDocument } from "pdf-lib";
import { ruDate } from "../totals.ts";
import { plural } from "../words.ts";
import { brandHeader } from "./brand.ts";
import { drawSeal, qtyFmt, type Ctx } from "./common.ts";
import { A4, Canvas, type Fonts } from "./kit.ts";

const L = 42;
const R = 553;
const W = R - L;

export function months(n: number): string {
  return `${n} ${plural(n, "месяц", "месяца", "месяцев")}`;
}

export function drawWarranty(pdf: PDFDocument, fonts: Fonts, ctx: Ctx): void {
  const { doc, seller } = ctx;
  let c = new Canvas(pdf.addPage(A4), fonts);
  let y = brandHeader(c, seller, L, R);

  c.text(`ГАРАНТИЙНЫЙ ТАЛОН № ${doc.number}`, L, y, { size: 14, font: "b", align: "center", w: W });
  y += 30;

  const term = doc.warrantyMonths ?? doc.items.find((i) => i.warrantyMonths)?.warrantyMonths ?? 12;
  const idLabel = doc.buyer.type === "person" || doc.buyer.type === "ip" ? "ИИН" : "БИН";
  const fields: [string, string][] = [
    ["Покупатель", doc.buyer.name],
    [`${idLabel}`, doc.buyer.bin],
    ["Адрес", doc.buyer.address],
    ["Дата продажи", ruDate(doc.saleDate ?? doc.date)],
    ["Форма оплаты / основание", doc.paymentBasis ?? ""],
    ["Срок гарантии", months(term)],
  ];
  const lw = 150;
  for (const [k, v] of fields) {
    const h = Math.max(18, c.cellHeight(v, W - lw, { size: 8.5, pad: 5 }));
    c.fill(L, y, lw, h, 0.95);
    c.cell(k, L, y, lw, h, { size: 8.5, font: "b", pad: 5 });
    c.cell(v, L + lw, y, W - lw, h, { size: 8.5, pad: 5 });
    y += h;
  }
  y += 14;

  // Товары
  const cols = [
    { t: "№", w: 24, a: "center" as const },
    { t: "Наименование", w: 190, a: "left" as const },
    { t: "Модель", w: 85, a: "left" as const },
    { t: "Серийный номер", w: 120, a: "left" as const },
    { t: "Кол-во", w: 40, a: "center" as const },
    { t: "Гарантия", w: W - 24 - 190 - 85 - 120 - 40, a: "center" as const },
  ];
  let x = L;
  for (const col of cols) {
    c.fill(x, y, col.w, 18, 0.9);
    c.cell(col.t, x, y, col.w, 18, { size: 8, font: "b", align: "center" });
    x += col.w;
  }
  y += 18;
  doc.items.filter((i) => !i.delivery).forEach((it, i) => {
    const vals = [String(i + 1), it.name, it.model ?? "", it.serial ?? "", qtyFmt(it.qty), months(it.warrantyMonths ?? term)];
    const h = Math.max(18, ...vals.map((v, j) => c.cellHeight(v, cols[j].w, { size: 8, pad: 4 })));
    if (y + h > c.H - 60) {
      c = new Canvas(pdf.addPage(A4), fonts);
      y = 42;
    }
    x = L;
    cols.forEach((col, j) => {
      c.cell(vals[j], x, y, col.w, h, { size: 8, align: col.a, pad: 4 });
      x += col.w;
    });
    y += h;
  });
  y += 16;

  const section = (title: string, body: string, list = false) => {
    const lines = list ? body.split("\n").filter(Boolean) : [body];
    const need = 16 + lines.reduce((a, l) => a + c.paraHeight(l, W - 12, 8.5, "r", 11), 0);
    if (y + need > c.H - 40) {
      c = new Canvas(pdf.addPage(A4), fonts);
      y = 42;
    }
    c.text(title, L, y, { size: 9.5, font: "b" });
    y += 15;
    for (const l of lines) {
      if (list) c.text("•", L + 2, y, { size: 8.5 });
      y += c.para(l, list ? L + 12 : L, y, list ? W - 12 : W, { size: 8.5, lead: 11 }) + (list ? 1 : 0);
    }
    y += 10;
  };
  section("Гарантия распространяется на", ctx.settings.texts.warrantyCovers);
  section("Гарантия не распространяется на случаи", ctx.settings.texts.warrantyExcludes, true);
  section("Порядок обращения", ctx.settings.texts.warrantyProcedure);

  // Подписи
  if (y + 110 > c.H - 20) {
    c = new Canvas(pdf.addPage(A4), fonts);
    y = 60;
  }
  y += 14;
  const half = W / 2;
  c.text("Поставщик", L, y, { size: 9, font: "b" });
  c.text("Покупатель", L + half + 10, y, { size: 9, font: "b" });
  y += 30;
  c.line(L, y, L + 110, y, 0.6);
  c.text("/", L + 114, y - 10, { size: 9 });
  c.line(L + 122, y, L + half - 20, y, 0.6);
  c.text(seller.signer, L + 122, y - 11, { size: 8.5, align: "center", w: half - 142 });
  c.line(L + half + 10, y, L + half + 120, y, 0.6);
  c.text("/", L + half + 124, y - 10, { size: 9 });
  c.line(L + half + 132, y, R, y, 0.6);
  c.text("подпись", L, y + 2, { size: 6, font: "i", align: "center", w: 110 });
  c.text("подпись", L + half + 10, y + 2, { size: 6, font: "i", align: "center", w: 110 });
  c.text("М.П.", L + 20, y + 22, { size: 8.5 });
  c.text("М.П. (при наличии)", L + half + 10, y + 22, { size: 8.5 });
  c.para("Товар получен в исправном состоянии, комплектность проверена, с условиями гарантии ознакомлен.", L + half + 10, y + 40, half - 10, { size: 7.5, font: "i", lead: 9.5 });

  drawSeal(c, ctx, { sign: [{ x: L + 60, y: y - 8 }], stamp: { x: L + 125, y: y + 24 } });
}
