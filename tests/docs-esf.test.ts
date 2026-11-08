import { test } from "node:test";
import assert from "node:assert/strict";
import { esfContainer, esfNum, invoiceXml, parseContract } from "../lib/docs/esf/export.ts";
import { validateEsf } from "../lib/docs/esf/validate.ts";
import { SEED_SELLERS } from "../lib/docs/seed.ts";
import type { Doc, Line } from "../lib/docs/types.ts";

const [OMIRZAQ, KUANDYK] = SEED_SELLERS;
const line: Line = { name: "Интерактивная панель 75 дюймов AVRON LT-75", unit: "шт.", qty: 1, price: 73400000, tnved: "8528599009", unitCode: "796", origin: "2", declNo: "50000/081126/0012345", declPos: "1" };
const doc = (p: Partial<Doc> = {}): Doc => ({
  id: "x", type: "invoice", sellerId: "omirzaq", number: "66", date: "2026-11-03", status: "issued",
  buyer: { id: "b", type: "foreign_rep", name: "Представительство АО «Атабай Кимья»", bin: "220742006852", address: "г. Алматы", bank: "", bik: "", iik: "", kbe: "", phone: "", email: "", headName: "", headPosition: "", headBasis: "", idNumber: "", idIssuer: "", idDate: "" },
  items: [line], vatRate: null, withStamp: false, withSign: false, createdAt: 0, updatedAt: 0, ...p,
});
const errors = (d: Doc, s = OMIRZAQ) => validateEsf(d, s).filter((i) => i.level === "error").map((i) => i.field);

test("числа без незначащих нулей", () => {
  assert.equal(esfNum(44999000), "449990");
  assert.equal(esfNum(44999050), "449990.5");
  assert.equal(esfNum(44999055), "449990.55");
  assert.equal(esfNum(0), "0");
});

test("договор разбирается на номер и дату", () => {
  assert.deepEqual(parseContract("№ 7 от 01.11.2026"), { num: "7", date: "01.11.2026" });
  assert.equal(parseContract(""), null);
});

test("правильный документ проходит без ошибок", () => {
  assert.deepEqual(errors(doc()), []);
});

test("признак 1 у панели — ошибка TNVED_CODE_INCONSISTENT", () => {
  assert.ok(errors(doc({ items: [{ ...line, origin: "1" }] })).includes("products[0].unitCode"));
});

test("импорт без ТН ВЭД, декларации и позиции — ошибки", () => {
  const e = errors(doc({ items: [{ ...line, tnved: "", declNo: "", declPos: "" }] }));
  assert.ok(e.includes("products[0].unitCode"));
  assert.ok(e.includes("products[0].productDeclaration"));
  assert.ok(e.includes("products[0].productNumberInDeclaration"));
});

test("ТН ВЭД не из 10 цифр, единица не код — ошибки", () => {
  const e = errors(doc({ items: [{ ...line, tnved: "852859", unitCode: "шт" }] }));
  assert.ok(e.includes("products[0].unitCode"));
  assert.ok(e.includes("products[0].unitNomenclature"));
});

test("НДС у неплательщика и «без НДС» у плательщика — ошибки", () => {
  assert.ok(errors(doc({ vatRate: 1600 })).includes("ndsRate"));
  assert.ok(errors(doc({ sellerId: "kuandyk" }), KUANDYK).includes("ndsRate"));
});

test("XML: без НДС — нет ndsRate; количественной единицы нет; номер только цифры", () => {
  const x = invoiceXml({ doc: doc(), seller: OMIRZAQ });
  assert.doesNotMatch(x, /<ndsRate>/);
  assert.doesNotMatch(x, /quantitative/);
  assert.match(x, /<unitCode>8528599009<\/unitCode>/);
  assert.match(x, /<unitNomenclature>796<\/unitNomenclature>/);
  assert.match(x, /<paymentForm>NON_CASH<\/paymentForm>/);
  assert.doesNotMatch(x, /<term>/);
});

test("XML с НДС 16%: НДС внутри суммы, итоги сходятся", () => {
  const x = esfContainer([{ doc: doc({ sellerId: "kuandyk", vatRate: 1600 }), seller: KUANDYK }]);
  assert.match(x, /<ndsRate>16<\/ndsRate>/);
  assert.match(x, /<ndsAmount>101241.38<\/ndsAmount>/);
  assert.match(x, /<priceWithoutTax>632758.62<\/priceWithoutTax>/);
  assert.match(x, /<totalPriceWithTax>734000<\/totalPriceWithTax>/);
  assert.match(x, /^<\?xml[^>]+\?>\n<esf:invoiceContainer xmlns:esf="esf"/);
});
