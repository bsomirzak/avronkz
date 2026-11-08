/**
 * Итоги документа, ставка НДС на дату, режим расчёта ИП, имя файла.
 * Чистые функции — их же используют тесты и клиентская форма.
 */

import type { CalcMode } from "./calc.ts";
import { mulDiv, vatIncluded, type Bp, type Money } from "./money.ts";
import type { Doc, Line, Seller, Settings, TaxRegime } from "./types.ts";

/** Ставка НДС, действующая на дату (ISO). */
export function vatRateOn(date: string, s: Pick<Settings, "vatHistory">): Bp {
  const sorted = [...s.vatHistory].sort((a, b) => a.from.localeCompare(b.from));
  let rate = sorted[0]?.rate ?? 1600;
  for (const h of sorted) if (h.from <= date) rate = h.rate;
  return rate;
}

/** Режим калькулятора для налогового режима ИП на дату документа. */
export function regimeToMode(r: TaxRegime | { kind: "manual"; k: Bp }, vat: Bp): CalcMode {
  if (r.kind === "simplified") return { kind: "simplified", rate: r.rate };
  if (r.kind === "manual") return { kind: "manual", k: r.k };
  return { kind: "our", ipn: r.ipn, vat: r.vatPayer ? vat : null };
}

export function sellerVatRate(seller: Seller, date: string, s: Pick<Settings, "vatHistory">): Bp | null {
  return seller.regime.kind === "our" && seller.regime.vatPayer ? vatRateOn(date, s) : null;
}

/** Сумма строки: цена × количество (количество бывает дробным — до тысячных). */
export function lineSum(l: Pick<Line, "price" | "qty">): Money {
  return mulDiv(l.price, Math.round(l.qty * 1000), 1000);
}

export type Totals = {
  lines: { sum: Money; vat: Money }[];
  total: Money;
  vat: Money;
  qty: number;
  count: number;
};

/** НДС считаем по строкам (так требует ЭСФ) и складываем. */
export function totals(doc: Pick<Doc, "items" | "vatRate">): Totals {
  const lines = doc.items.map((l) => {
    const sum = lineSum(l);
    return { sum, vat: doc.vatRate == null ? 0 : vatIncluded(sum, doc.vatRate) };
  });
  return {
    lines,
    total: lines.reduce((a, l) => a + l.sum, 0),
    vat: lines.reduce((a, l) => a + l.vat, 0),
    qty: doc.items.reduce((a, l) => a + l.qty, 0),
    count: doc.items.length,
  };
}

/** «2026-11-08» → «08.11.2026». */
export function ruDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Сегодня по Алматы (UTC+5) в ISO. */
export function todayIso(now = new Date()): string {
  return new Date(now.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "g", қ: "q", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

function stripForm(name: string): string {
  return name
    .replace(/^Представительство\s+(АО|ТОО|компании)?\s*/i, "")
    .replace(/^(ТОО|АО|ИП|КГУ|ГУ|НАО|РГП|ГКП|ЧУ|ОО|ОФ|ПК|ЖШС|АҚ|ЖК)\s+/i, "")
    .replace(/[«»"'“”„]/g, "");
}

/** Первые слова названия через «_», не длиннее max: «Атабай_Кимья», «KST_BETON_2022». */
function words(name: string, max: number): string {
  const parts = stripForm(name).split(/[^\p{L}\p{N}-]+/u).filter(Boolean);
  let out = "";
  for (const w of parts) {
    const next = out ? `${out}_${w}` : w;
    if (next.length > max && out) break;
    out = next.slice(0, max);
  }
  return out || "без_названия";
}

/** Кириллица → латиница (для ASCII-запаса в заголовке скачивания). */
export function translit(s: string): string {
  return [...s]
    .map((ch) => {
      const lower = ch.toLowerCase();
      const t = TRANSLIT[lower];
      if (t === undefined) return ch;
      return ch === lower ? t : t.charAt(0).toUpperCase() + t.slice(1);
    })
    .join("")
    .replace(/[^A-Za-z0-9._-]+/g, "_");
}

const FILE_PREFIX = { invoice: "Счет", waybill: "Накладная", warranty: "Гарантийный_талон", offer: "КП" } as const;

/** «Счет_66_Атабай_Кимья.pdf» — как в уже выданных файлах. */
export function docFileName(doc: Pick<Doc, "type" | "number" | "buyer">): string {
  const num = doc.number.replace(/[^\p{L}\p{N}-]+/gu, "-");
  return `${FILE_PREFIX[doc.type]}_${num}_${words(doc.buyer.name, 28)}.pdf`;
}

/** Content-Disposition с UTF-8 именем и латинским запасом для старых клиентов. */
export function contentDisposition(fileName: string, inline = false): string {
  return `${inline ? "inline" : "attachment"}; filename="${translit(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * Следующий номер документа у ИП по типу: больше и счётчика, и любого уже
 * выданного номера. Нумерация у каждого ИП и типа своя.
 */
export function computeNextNumber(
  counters: Record<string, number>,
  docs: Pick<Doc, "sellerId" | "type" | "number">[],
  sellerId: string,
  type: Doc["type"],
): string {
  let max = counters[`${sellerId}:${type}`] ?? 0;
  for (const d of docs) {
    if (d.sellerId !== sellerId || d.type !== type) continue;
    const n = Number(d.number);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}

/** Название для имени файла: первые слова без формы собственности и кавычек. */
export function fileSlugSafe(name: string): string {
  return words(name, 28);
}
