/**
 * Калькулятор «на руки ↔ сумма счёта».
 *
 * Режимы (ставки — настройки, сюда приходят готовыми числами):
 *   упрощёнка r       сумма = нетто / (1 − r)
 *   ОУР + НДС         сумма = (нетто − ИПН × расходы) / (1 − ИПН) × (1 + НДС)
 *   ОУР без НДС       сумма = (нетто − ИПН × расходы) / (1 − ИПН)
 *   ручной k          сумма = нетто / (1 − k)
 *
 * Прямой расчёт делается одним делением с одним округлением, чтобы не копить
 * ошибку: 550 000 на руки по ОУР+НДС → 708 888,89 ровно, а не 708 888,90.
 */

import { ceilTo, mulDiv, pct, vatIncluded, type Bp, type Money } from "./money.ts";

export type CalcMode =
  | { kind: "simplified"; rate: Bp }
  /** vat = null — ИП на ОУР, но не плательщик НДС. */
  | { kind: "our"; ipn: Bp; vat: Bp | null }
  | { kind: "manual"; k: Bp };

export type Breakdown = {
  /** Сумма счёта (к оплате). */
  gross: Money;
  /** НДС внутри суммы; 0 — без НДС. */
  vat: Money;
  /** Сумма без НДС — облагаемая база по ИПН / упрощёнке. */
  base: Money;
  /** Налог с дохода: упрощёнка, ИПН или ручной коэффициент. */
  tax: Money;
  /** Остаётся на руки. */
  net: Money;
};

const FULL = BigInt(10000);

/** Округление дроби num/den до целого, половина — от нуля. */
function ratio(num: bigint, den: bigint): Money {
  return mulDiv(1, num, den);
}

/** На руки → сумма счёта. expenses — подтверждённые расходы (только для ОУР). */
export function grossFromNet(mode: CalcMode, net: Money, expenses: Money = 0): Money {
  const N = BigInt(net);
  switch (mode.kind) {
    case "simplified":
      return ratio(N * FULL, FULL - BigInt(mode.rate));
    case "manual":
      return ratio(N * FULL, FULL - BigInt(mode.k));
    case "our": {
      const ipn = BigInt(mode.ipn);
      const vat = BigInt(mode.vat ?? 0);
      // (нетто·10000 − ИПН·расходы) / (10000 − ИПН) — база без НДС, затем × (1 + НДС)
      const num = (N * FULL - ipn * BigInt(expenses)) * (FULL + vat);
      return ratio(num, (FULL - ipn) * FULL);
    }
  }
}

/** Сумма счёта → полная расшифровка: НДС, база, налог, на руки. */
export function breakdown(mode: CalcMode, gross: Money, expenses: Money = 0): Breakdown {
  switch (mode.kind) {
    case "simplified": {
      const tax = pct(gross, mode.rate);
      return { gross, vat: 0, base: gross, tax, net: gross - tax };
    }
    case "manual": {
      const tax = pct(gross, mode.k);
      return { gross, vat: 0, base: gross, tax, net: gross - tax };
    }
    case "our": {
      const vat = mode.vat == null ? 0 : vatIncluded(gross, mode.vat);
      const base = gross - vat;
      const tax = pct(Math.max(base - expenses, 0), mode.ipn);
      return { gross, vat, base, tax, net: base - tax };
    }
  }
}

/** На руки → расшифровка; step — округлить сумму счёта вверх до 10/100/1000 тенге. */
export function fromNet(mode: CalcMode, net: Money, opts: { expenses?: Money; step?: number } = {}): Breakdown {
  let gross = grossFromNet(mode, net, opts.expenses ?? 0);
  if (opts.step) gross = ceilTo(gross, opts.step);
  return breakdown(mode, gross, opts.expenses ?? 0);
}

/** Есть ли в режиме НДС (влияет на «В том числе НДС» / «Без НДС» в документах). */
export function hasVat(mode: CalcMode): boolean {
  return mode.kind === "our" && mode.vat != null;
}

export function modeLabel(mode: CalcMode): string {
  const p = (b: Bp) => `${(b / 100).toString().replace(".", ",")}%`;
  switch (mode.kind) {
    case "simplified":
      return `Упрощёнка ${p(mode.rate)}, без НДС`;
    case "manual":
      return `Ручной коэффициент ${p(mode.k)}`;
    case "our":
      return mode.vat == null ? `ОУР: ИПН ${p(mode.ipn)}, без НДС` : `ОУР: НДС ${p(mode.vat)} + ИПН ${p(mode.ipn)}`;
  }
}

/**
 * Делит сумму на части пропорционально весам методом наибольшего остатка —
 * сумма частей всегда равна целому, ни тиына не теряется.
 */
export function split(total: Money, weights: number[]): Money[] {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (!weights.length) return [];
  if (sumW <= 0) return split(total, weights.map(() => 1));
  const T = BigInt(total);
  const S = BigInt(Math.round(sumW));
  const W = weights.map((w) => BigInt(Math.round(w)));
  const parts = W.map((w) => Number((T * w) / S));
  const rems = W.map((w) => Number(((T * w) % S) * BigInt(1000000) / S));
  let rest = total - parts.reduce((a, b) => a + b, 0);
  const order = rems.map((r, i) => [r, i] as const).sort((a, b) => b[0] - a[0]);
  for (let j = 0; rest > 0; j = (j + 1) % order.length, rest--) parts[order[j][1]]++;
  return parts;
}
