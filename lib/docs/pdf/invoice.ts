/**
 * Счёт на оплату, A4 книжная. Вёрстка повторяет прежние счета
 * (Счет_66_Атабай_Кимья.pdf): реквизиты бенефициара, жирная линия под
 * заголовком, таблица позиций, итог, прописью, «Исполнитель» и «М.П.».
 */

import { amountInWords } from "../words.ts";
import { fmt, fmtBp, mulDiv } from "../money.ts";
import { lineSum, ruDate } from "../totals.ts";
import { drawSeal, qtyFmt, unitShort, type Ctx } from "./common.ts";
import { A4, Canvas, type Fonts } from "./kit.ts";
import type { PDFDocument } from "pdf-lib";

const L = 42;
const R = 553;
const W = R - L;

export function drawInvoice(pdf: PDFDocument, fonts: Fonts, ctx: Ctx): void {
  const { doc, seller, t, settings } = ctx;
  let c = new Canvas(pdf.addPage(A4), fonts);

  // 1. Предупреждение
  let y = 42;
  y += c.para(settings.texts.invoiceWarning, L + 25, y, W - 50, { size: 7, align: "center", lead: 9.4 });

  // 2. Реквизиты бенефициара
  y += 7;
  const c1 = 298 - L;
  const c2 = 450 - 298;
  const c3 = R - 450;
  const top = y;
  const rh = 36;
  c.rect(L, top, W, rh * 2, 0.6);
  c.line(L + c1, top, L + c1, top + rh * 2, 0.6);
  c.line(L + c1 + c2, top, L + c1 + c2, top + rh * 2, 0.6);
  c.line(L, top + rh, R, top + rh, 0.6);
  c.text("Бенефициар:", L + 5, top + 4, { size: 7.5, font: "b" });
  c.text(seller.name, L + 5, top + 15, { size: 7.5, font: "b" });
  c.text(`БИН/ИИН ${seller.iin}`, L + 5, top + 24.5, { size: 7.5 });
  c.text("ИИК", L + c1, top + 4, { size: 7.5, font: "b", align: "center", w: c2 });
  c.text(seller.iik, L + c1, top + 20, { size: 7.5, font: "b", align: "center", w: c2 });
  c.text("Кбе", L + c1 + c2, top + 4, { size: 7.5, font: "b", align: "center", w: c3 });
  c.text(seller.kbe, L + c1 + c2, top + 20, { size: 7.5, font: "b", align: "center", w: c3 });
  const y2 = top + rh;
  c.text("Банк бенефициара:", L + 5, y2 + 6, { size: 7.5 });
  c.text(seller.bank, L + 5, y2 + 24, { size: 7.5 });
  c.text("БИК", L + c1, y2 + 6, { size: 7.5, font: "b", align: "center", w: c2 });
  c.text(seller.bik, L + c1, y2 + 24, { size: 7.5, font: "b", align: "center", w: c2 });
  c.para("Код назначения платежа", L + c1 + c2 + 15, y2 + 2.5, c3 - 30, { size: 7.5, font: "b", align: "center", lead: 9 });
  c.text(seller.knp, L + c1 + c2, y2 + 24, { size: 7.5, font: "b", align: "center", w: c3 });
  y = top + rh * 2;

  // 3. Заголовок + жирная линия
  y += 12;
  c.text(`Счет на оплату № ${doc.number} от ${ruDate(doc.date)}.`, L, y, { size: 13, font: "b" });
  y += 22;
  c.line(L, y, R, y, 2);

  // 4. Поставщик / покупатель
  y += 12;
  const vx = L + 71;
  const vw = R - vx;
  c.text("Поставщик:", L, y + 0.5, { size: 7.5 });
  y += c.para(`БИН / ИИН ${seller.iin} ${seller.name}, ${seller.address}`, vx, y, vw, { size: 7.5, font: "b", lead: 10 });
  y += 9;
  const buyerIdLabel = doc.buyer.type === "person" || doc.buyer.type === "ip" ? "ИИН" : "БИН";
  const buyerLine = [`${doc.buyer.bin ? `${buyerIdLabel} ${doc.buyer.bin} ` : ""}${doc.buyer.name}`, doc.buyer.address].filter(Boolean).join(", ");
  c.text("Покупатель:", L, y + 0.5, { size: 7.5 });
  y += c.para(buyerLine, vx, y, vw, { size: 7.5, font: "b", lead: 10 });
  y += 9;

  // 5. Договор
  c.text(`Договор:${doc.contract ? `  ${doc.contract}` : ""}`, L, y, { size: 7.5 });
  y += 17;

  // 6. Позиции
  const cols = [
    { t: "№", w: 29, a: "center" as const },
    { t: "Наименование", w: 222, a: "left" as const },
    { t: "Кол-во", w: 56, a: "right" as const },
    { t: "Ед.", w: 34, a: "left" as const },
    { t: "Цена", w: 85, a: "right" as const },
    { t: "Сумма", w: W - 29 - 222 - 56 - 34 - 85, a: "right" as const },
  ];
  const header = (yy: number) => {
    let x = L;
    for (const col of cols) {
      c.cell(col.t, x, yy, col.w, 15, { size: 7.5, font: "b", align: "center", border: 0.6 });
      x += col.w;
    }
    c.line(L, yy, R, yy, 1.2);
    return yy + 15;
  };
  y = header(y);
  doc.items.forEach((it, i) => {
    const h = Math.max(15, c.cellHeight(it.name, cols[1].w, { size: 7.5, pad: 4, lead: 9.4 }));
    if (y + h > c.H - 160) {
      c = new Canvas(pdf.addPage(A4), fonts);
      y = header(42);
    }
    const vals = [String(i + 1), it.name, qtyFmt(it.qty, 3), unitShort(it.unit), fmt(it.price), fmt(lineSum(it))];
    let x = L;
    cols.forEach((col, j) => {
      c.cell(vals[j], x, y, col.w, h, { size: 7.5, align: col.a, pad: 4, lead: 9.4 });
      x += col.w;
    });
    y += h;
  });
  c.line(L, y, R, y, 1.2);

  // 7. Итого и НДС
  y += 6;
  c.text("Итого:", L, y, { size: 8, font: "b", align: "right", w: 462 - L });
  c.text(fmt(t.total), L, y, { size: 8, font: "b", align: "right", w: W });
  y += 13;
  if (doc.vatRate == null) {
    c.text("Без НДС", L, y, { size: 8, font: "b", align: "right", w: 462 - L });
  } else {
    c.text(`В том числе НДС ${fmtBp(doc.vatRate)}%:`, L, y, { size: 8, font: "b", align: "right", w: 462 - L });
    c.text(fmt(t.vat), L, y, { size: 8, font: "b", align: "right", w: W });
  }
  y += 22;

  // 8. Итого прописью
  c.text(`Всего наименований ${t.count}, на сумму ${fmt(t.total)} KZT`, L, y, { size: 7.5 });
  y += 13;
  const lbl = "Всего к оплате: ";
  c.text(lbl, L, y, { size: 7.5, font: "b" });
  const lw = c.width(lbl, 7.5, "b");
  y += c.para(amountInWords(t.total), L + lw, y, W - lw, { size: 7.5, lead: 10 });

  // 9. Условия оплаты
  if (doc.prepayPercent && doc.prepayPercent > 0 && doc.prepayPercent < 100) {
    const pre = mulDiv(t.total, doc.prepayPercent, 100);
    y += 5;
    y += c.para(
      `Условия оплаты: ${doc.prepayPercent}% предоплата — ${fmt(pre)} тг, остаток ${fmt(t.total - pre)} тг — после отгрузки товара.`,
      L,
      y,
      W,
      { size: 7.5, lead: 10 },
    );
  }
  y += 8;
  c.line(L, y, R, y, 1);

  // 10. Подпись
  y += 34;
  c.text("Исполнитель", L, y, { size: 7.5, font: "b" });
  c.line(L + 71, y + 8, L + 302, y + 8, 0.6);
  c.text(seller.signer, L + 309, y, { size: 7.5 });
  c.text("М.П.", L + 110, y + 31, { size: 7.5 });

  drawSeal(c, ctx, {
    sign: [{ x: L + 255, y: y + 5 }],
    stamp: { x: L + 150, y: y + 26 },
  });
}
