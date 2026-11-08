/**
 * Деньги — целые тиыны (1 тенге = 100 тиын), никакой арифметики во float.
 *
 * Тип Money — обычный number, но всегда целый: до 9·10¹⁵ тиын он точен, этого
 * хватает с огромным запасом. Умножение на ставку и деление идут в BigInt, а
 * округление — до тиына, половина вверх (от нуля для отрицательных).
 *
 * Модуль без зависимостей и без алиасов «@/» — его гоняют тесты через
 * `node --test` без сборщика.
 */

export type Money = number;

/** Ставка в сотых долях процента: 3% = 300, 16% = 1600, 12.5% = 1250. */
export type Bp = number;

const B100 = BigInt(100);
const BP_FULL = BigInt(10000);

/** a · num / den с округлением до целого, половина — от нуля. */
export function mulDiv(a: Money, num: bigint | number, den: bigint | number): Money {
  const A = BigInt(a);
  const N = BigInt(num);
  const D = BigInt(den);
  if (D === BigInt(0)) throw new Error("деление на ноль");
  const p = A * N;
  const neg = (p < 0) !== (D < 0);
  const ap = p < 0 ? -p : p;
  const ad = D < 0 ? -D : D;
  const q = (ap * BigInt(2) + ad) / (ad * BigInt(2));
  return Number(neg ? -q : q);
}

/** Тенге (число или строка «1 234 567,89» / «1234567.89») → тиыны. */
export function toTiyn(v: number | string): Money {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("не число");
    // toFixed(2) режет хвосты двоичной дроби: 0.1 + 0.2 → «0.30».
    return toTiyn(v.toFixed(2));
  }
  const s = v.replace(/[\s  ']/g, "").replace(/₸|тг\.?|kzt/gi, "");
  if (!s) return 0;
  // Последняя запятая/точка — десятичный разделитель, если за ней 1–2 цифры
  // («577,000.00», «592 783,51»). Ровно три цифры — это разряды: «1.000», «577,000».
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  let int = s;
  let frac = "";
  if (lastSep >= 0) {
    const tail = s.slice(lastSep + 1);
    if (tail.length === 3) {
      int = s.replace(/[.,]/g, "");
    } else {
      int = s.slice(0, lastSep).replace(/[.,]/g, "");
      frac = tail;
    }
  }
  const neg = int.startsWith("-");
  if (neg) int = int.slice(1);
  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) throw new Error(`не сумма: «${v}»`);
  // Больше двух знаков после запятой — округляем половину вверх.
  const f3 = (frac + "000").slice(0, 3);
  let t = BigInt(int || "0") * B100 + BigInt(f3.slice(0, 2));
  if (Number(f3[2]) >= 5) t += BigInt(1);
  return Number(neg ? -t : t);
}

/** Тиыны → число тенге (только для показа и JSON, не для расчётов). */
export function toTenge(t: Money): number {
  return t / 100;
}

/** Единый денежный формат во всех документах: «1 234 567,89». */
export function fmt(t: Money): string {
  const neg = t < 0;
  const a = Math.abs(t);
  const int = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const frac = String(a % 100).padStart(2, "0");
  return `${neg ? "-" : ""}${int},${frac}`;
}

/** Без копеек, если их нет: «592 800» / «592 783,51» — для подсказок в интерфейсе. */
export function fmtShort(t: Money): string {
  return t % 100 === 0 ? fmt(t).slice(0, -3) : fmt(t);
}

/** Сумма × ставка: 700 000 × 16% = 112 000. */
export function pct(t: Money, rate: Bp): Money {
  return mulDiv(t, rate, BP_FULL);
}

/**
 * НДС, который уже сидит внутри суммы: сумма × ставка / (100 + ставка).
 * 754 000 с НДС 16% → 104 000; 68 000 → 9 379,31.
 * Именно так, а не сумма × 16% — это частая ошибка (68 000 × 16% = 10 880).
 */
export function vatIncluded(gross: Money, rate: Bp): Money {
  return mulDiv(gross, rate, BP_FULL + BigInt(rate));
}

/** НДС сверху на сумму без НДС: 700 000 → 112 000, к оплате 812 000. */
export function vatOnTop(net: Money, rate: Bp): { vat: Money; total: Money } {
  const vat = pct(net, rate);
  return { vat, total: net + vat };
}

/** Округление суммы вверх до шага (в тенге): 592 783,51 → 592 800 при шаге 100. */
export function ceilTo(t: Money, stepTenge: number): Money {
  const step = Math.round(stepTenge * 100);
  if (step <= 0) return t;
  return Math.ceil(t / step) * step;
}

/** «3», «16», «12,5» → сотые доли процента. */
export function toBp(v: number | string): Bp {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").replace("%", "").trim());
  if (!Number.isFinite(n)) throw new Error(`не ставка: «${v}»`);
  return Math.round(n * 100);
}

/** 1600 → «16», 1250 → «12,5». */
export function fmtBp(b: Bp): string {
  return (b / 100).toString().replace(".", ",");
}
