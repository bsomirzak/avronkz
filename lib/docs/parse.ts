/**
 * Разбор реквизитов, вставленных из WhatsApp / письма / карточки предприятия.
 *
 * Понимает подписи «БИН», «ИИН/БИН», «БИН (ИИН)», «ИИК», «IBAN», «р/с»,
 * «Номер счёта»; пробелы внутри номеров («190 140 900 097»,
 * «KZ 226 018 821 000 029 331»); кириллицу вместо латиницы в IBAN и БИК;
 * разделители «:», «—», «-», табуляцию и переносы строк.
 *
 * Результат — черновик для формы: пользователь проверяет его глазами, молча
 * ничего не сохраняется.
 */

import type { Buyer, BuyerType } from "./types.ts";

/** Кириллица, похожая на латиницу, — в IBAN и БИК её вставляют по ошибке. */
const LOOKALIKE: Record<string, string> = {
  А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", О: "O", Р: "P", Т: "T", Х: "X", У: "Y", З: "3",
  а: "A", в: "B", с: "C", е: "E", н: "H", к: "K", м: "M", о: "O", р: "P", т: "T", х: "X", у: "Y",
};

export function latinize(s: string): string {
  return [...s].map((c) => LOOKALIKE[c] ?? c).join("").toUpperCase();
}

/** Контрольный разряд ИИН/БИН (12-я цифра) по алгоритму РК. */
export function isValidBin(v: string): boolean {
  const d = v.replace(/\s/g, "");
  if (!/^\d{12}$/.test(d)) return false;
  const n = [...d].map(Number);
  const sum = (w: number[]) => w.reduce((a, wi, i) => a + wi * n[i], 0) % 11;
  let c = sum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  if (c === 10) {
    c = sum([3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]);
    if (c === 10) return false;
  }
  return c === n[11];
}

/** IBAN РК: KZ + 2 цифры + 16 знаков, контроль mod 97. */
export function isValidIban(v: string): boolean {
  const s = latinize(v).replace(/[^A-Z0-9]/g, "");
  if (!/^KZ\d{2}[A-Z0-9]{16}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const code = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of code) rem = (rem * 10 + Number(digit)) % 97;
  }
  return rem === 1;
}

/** ИИН физлица: 5-я цифра (век и пол) 1–6. У БИН юрлица 5-я цифра — 4, 5 или 6 (тип). */
export function looksLikeIin(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length !== 12) return false;
  const mm = Number(d.slice(2, 4));
  const dd = Number(d.slice(4, 6));
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && Number(d[6]) >= 1 && Number(d[6]) <= 6;
}

export type ParsedRequisites = Partial<Omit<Buyer, "id">> & {
  /** Что разобрать не удалось — показываем под формой. */
  rest: string[];
  warnings: string[];
};

type Field = keyof Omit<Buyer, "id" | "type" | "nonResident" | "updatedAt">;

const LABELS: [Field, RegExp][] = [
  ["iik", /^(иик|iik|iban|ибан|номер\s+сч[её]та|р\s*\/\s*с|р\.?\s*с\.?|расч[её]тный\s+сч[её]т|сч[её]т|кз\s*сч[её]т|account)/i],
  ["bik", /^(бик|bik|bic|swift)/i],
  ["kbe", /^(кбе|kbe|кбк)/i],
  ["bin", /^(бин\s*\/\s*иин|иин\s*\/\s*бин|бин\s*\(иин\)|иин\s*\(бин\)|бин|иин|bin|iin|рнн)/i],
  ["bank", /^(банк(\s+получателя|\s+бенефициара)?|наименование\s+банка|bank)/i],
  ["address", /^(юр(\.|идический)?\s*адрес|фактический\s+адрес|почтовый\s+адрес|адрес|address)/i],
  ["phone", /^(тел(\.|ефон)?|моб(\.|ильный)?|phone|whatsapp|контакт)/i],
  ["email", /^(e-?mail|эл\.?\s*почта|почта|email)/i],
  ["headName", /^(директор|руководитель|генеральный\s+директор|председатель|заведующ(ая|ий)|глава|в\s+лице)/i],
  ["headBasis", /^(действует\s+на\s+основании|на\s+основании|основание)/i],
  ["name", /^(наименование(\s+организации|\s+компании)?|организация|компания|покупатель|получатель|название|фио|ф\.и\.о\.?)/i],
  ["idNumber", /^(уд\.?\s*(личности)?|удостоверение(\s+личности)?|№\s*уд)/i],
];

const ORG_RE = /^(ТОО|АО|ИП|КГУ|ГУ|НАО|РГП|ГКП|ЧУ|ОО|ОФ|ПК|ЖШС|АҚ|ЖК|КММ|Представительство|Филиал|Товарищество|Акционерное|Коммунальное|Государственное|Республиканское|Некоммерческое|Частное|Индивидуальный|Общественн)/i;

/** Тип покупателя по форме собственности в названии и по 5-й цифре БИН. */
export function guessType(name: string, bin: string): BuyerType {
  const n = name.trim();
  if (/^(ТОО|ЖШС|Товарищество)/i.test(n)) return "too";
  if (/^(ИП|ЖК|Индивидуальный)/i.test(n)) return "ip";
  if (/^(Представительство|Филиал)/i.test(n)) return "foreign_rep";
  if (/^(КГУ|ГУ|НАО|РГП|ГКП|КММ|Коммунальное|Государственное|Республиканское|Некоммерческое)/i.test(n)) return "gov";
  if (/^(ОО|ОФ|Общественн)/i.test(n)) return "public_org";
  if (/^(АО|АҚ|Акционерное)/i.test(n)) return "ao";
  if (bin && looksLikeIin(bin) && !ORG_RE.test(n)) return "person";
  return "too";
}

