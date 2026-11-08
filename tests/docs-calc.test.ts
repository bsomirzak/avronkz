import { test } from "node:test";
import assert from "node:assert/strict";
import { fromNet, breakdown, type CalcMode } from "../lib/docs/calc.ts";
import { fmt, toTiyn as T, vatIncluded, vatOnTop, ceilTo } from "../lib/docs/money.ts";
import { split } from "../lib/docs/calc.ts";
import { amountInWords } from "../lib/docs/words.ts";

const S3: CalcMode = { kind: "simplified", rate: 300 };
const S4: CalcMode = { kind: "simplified", rate: 400 };
const S10: CalcMode = { kind: "simplified", rate: 1000 };
const OUR_VAT: CalcMode = { kind: "our", ipn: 1000, vat: 1600 };
const OUR_NOVAT: CalcMode = { kind: "our", ipn: 1000, vat: null };

test("1. 550 000 на руки, упрощёнка 3% → 567 010,31", () => {
  assert.equal(fmt(fromNet(S3, T(550000)).gross), "567 010,31");
});
test("2. 480 000 на руки, 4% → 500 000,00", () => {
  assert.equal(fmt(fromNet(S4, T(480000)).gross), "500 000,00");
});
test("3. 52 000 на руки, 10% → 57 777,78 (упрощёнка 10% и ОУР без НДС дают одно и то же)", () => {
  assert.equal(fmt(fromNet(S10, T(52000)).gross), "57 777,78");
  assert.equal(fmt(fromNet(OUR_NOVAT, T(52000)).gross), "57 777,78");
});
test("4. 450 000 на руки, ОУР + НДС → 580 000; НДС 80 000; база 500 000; ИПН 50 000", () => {
  const b = fromNet(OUR_VAT, T(450000));
  assert.deepEqual([b.gross, b.vat, b.base, b.tax, b.net].map(fmt), ["580 000,00", "80 000,00", "500 000,00", "50 000,00", "450 000,00"]);
});
test("5. 550 000 на руки, ОУР + НДС → 708 888,89; НДС 97 777,78", () => {
  const b = fromNet(OUR_VAT, T(550000));
  assert.equal(fmt(b.gross), "708 888,89");
  assert.equal(fmt(b.vat), "97 777,78");
  assert.equal(fmt(b.net), "550 000,00");
});
test("6. 754 000 с НДС → НДС 104 000; база 650 000", () => {
  const vat = vatIncluded(T(754000), 1600);
  assert.equal(fmt(vat), "104 000,00");
  assert.equal(fmt(T(754000) - vat), "650 000,00");
});
test("7. 68 000 с НДС → 9 379,31 (а не 10 880)", () => {
  assert.equal(fmt(vatIncluded(T(68000), 1600)), "9 379,31");
});
test("8. 700 000 без НДС → НДС 112 000; к оплате 812 000", () => {
  const r = vatOnTop(T(700000), 1600);
  assert.equal(fmt(r.vat), "112 000,00");
  assert.equal(fmt(r.total), "812 000,00");
});
test("9. 575 000 на руки, 3%, округление до 100 → 592 800, на руки 575 016", () => {
  assert.equal(fmt(fromNet(S3, T(575000)).gross), "592 783,51");
  const b = fromNet(S3, T(575000), { step: 100 });
  assert.equal(fmt(b.gross), "592 800,00");
  assert.equal(fmt(b.net), "575 016,00");
});

test("10. 1 → «один тенге 00 тиын»", () => assert.equal(amountInWords(T(1)), "один тенге 00 тиын"));
test("11. 592 783,51 прописью", () =>
  assert.equal(amountInWords(T("592 783,51")), "пятьсот девяносто две тысячи семьсот восемьдесят три тенге 51 тиын"));
test("12. 1 800 000 прописью", () => assert.equal(amountInWords(T(1800000)), "один миллион восемьсот тысяч тенге 00 тиын"));
test("13. 17 549 730 прописью", () =>
  assert.equal(amountInWords(T(17549730)), "семнадцать миллионов пятьсот сорок девять тысяч семьсот тридцать тенге 00 тиын"));

test("склонения тысяч и миллионов", () => {
  assert.equal(amountInWords(T(1000)), "одна тысяча тенге 00 тиын");
  assert.equal(amountInWords(T(2000)), "две тысячи тенге 00 тиын");
  assert.equal(amountInWords(T(5000)), "пять тысяч тенге 00 тиын");
  assert.equal(amountInWords(T(11000)), "одиннадцать тысяч тенге 00 тиын");
  assert.equal(amountInWords(T(2000000)), "два миллиона тенге 00 тиын");
  assert.equal(amountInWords(T(734000)), "семьсот тридцать четыре тысячи тенге 00 тиын");
});

test("разбор сумм из разных форматов", () => {
  assert.equal(T("577,000.00"), 57700000);
  assert.equal(T("592 783,51"), 59278351);
  assert.equal(T("1.000"), 100000);
  assert.equal(T("68000"), 6800000);
  assert.equal(T("0.1"), 10);
  assert.equal(T(0.1 + 0.2), 30);
});

test("округление вверх до шага и обратный расчёт", () => {
  assert.equal(ceilTo(T(592783.51), 1000), T(593000));
  assert.equal(ceilTo(T(592800), 100), T(592800));
  assert.equal(fmt(breakdown(OUR_VAT, T(580000)).net), "450 000,00");
});

test("split не теряет тиыны", () => {
  const p = split(T(1000000), [1, 1, 1]);
  assert.equal(p.reduce((a, b) => a + b, 0), T(1000000));
  assert.deepEqual(split(100, [50000000000, 50000000000]), [50, 50]);
});
