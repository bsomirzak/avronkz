/**
 * Проверка документа перед выгрузкой в ИС ЭСФ. Ловит то, на чём ЭСФ падают в
 * «Ошибочный»: ТН ВЭД, единица измерения, признак происхождения, БИН/ИИН, суммы.
 *
 * Правила — по ошибкам ИС ЭСФ (TNVED_CODE_CANT_BE_EMPTY, TNVED_CODE_INCONSISTENT,
 * …QUANTITATIVE_UNIT_NOMENCLATURE_MUST_BE_EMPTY, INVALID_MEASURE_UNIT_CODE,
 * PRODUCT_DECLARATION_REQUIRED, NDS_RATE_FOR_NOT_NDS_PAYER).
 */

import { isValidBin } from "../parse.ts";
import { totals } from "../totals.ts";
import type { Doc, Seller } from "../types.ts";

export type Issue = { level: "error" | "warning"; field: string; text: string };

/** Коды единиц измерения классификатора ИС ЭСФ, которые встречаются у нас. */
export const UNIT_CODES: Record<string, string> = {
  "796": "штука",
  "839": "комплект",
  "778": "упаковка",
  "715": "пара",
  "166": "килограмм",
  "006": "метр",
  "112": "литр",
  "5114": "одна услуга",
};

/**
 * Товарные позиции, которые есть в Перечне изъятий (признак 1/3). Наши панели,
 * мониторы, проекторы и принтеры (8528 52/59/62/69, 8471, 8443) в Перечень НЕ
 * входят → у импортных признак 2, у казахстанских 4.
 */
const NOT_IN_LIST = [/^852852/, /^852859/, /^852862/, /^852869/, /^8471/, /^8443/];

/** Прослеживаемые товары ЕАЭС (Решение Совета ЕЭК № 5 от 26.01.2026): только для них заполняется «количественная единица». */
export const TRACEABLE = [/^8418/, /^8450/, /^852871/, /^852872/, /^852873/];

export function validateEsf(doc: Doc, seller: Seller): Issue[] {
  const out: Issue[] = [];
  const err = (field: string, text: string) => out.push({ level: "error", field, text });
  const warn = (field: string, text: string) => out.push({ level: "warning", field, text });

  if (!/^\d{1,30}$/.test(doc.number)) err("num", `Номер «${doc.number}»: в ЭСФ только цифры`);
  if (!isValidBin(seller.iin)) err("seller.tin", `ИИН поставщика ${seller.iin} не проходит проверку контрольной цифры`);
  if (!seller.signer) err("operatorFullname", "Не указан подписант ИП (ФИО выписывающего)");

  const b = doc.buyer;
  if (!b.name) err("customer.name", "Не указано наименование покупателя");
  if (b.nonResident) {
    // У нерезидента БИН может отсутствовать.
  } else if (!b.bin) {
    if (b.type === "person") warn("customer.tin", "У физлица нет ИИН — ЭСФ уйдёт как розничная продажа (RETAIL)");
    else err("customer.tin", "Не указан БИН/ИИН покупателя");
  } else if (!isValidBin(b.bin)) err("customer.tin", `БИН/ИИН покупателя ${b.bin} не проходит проверку контрольной цифры`);
  if (b.type === "gov") warn("customer.statuses", "Госучреждение: статус «Госучреждение» и раздел реквизитов казначейства заполните в ИС ЭСФ после импорта");

  if (seller.regime.kind === "our" && seller.regime.vatPayer && doc.vatRate == null)
    err("ndsRate", "ИП — плательщик НДС, а в документе «Без НДС»");
  if (!(seller.regime.kind === "our" && seller.regime.vatPayer) && doc.vatRate != null)
    err("ndsRate", "ИП не плательщик НДС, а в документе выделен НДС — ИС ЭСФ отклонит (NDS_RATE_FOR_NOT_NDS_PAYER)");
  if (doc.vatRate != null && !seller.vatCertNum)
    warn("seller.certificate", "Плательщик НДС: проверьте в ИС ЭСФ дату постановки на учёт по НДС (графа B9 формы 2026 года)");

  if (!doc.items.length) err("products", "Нет позиций");
  doc.items.forEach((l, i) => {
    const n = `Строка ${i + 1} (${l.name || "без названия"})`;
    const f = (x: string) => `products[${i}].${x}`;
    const tn = (l.tnved ?? "").replace(/\D/g, "");
    const origin = l.origin ?? "";
    if (l.delivery) {
      if (origin && origin !== "6") warn(f("truOriginCode"), `${n}: доставка — это услуга, признак происхождения 6`);
      return;
    }
    if (!/^[1-6]$/.test(origin)) err(f("truOriginCode"), `${n}: не указан признак происхождения (1–6)`);
    if (origin === "1" || origin === "2") {
      if (!tn) err(f("unitCode"), `${n}: для импортного товара (признак ${origin}) обязателен код ТН ВЭД`);
      if (!l.declNo) err(f("productDeclaration"), `${n}: нужен № декларации / заявления о ввозе (или № СНТ) — возьмите из входящей ЭСФ поставщика`);
      if (!l.declPos) err(f("productNumberInDeclaration"), `${n}: нужен номер позиции в декларации`);
    }
    if (tn && tn.length !== 10) err(f("unitCode"), `${n}: код ТН ВЭД должен быть из 10 цифр (сейчас ${tn.length})`);
    if (tn && (origin === "1" || origin === "3") && NOT_IN_LIST.some((re) => re.test(tn)))
      err(f("unitCode"), `${n}: код ${tn} не входит в Перечень изъятий — признак ${origin} не подходит, нужен ${origin === "1" ? "2" : "4"} (TNVED_CODE_INCONSISTENT)`);
    if (tn && TRACEABLE.some((re) => re.test(tn)))
      warn(f("quantitativeUnitNomenclature"), `${n}: код ${tn} — прослеживаемый товар; количественную единицу и количество по прослеживаемости заполните в ИС ЭСФ`);
    const unit = (l.unitCode ?? "").trim();
    if (!unit) err(f("unitNomenclature"), `${n}: не указан код единицы измерения (штука — 796)`);
    else if (!/^\d{1,4}$/.test(unit)) err(f("unitNomenclature"), `${n}: код единицы «${unit}» — нужен числовой код классификатора (штука — 796)`);
    else if (!UNIT_CODES[unit]) warn(f("unitNomenclature"), `${n}: код единицы ${unit} — проверьте по классификатору ИС ЭСФ`);
    if (!(l.qty > 0)) err(f("quantity"), `${n}: количество должно быть больше нуля`);
    if (!(l.price > 0)) err(f("priceWithTax"), `${n}: цена должна быть больше нуля`);
  });

  const t = totals(doc);
  if (t.lines.reduce((a, l) => a + l.sum, 0) !== t.total) err("productSet", "Сумма строк не сходится с итогом");
  return out;
}