/** Всё после подписи поля: убираем «:», «—», «-», табы. */
function afterLabel(line: string, re: RegExp): string {
  return line.replace(re, "").replace(/^[\s:：—–\-=.\t]+/, "").trim();
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

function findIban(s: string): string | null {
  const flat = latinize(s).replace(/[\s\-]/g, "");
  const m = /KZ\d{2}[A-Z0-9]{16}/.exec(flat);
  return m ? m[0] : null;
}

function findBik(s: string): string | null {
  // БИК банков РК: 8 латинских букв, обычно …KZKA / …KZKX / …KZK2.
  const m = /\b([A-Z]{4}KZ[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/.exec(latinize(s).replace(/[^\sA-Z0-9]/g, " "));
  return m ? m[1] : null;
}

function findBin(s: string): string | null {
  // 12 цифр подряд или с пробелами/дефисами внутри: «190 140 900 097».
  const m = /(?<!\d)(\d[\d\s\-]{10,20}\d)(?!\d)/.exec(s);
  if (!m) return null;
  const d = digits(m[1]);
  return d.length === 12 ? d : null;
}

function findPhone(s: string): string | null {
  const m = /(\+?[78][\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2})/.exec(s);
  if (!m) return null;
  const d = digits(m[1]);
  return d.length === 11 ? `+7${d.slice(1)}` : null;
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;

export function parseRequisites(text: string): ParsedRequisites {
  const out: ParsedRequisites = { rest: [], warnings: [] };
  const lines = text
    .replace(/\r/g, "")
    .split(/\n|;\s*(?=[А-ЯA-ZӘҒҚҢӨҰҮҺІ])/)
    .map((l) => l.replace(/[*_]/g, "").replace(/\t+/g, " ").trim())
    .filter(Boolean);

  for (const raw of lines) {
    let matched = false;
    for (const [field, re] of LABELS) {
      if (!re.test(raw)) continue;
      // «Банк» не путаем с «БИК банка» и «Счёт в банке …» — проверяем по порядку LABELS.
      let v = afterLabel(raw, re);
      if (field === "iik") v = findIban(v) ?? findIban(raw) ?? v;
      if (field === "bik") v = findBik(v) ?? latinize(v).replace(/[^A-Z0-9]/g, "");
      if (field === "bin") v = findBin(v) ?? digits(v);
      if (field === "kbe") v = digits(v).slice(0, 2);
      if (field === "phone") v = findPhone(v) ?? v;
      if (field === "email") v = EMAIL.exec(v)?.[0] ?? v;
      if (field === "headName") {
        // «Директор: Иванов И.И.» или «Генеральный директор Иванов Иван Иванович»
        const pos = /^(директор|руководитель|генеральный\s+директор|председатель|заведующ(ая|ий)|глава)/i.exec(raw)?.[0];
        if (pos && !out.headPosition) out.headPosition = pos.charAt(0).toUpperCase() + pos.slice(1).toLowerCase();
        v = v.replace(/^в\s+лице\s+/i, "");
      }
      if (!v) continue;
      if (!out[field]) (out as Record<string, unknown>)[field] = v;
      matched = true;
      break;
    }
    if (matched) continue;

    // Строка без подписи: узнаём по виду.
    const iban = findIban(raw);
    if (iban && !out.iik) {
      out.iik = iban;
      continue;
    }
    const email = EMAIL.exec(raw)?.[0];
    if (email && !out.email) {
      out.email = email;
      continue;
    }
    if (!out.name && ORG_RE.test(raw)) {
      out.name = raw;
      continue;
    }
    const bin = findBin(raw);
    if (bin && !out.bin && digits(raw).length === 12) {
      out.bin = bin;
      continue;
    }
    const bik = findBik(raw);
    if (bik && !out.bik && raw.replace(/\s/g, "").length <= 11) {
      out.bik = bik;
      continue;
    }
    const phone = findPhone(raw);
    if (phone && !out.phone) {
      out.phone = phone;
      continue;
    }
    if (!out.address && /(г\.|город|обл|район|р-н|ул\.|улица|пр\.|проспект|мкр|микрорайон|дом|д\.|кв\.|РК|Казахстан|Алматы|Астана|Шымкент)/i.test(raw)) {
      out.address = raw;
      continue;
    }
    if (!out.bank && /банк|bank/i.test(raw)) {
      out.bank = raw;
      continue;
    }
    out.rest.push(raw);
  }

  // Банк в кавычках с «АО» — оставляем как есть, только чистим «Банк:».
  if (out.name) out.name = out.name.replace(/\s{2,}/g, " ").trim();
  if (out.iik) out.iik = latinize(out.iik).replace(/[^A-Z0-9]/g, "");
  if (out.bin && !isValidBin(out.bin)) out.warnings.push(`БИН/ИИН ${out.bin}: не сходится контрольная цифра — проверьте`);
  if (out.iik && !isValidIban(out.iik)) out.warnings.push(`ИИК ${out.iik}: не похож на правильный IBAN РК — проверьте`);
  if (out.bik && !/^[A-Z]{4}KZ[A-Z0-9]{2}$/.test(out.bik)) out.warnings.push(`БИК ${out.bik}: необычный формат`);
  if (out.name || out.bin) out.type = guessType(out.name ?? "", out.bin ?? "");
  if (!out.kbe && out.type) out.kbe = out.type === "person" || out.type === "ip" ? "19" : out.type === "gov" ? "" : "17";
  return out;
}
