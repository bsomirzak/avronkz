/**
 * Примеры PDF для проверки вёрстки без запуска сайта:
 *   node scripts/docs-sample.mjs [папка]   → Счет_…, Накладная_…, … .pdf
 * Печати/подписи берутся из stamps/ (локально).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { renderPdf } from "../lib/docs/pdf/render.ts";
import { SEED_SELLERS, SEED_SETTINGS } from "../lib/docs/seed.ts";
import { docFileName } from "../lib/docs/totals.ts";
import { toTiyn } from "../lib/docs/money.ts";

const outDir = process.argv[2] ?? "samples";
const only = process.argv[3];
mkdirSync(outDir, { recursive: true });
const seller = (id) => SEED_SELLERS.find((s) => s.id === id);
const img = (kind, key) => {
  const f = path.join("stamps", `${kind}_${key}.png`);
  return existsSync(f) ? { key, png: readFileSync(f) } : null;
};
const buyer = (p) => ({ id: "b", type: "too", name: "", bin: "", address: "", bank: "", bik: "", iik: "", kbe: "", phone: "", email: "", headName: "", headPosition: "", headBasis: "", idNumber: "", idIssuer: "", idDate: "", ...p });
const base = { status: "issued", withStamp: false, withSign: false, createdAt: 0, updatedAt: 0, vatRate: null };
const ATABAY = buyer({ type: "foreign_rep", name: "Представительство АО «Атабай Кимья Санайи Ве Тиджарет Аноним Ширкети»", bin: "220742006852", address: "РК, г. Алматы, Бостандыкский район, микрорайон Керемет, дом 6, кв. 15" });
const KST = buyer({ name: "ТОО «KST BETON 2022»", bin: "220740014391", address: "РК, г. Костанай" });
const KZ = buyer({ name: "ТОО «Балабақша Ақ-Нұр», ЗАҢҒАР-БОЛАШАҚ", bin: "190140900097", address: "РК, г. Шымкент, ул. Өмірзақ Бекжан Мұхтарұлы, 12" });
const PERSON = buyer({ type: "person", name: "Өмірзақ Бекжан Мұхтарұлы", bin: "981014301009", idNumber: "045678912", idIssuer: "МВД РК", idDate: "2020-05-14", address: "г. Алматы" });
const LT75 = { productId: "lt-75", name: "Интерактивная панель 75 дюймов AVRON LT-75", unit: "шт.", qty: 1, price: toTiyn(577000), nomenclature: "0001", serial: "LT75-2410-00123" };
const LT65 = { productId: "lt-65", name: "Интерактивная панель 65 дюймов AVRON LT-65", unit: "шт.", qty: 2, price: toTiyn(470000), nomenclature: "0002", serial: "LT65-2410-00071, LT65-2410-00072" };

const docs = [
  { ...base, id: "1", type: "invoice", sellerId: "omirzaq", number: "66", date: "2026-11-03", buyer: ATABAY, items: [LT75] },
  { ...base, id: "2", type: "invoice", sellerId: "kuandyk", number: "12", date: "2026-11-08", buyer: KZ, items: [LT75, LT65], vatRate: 1600, contract: "№ 7 от 01.11.2026", prepayPercent: 50, withStamp: true, withSign: true },
  { ...base, id: "3", type: "invoice", sellerId: "beksultan", number: "3", date: "2026-11-08", buyer: KST, items: [{ ...LT65, qty: 1 }], withStamp: true, withSign: true },
  { ...base, id: "4", type: "waybill", sellerId: "kuandyk", number: "1", date: "2026-11-04", buyer: KST, items: [{ ...LT75, price: toTiyn(734000), nomenclature: "0001" }], vatRate: 1600, responsible: "Куандык С.Т.", attorney: { mode: "blank" } },
  { ...base, id: "5", type: "waybill", sellerId: "omirzaq", number: "67", date: "2026-11-08", buyer: ATABAY, items: [LT75, LT65, { ...LT65, name: "Мини-принтер AVRON BT-6205B (маркиратор чёрный)", qty: 3, price: 4999000, nomenclature: "0003" }, { ...LT65, name: "Картридж для датера маркиратора", qty: 10, price: 299000, nomenclature: "0004" }, { ...LT75, name: "Видеопроектор JMGO Smart Projector", nomenclature: "0005" }], attorney: { mode: "poa", number: "15", date: "2026-11-07", name: "Сейткали А.Б.", position: "менеджер" }, withStamp: true, withSign: true },
  { ...base, id: "6", type: "waybill", sellerId: "omirzaq", number: "68", date: "2026-11-08", buyer: PERSON, items: [LT65], attorney: { mode: "id", idNumber: "045678912", iin: "981014301009", name: "Өмірзақ Бекжан Мұхтарұлы" } },
  { ...base, id: "7", type: "warranty", sellerId: "omirzaq", number: "66", date: "2026-11-08", buyer: KZ, items: [LT75, LT65], paymentBasis: "Счет на оплату № 66 от 03.11.2026", warrantyMonths: 12, withStamp: true, withSign: true },
  { ...base, id: "8", type: "offer", sellerId: "kuandyk", number: "5", date: "2026-11-08", buyer: KZ, items: [LT75, LT65], vatRate: 1600, validDays: 10, deliveryDays: "3–5 рабочих дней", withStamp: true, withSign: true },
];

for (const d of docs) {
  if (only && !d.type.startsWith(only) && d.id !== only) continue;
  const s = seller(d.sellerId);
  try {
    const pdf = await renderPdf(d, s, SEED_SETTINGS, { stamp: img("stamp", s.stampKey), sign: img("sign", s.signKey) });
    const name = `${d.id}_${docFileName(d)}`;
    writeFileSync(path.join(outDir, name), pdf);
    console.log(name, (pdf.length / 1024).toFixed(0), "КБ");
  } catch (e) {
    console.log(d.id, d.type, "—", e.message);
  }
}
