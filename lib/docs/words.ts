/**
 * Сумма прописью по-русски: «пятьсот девяносто две тысячи семьсот восемьдесят
 * три тенге 51 тиын». «Тенге» и «тиын» в документах не склоняются — так их
 * пишут в счетах и в ИС ЭСФ.
 */

import type { Money } from "./money.ts";

type Gender = "m" | "f" | "n";

const ONES: Record<Gender, string[]> = {
  m: ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"],
  f: ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"],
  n: ["", "одно", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"],
};
const TEENS = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

/** Форма слова по числу: 1 тысяча, 2 тысячи, 5 тысяч; 11–14 — всегда «тысяч». */
export function plural(n: number, one: string, few: string, many: string): string {
  const n100 = Math.abs(n) % 100;
  const n10 = n100 % 10;
  if (n100 >= 11 && n100 <= 14) return many;
  if (n10 === 1) return one;
  if (n10 >= 2 && n10 <= 4) return few;
  return many;
}

function triad(n: number, g: Gender): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) out.push(HUNDREDS[h]);
  if (t === 1) out.push(TEENS[o]);
  else {
    if (t) out.push(TENS[t]);
    if (o) out.push(ONES[g][o]);
  }
  return out;
}

const SCALES: { g: Gender; forms: [string, string, string] }[] = [
  { g: "f", forms: ["тысяча", "тысячи", "тысяч"] },
  { g: "m", forms: ["миллион", "миллиона", "миллионов"] },
  { g: "m", forms: ["миллиард", "миллиарда", "миллиардов"] },
  { g: "m", forms: ["триллион", "триллиона", "триллионов"] },
];

/** Целое число прописью: 1 800 000 → «один миллион восемьсот тысяч». */
export function numberToWords(n: number, gender: Gender = "m"): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`прописью только целые ≥ 0: ${n}`);
  if (n === 0) return "ноль";
  const groups: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) groups.push(x % 1000);
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    if (i === 0) words.push(...triad(g, gender));
    else {
      const scale = SCALES[i - 1];
      words.push(...triad(g, scale.g), plural(g, ...scale.forms));
    }
  }
  return words.join(" ");
}

/** Сумма в тиынах прописью: «один тенге 00 тиын». */
export function amountInWords(t: Money): string {
  if (t < 0) return `минус ${amountInWords(-t)}`;
  const tenge = Math.floor(t / 100);
  const tiyn = t % 100;
  return `${numberToWords(tenge)} тенге ${String(tiyn).padStart(2, "0")} тиын`;
}

/** Количество прописью для накладной: 1 → «один»; дробное количество пишем цифрами. */
export function quantityInWords(q: number): string {
  if (Number.isInteger(q)) return numberToWords(q);
  return String(q).replace(".", ",");
}
