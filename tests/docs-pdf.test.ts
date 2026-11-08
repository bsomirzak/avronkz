import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderPdf, SealMismatchError } from "../lib/docs/pdf/render.ts";
import { SEED_SELLERS, SEED_SETTINGS } from "../lib/docs/seed.ts";
import { toTiyn } from "../lib/docs/money.ts";
import { computeNextNumber } from "../lib/docs/totals.ts";
import type { Buyer, Doc, DocType, Line } from "../lib/docs/types.ts";

const seller = (id: string) => SEED_SELLERS.find((s) => s.id === id)!;
const buyer = (p: Partial<Buyer>): Buyer => ({
  id: "b", type: "too", name: "", bin: "", address: "", bank: "", bik: "", iik: "", kbe: "", phone: "", email: "",
  headName: "", headPosition: "", headBasis: "", idNumber: "", idIssuer: "", idDate: "", ...p,
});
const LT75: Line = { productId: "lt-75", name: "Интерактивная панель 75 дюймов AVRON LT-75", unit: "шт.", qty: 1, price: toTiyn(577000), model: "AVRON LT-75", specs: ["4K"] };
const LT65: Line = { productId: "lt-65", name: "Интерактивная панель 65 дюймов AVRON LT-65", unit: "шт.", qty: 2, price: toTiyn(470000), model: "AVRON LT-65" };
const KZ_NAME = "Өмірзақ Бекжан Мұхтарұлы, ТОО «Балабақша Ақ-Нұр», ЗАҢҒАР-БОЛАШАҚ";
const LONG = "Представительство АО «Атабай Кимья Санайи Ве Тиджарет Аноним Ширкети»";

function mk(type: DocType, p: Partial<Doc> = {}): Doc {
  return {
    id: "t", type, sellerId: "omirzaq", number: "1", date: "2026-11-08", status: "draft",
    buyer: buyer({ name: "ТОО «Тест»", bin: "220742006852" }), items: [LT75], vatRate: null,
    withStamp: false, withSign: false, createdAt: 0, updatedAt: 0, ...p,
  };
}

