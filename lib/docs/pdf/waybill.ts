/**
 * Накладная на отпуск запасов на сторону, форма З-2 (приложение 26 к приказу
 * МФ РК от 20.12.2012 № 562). A4 альбомная. Вёрстка повторяет прежние
 * накладные (Накладная_1_KST_BETON_2022.pdf).
 */

import type { PDFDocument } from "pdf-lib";
import { fmt, fmtBp } from "../money.ts";
import { ruDate } from "../totals.ts";
import { amountInWords, quantityInWords } from "../words.ts";
import { drawSeal, qtyFmt, type Ctx } from "./common.ts";
import { A4L, Canvas, type Fonts } from "./kit.ts";

const L = 34;
const R = 807;

/** Границы колонок таблицы позиций (графы 1–9). */
const X = [34, 79, 292, 365, 435, 497, 559, 644, 728, 807];

export function drawWaybill(pdf: PDFDocument, fonts: Fonts, ctx: Ctx): void {
  const { doc, seller, t } = ctx;
  const noVat = doc.vatRate == null;
  let c = new Canvas(pdf.addPage(A4L), fonts);

  // 1. Приложение 26 и форма
  ["Приложение 26", "к приказу Министра финансов", "Республики Казахстан", "от 20 декабря 2012 года № 562"].forEach((s, i) =>
    c.text(s, L, 22 + i * 9.6, { size: 7, font: "i", align: "right", w: R - L }),
  );
  c.text("Форма З-2", L, 63, { size: 7, align: "right", w: R - L });

  // 2. Организация + ИИН/БИН
  c.text("Организация (индивидуальный предприниматель)", L, 86, { size: 7 });
  c.line(239, 96, 567, 96, 0.6);
  c.text(seller.name, 239, 84, { size: 8, font: "b", align: "center", w: 567 - 239 });
  c.text("ИИН/БИН", 578, 86, { size: 7 });
  c.rect(628, 77, R - 628, 26, 0.6);
  c.text(seller.iin, 628, 85.5, { size: 8, font: "b", align: "center", w: R - 628 });

  // 3. Номер и дата
  c.cell("Номер документа", 553, 111, 680 - 553, 16, { size: 7, align: "center" });
  c.cell("Дата составления", 680, 111, R - 680, 16, { size: 7, align: "center" });
  c.cell(doc.number, 553, 127, 680 - 553, 16, { size: 7.5, align: "center" });
  c.cell(ruDate(doc.date), 680, 127, R - 680, 16, { size: 7.5, align: "center" });

  // 4. Заголовок
  c.text("НАКЛАДНАЯ НА ОТПУСК ЗАПАСОВ НА СТОРОНУ", L, 150, { size: 9.5, font: "b", align: "center", w: R - L });

  // 5. Отправитель / получатель / ответственный / транспорт / ТТН
  const P = [34, 181, 385, 533, 680, 807];
  const heads = [
    "Организация (индивидуальный предприниматель) - отправитель",
    "Организация (индивидуальный предприниматель) - получатель",
    "Ответственный за поставку (Ф.И.О.)",
    "Транспортная организация",
    "Товарно-транспортная накладная (номер, дата)",
  ];
  const recipient = [doc.buyer.name, doc.buyer.address].filter(Boolean).join(", ");
  const vals = [seller.name, recipient, doc.responsible ?? seller.signer, doc.transport ?? "", doc.ttn ?? ""];
  const valH = Math.max(22, ...vals.map((v, i) => c.cellHeight(v, P[i + 1] - P[i], { size: 7, pad: 4 })));
  for (let i = 0; i < 5; i++) {
    c.cell(heads[i], P[i], 166, P[i + 1] - P[i], 28, { size: 7, align: "center", pad: 3 });
    c.cell(vals[i], P[i], 194, P[i + 1] - P[i], valH, { size: 7, align: "center", pad: 4 });
  }

  // 6. Таблица позиций
  const header = (y: number): number => {
    const w = (i: number) => X[i + 1] - X[i];
    const h1 = 21;
    const h2 = 13;
    const big = h1 + h2;
    c.cell("Номер по порядку", X[0], y, w(0), big, { size: 7, align: "center" });
    c.cell("Наименование, характеристика", X[1], y, w(1), big, { size: 7, align: "center" });
    c.cell("Номенклатурный номер", X[2], y, w(2), big, { size: 7, align: "center" });
    c.cell("Единица измерения", X[3], y, w(3), big, { size: 7, align: "center" });
    c.cell("Количество", X[4], y, X[6] - X[4], h1, { size: 7, align: "center" });
    c.cell("подлежит отпуску", X[4], y + h1, w(4), h2, { size: 7, align: "center", pad: 1 });
    c.cell("отпущено", X[5], y + h1, w(5), h2, { size: 7, align: "center", pad: 1 });
    c.cell("Цена за единицу, в KZT", X[6], y, w(6), big, { size: 7, align: "center" });
    c.cell(noVat ? "Сумма, в KZT" : "Сумма с НДС, в KZT", X[7], y, w(7), big, { size: 7, align: "center" });
    c.cell("Сумма НДС, в KZT", X[8], y, w(8), big, { size: 7, align: "center" });
    for (let i = 0; i < 9; i++) c.cell(String(i + 1), X[i], y + big, w(i), 11, { size: 7, align: "center", pad: 1 });
    return y + big + 11;
  };

  let y = header(194 + valH + 9);
  const vatCell = (v: number) => (noVat ? "без НДС" : fmt(v));
  doc.items.forEach((it, i) => {
    const h = Math.max(19, c.cellHeight(it.name, X[2] - X[1], { size: 7, pad: 4 }));
    if (y + h > c.H - 24) {
      c = new Canvas(pdf.addPage(A4L), fonts);
      y = header(34);
    }
    const row = [
      String(i + 1),
      it.name,
      it.nomenclature ?? "",
      it.unit,
      qtyFmt(it.qty),
      qtyFmt(it.qty),
      fmt(it.price),
      fmt(t.lines[i].sum),
      vatCell(t.lines[i].vat),
    ];
    row.forEach((v, j) => c.cell(v, X[j], y, X[j + 1] - X[j], h, { size: 7, align: j === 1 ? "left" : "center", pad: 4 }));
    y += h;
  });
  // Итого
  const FOOT = noVat ? 168 : 180;
  if (y + 19 + FOOT > c.H) {
    c = new Canvas(pdf.addPage(A4L), fonts);
    y = 34;
  }
  c.cell("", X[0], y, X[3] - X[0], 19);
  const tot = ["Итого", qtyFmt(t.qty), qtyFmt(t.qty), "x", fmt(t.total), vatCell(t.vat)];
  tot.forEach((v, j) => c.cell(v, X[3 + j], y, X[4 + j] - X[3 + j], 19, { size: 7, align: "center" }));
  y += 19;

  // 7. Прописью
  y += 10;
  c.text("Всего отпущено количество запасов (прописью)", L, y, { size: 7 });
  c.line(215, y + 9, 367, y + 9, 0.6);
  c.text(quantityInWords(t.qty), 215, y - 1, { size: 8, font: "i", align: "center", w: 367 - 215 });
  y += 18;
  c.text("на сумму (прописью), в KZT", L, y, { size: 7 });
  c.line(161, y + 9, R, y + 9, 0.6);
  c.text(amountInWords(t.total), 161, y - 1, { size: 8, font: "i", align: "center", w: R - 161 });
  if (!noVat) {
    y += 12;
    c.text(`в том числе НДС ${fmtBp(doc.vatRate!)}%: ${fmt(t.vat)} (${amountInWords(t.vat)})`, 161, y, { size: 7, font: "i" });
  }

  // 8. Подписи — левая половина
  const top = y + 14;
  c.line(459, top, 459, top + 116, 0.6);
  const sigRow = (label: string, yy: number, position: string | null, name: string) => {
    c.text(label, L, yy, { size: 7 });
    if (position !== null) {
      c.line(130, yy + 9, 192, yy + 9, 0.6);
      c.text(position, 130, yy - 1, { size: 7.5, align: "center", w: 62 });
      c.text("должность", 130, yy + 10, { size: 5, font: "i", align: "center", w: 62 });
      c.text("/", 194, yy, { size: 7 });
    }
    c.line(203, yy + 9, 301, yy + 9, 0.6);
    c.text("подпись", 203, yy + 10, { size: 5, font: "i", align: "center", w: 98 });
    c.text("/", 305, yy, { size: 7 });
    c.line(315, yy + 9, 430, yy + 9, 0.6);
    c.text(name, 315, yy - 1, { size: 7.5, align: "center", w: 115 });
    c.text("расшифровка подписи", 315, yy + 10, { size: 5, font: "i", align: "center", w: 115 });
  };
  sigRow("Отпуск разрешил", top + 6, seller.signerPosition, seller.signer);
  sigRow("Главный бухгалтер", top + 38, null, "");
  c.text("М.П.", L, top + 54, { size: 7, font: "b" });
  sigRow("Отпустил", top + 70, null, doc.responsible ?? seller.signer);

  // Правая половина: доверенность / удостоверение и «Запасы получил»
  const rx = 481;
  const a = doc.attorney ?? { mode: "blank" as const };
  let ry = top + 6;
  if (a.mode === "id") {
    c.text("Удостоверение личности №", rx, ry, { size: 7 });
    c.line(578, ry + 9, 676, ry + 9, 0.6);
    c.text(a.idNumber, 578, ry - 1, { size: 7.5, align: "center", w: 98 });
    c.text("ИИН", 681, ry, { size: 7 });
    c.line(700, ry + 9, R, ry + 9, 0.6);
    c.text(a.iin, 700, ry - 1, { size: 7.5, align: "center", w: R - 700 });
    ry += 29;
    c.text("выдано", rx, ry, { size: 7 });
    c.line(525, ry + 9, R, ry + 9, 0.6);
    const issued = [doc.buyer.idIssuer, doc.buyer.idDate ? ruDate(doc.buyer.idDate) : ""].filter(Boolean).join(", ");
    c.text(issued, 525, ry - 1, { size: 7.5, align: "center", w: R - 525 });
    ry += 27;
    c.line(rx, ry + 9, R, ry + 9, 0.6);
    c.text(a.name || doc.buyer.name, rx, ry - 1, { size: 7.5, align: "center", w: R - rx });
  } else {
    c.text("По доверенности", rx, ry, { size: 7 });
    c.text("№", 561, ry, { size: 7 });
    c.line(576, ry + 9, 675, ry + 9, 0.6);
    c.text("от", 679, ry, { size: 7 });
    c.line(698, ry + 9, 773, ry + 9, 0.6);
    c.text("года", 781, ry, { size: 7 });
    if (a.mode === "poa") {
      c.text(a.number, 576, ry - 1, { size: 7.5, align: "center", w: 99 });
      c.text(ruDate(a.date), 698, ry - 1, { size: 7.5, align: "center", w: 75 });
    }
    ry += 29;
    c.text("выданной", rx, ry, { size: 7 });
    c.line(525, ry + 9, R, ry + 9, 0.6);
    c.text(doc.buyer.name, 525, ry - 1, { size: 7.5, align: "center", w: R - 525 });
    ry += 27;
    c.line(rx, ry + 9, R, ry + 9, 0.6);
    if (a.mode === "poa") c.text([a.position, a.name].filter(Boolean).join(" "), rx, ry - 1, { size: 7.5, align: "center", w: R - rx });
  }
  ry += 28;
  c.text("Запасы получил", rx, ry, { size: 7 });
  c.line(555, ry + 9, 656, ry + 9, 0.6);
  c.text("подпись", 555, ry + 10, { size: 5, font: "i", align: "center", w: 101 });
  c.text("/", 662, ry, { size: 7 });
  c.line(669, ry + 9, R, ry + 9, 0.6);
  c.text("расшифровка подписи", 669, ry + 10, { size: 5, font: "i", align: "center", w: R - 669 });

  drawSeal(c, ctx, {
    sign: [
      { x: 252, y: top + 6 },
      { x: 252, y: top + 70 },
    ],
    stamp: { x: 110, y: top + 56 },
  });
}
