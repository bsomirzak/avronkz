// Пример XML для проверки по XSD: node scripts/docs-esf-sample.mjs <папка>
import { writeFileSync } from "node:fs";
import { invoiceXml, esfContainer } from "../lib/docs/esf/export.ts";
import { validateEsf } from "../lib/docs/esf/validate.ts";
import { SEED_SELLERS } from "../lib/docs/seed.ts";
const dir = process.argv[2] ?? ".";
const buyer = { id: "b", type: "too", name: "ТОО «KST BETON 2022»", bin: "220740014391", address: "РК, г. Костанай", bank: "", bik: "", iik: "", kbe: "", phone: "", email: "", headName: "", headPosition: "", headBasis: "", idNumber: "", idIssuer: "", idDate: "" };
const line = { name: "Интерактивная панель 75 дюймов AVRON LT-75", unit: "шт.", qty: 1, price: 73400000, tnved: "8528599009", unitCode: "796", origin: "2", declNo: "50000/081126/0012345", declPos: "1" };
const mk = (sellerId, vatRate, extra = {}) => ({ id: "x", type: "invoice", sellerId, number: "1", date: "2026-11-04", status: "issued", buyer, items: [line], vatRate, withStamp: false, withSign: false, createdAt: 0, updatedAt: 0, contract: "№ 7 от 01.11.2026", ...extra });
const cases = [
  ["vat", mk("kuandyk", 1600), SEED_SELLERS[1]],
  ["novat", mk("omirzaq", null, { items: [line, { ...line, name: "Мини-принтер AVRON BT-6205B", qty: 3, price: 4999050, tnved: "8443321009" }] }), SEED_SELLERS[0]],
];
for (const [name, doc, seller] of cases) {
  const one = invoiceXml({ doc, seller, waybill: { number: "1", date: "2026-11-04" } })
    .replace(/^ {4}/gm, "");
  writeFileSync(`${dir}/${name}.invoice.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n` + one);
  writeFileSync(`${dir}/${name}.container.xml`, esfContainer([{ doc, seller }]));
  console.log(name, validateEsf(doc, seller));
}