async function text(pdf: Uint8Array): Promise<{ pages: number; text: string }> {
  const d = await getDocument({ data: pdf.slice(), useSystemFonts: false }).promise;
  let out = "";
  for (let i = 1; i <= d.numPages; i++) {
    const tc = await (await d.getPage(i)).getTextContent();
    out += tc.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return { pages: d.numPages, text: out.replace(/\s+/g, " ") };
}

/** Картинки с прозрачностью (печать, подпись): у каждой своя маска /SMask. */
const imgCount = (pdf: Uint8Array) => (Buffer.from(pdf).toString("latin1").match(/\/SMask \d+ 0 R/g) ?? []).length;

test("14. накладная с 2 позициями: итоги верные, одна страница", async () => {
  const pdf = await renderPdf(mk("waybill", { sellerId: "kuandyk", vatRate: 1600, items: [LT75, LT65] }), seller("kuandyk"), SEED_SETTINGS);
  const r = await text(pdf);
  assert.equal(r.pages, 1);
  assert.match(r.text, /1 517 000,00/);
  // НДС по строкам: 577 000 × 16/116 = 79 586,21; 940 000 × 16/116 = 129 655,17
  assert.match(r.text, /79 586,21/);
  assert.match(r.text, /129 655,17/);
  assert.match(r.text, /209 241,38/);
  assert.match(r.text, /один миллион пятьсот семнадцать тысяч тенге 00 тиын/);
  assert.match(r.text, /Итого 3 3 x/);
});

test("накладная без НДС пишет «без НДС», а не 0", async () => {
  const r = await text(await renderPdf(mk("waybill"), seller("omirzaq"), SEED_SETTINGS));
  assert.match(r.text, /без НДС/);
  assert.doesNotMatch(r.text, / 0,00 /);
});

test("15. накладная для физлица — удостоверение вместо доверенности", async () => {
  const doc = mk("waybill", {
    buyer: buyer({ type: "person", name: "Өмірзақ Бекжан Мұхтарұлы", bin: "981014301009", idIssuer: "МВД РК", idDate: "2020-05-14" }),
    attorney: { mode: "id", idNumber: "045678912", iin: "981014301009", name: "Өмірзақ Бекжан Мұхтарұлы" },
  });
  const r = await text(await renderPdf(doc, seller("omirzaq"), SEED_SETTINGS));
  assert.match(r.text, /Удостоверение личности №/);
  assert.match(r.text, /045678912/);
  assert.doesNotMatch(r.text, /По доверенности/);
});

test("16. длинное название покупателя переносится, не обрезается", async () => {
  for (const type of ["invoice", "waybill"] as const) {
    const r = await text(await renderPdf(mk(type, { buyer: buyer({ type: "foreign_rep", name: LONG, bin: "220742006852", address: "РК, г. Алматы, Бостандыкский район, микрорайон Керемет, дом 6, кв. 15" }) }), seller("omirzaq"), SEED_SETTINGS));
    for (const w of ["Представительство", "Тиджарет", "Аноним", "Ширкети»", "Керемет"]) assert.ok(r.text.includes(w), `${type}: нет «${w}»`);
  }
});

test("17. казахские буквы во всех 4 документах", async () => {
  for (const type of ["invoice", "waybill", "warranty", "offer"] as const) {
    const r = await text(await renderPdf(mk(type, { buyer: buyer({ name: KZ_NAME, bin: "190140900097" }) }), seller("omirzaq"), SEED_SETTINGS));
    for (const w of ["Өмірзақ", "Мұхтарұлы", "Балабақша", "Ақ-Нұр", "ЗАҢҒАР-БОЛАШАҚ", "ӨМІРЗАҚ"]) assert.ok(r.text.includes(w), `${type}: нет «${w}»`);
  }
});

const stampFile = "stamps/stamp_omirzaq.png";
const signFile = "stamps/sign_omirzaq.png";
test("18. с печатью и подписью / без них; чужую печать подставить нельзя", { skip: !existsSync(stampFile) || !existsSync(signFile) }, async () => {
  const seal = { stamp: { key: "omirzaq", png: readFileSync(stampFile) }, sign: { key: "omirzaq", png: readFileSync(signFile) } };
  for (const type of ["invoice", "waybill", "warranty", "offer"] as const) {
    const plain = await renderPdf(mk(type), seller("omirzaq"), SEED_SETTINGS, seal);
    const sealed = await renderPdf(mk(type, { withStamp: true, withSign: true }), seller("omirzaq"), SEED_SETTINGS, seal);
    assert.equal(imgCount(plain), 0, `${type}: в чистом бланке не должно быть картинок`);
    assert.equal(imgCount(sealed), 2, `${type}: печать + подпись`);
  }
  // Печать ӨМІРЗАҚ в документе КУАНДЫК
  await assert.rejects(
    renderPdf(mk("invoice", { sellerId: "kuandyk", withStamp: true }), seller("kuandyk"), SEED_SETTINGS, { stamp: seal.stamp }),
    SealMismatchError,
  );
  // Документ одного ИП с реквизитами другого
  await assert.rejects(renderPdf(mk("invoice", { sellerId: "kuandyk" }), seller("omirzaq"), SEED_SETTINGS), SealMismatchError);
});

test("19. нумерация независима у разных ИП и типов, без дублей", () => {
  const docs = [
    { sellerId: "omirzaq", type: "invoice" as const, number: "66" },
    { sellerId: "omirzaq", type: "invoice" as const, number: "65" },
    { sellerId: "omirzaq", type: "waybill" as const, number: "3" },
    { sellerId: "kuandyk", type: "invoice" as const, number: "12" },
    { sellerId: "kuandyk", type: "invoice" as const, number: "б/н" },
  ];
  assert.equal(computeNextNumber({}, docs, "omirzaq", "invoice"), "67");
  assert.equal(computeNextNumber({}, docs, "omirzaq", "waybill"), "4");
  assert.equal(computeNextNumber({}, docs, "kuandyk", "invoice"), "13");
  assert.equal(computeNextNumber({}, docs, "beksultan", "invoice"), "1");
  // Счётчик, выставленный вручную, сдвигает начало, но не ниже выданных номеров.
  assert.equal(computeNextNumber({ "beksultan:invoice": 99 }, docs, "beksultan", "invoice"), "100");
  assert.equal(computeNextNumber({ "omirzaq:invoice": 10 }, docs, "omirzaq", "invoice"), "67");
});
