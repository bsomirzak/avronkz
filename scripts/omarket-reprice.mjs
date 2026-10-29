/**
 * Пересчёт цен ИП ОМЫРЗАК на Omarket по свежим ценам конкурентов.
 *
 *   npm run omarket:reprice -- observations.json          # показать, что изменится
 *   npm run omarket:reprice -- observations.json --write  # записать в data/
 *
 * observations.json — то, что увидели на карточках утром:
 *   { "AV13064389": { "min": 745000, "seller": "ИП БОТБАЕВА" },
 *     "AV13723970": { "min": null },          // других продавцов нет
 *     "AV13064421": { "stronger": true } }    // характеристики сильнее наших
 * min — самая низкая цена другого продавца, без наших ИП (ОМЫРЗАК, Куандык).
 * Карточки, которых нет в файле, не трогаем.
 *
 * Правило (согласовано 29.10.2026):
 *   • есть другие продавцы → их минимум − 1 000 ₸, но не ниже порога;
 *   • других продавцов нет → 650 000 ₸ за 65", 750 000 ₸ за 75";
 *   • характеристики сильнее наших → в архив (из фида пропадает);
 *   • чужая цена ниже 300 000 ₸ — опечатка продавца: карточку пропускаем,
 *     в наблюдение надо записать следующую цену;
 *   • mode "fixed" (наши карточки AVRON) не трогаем.
 *
 * Сеть скрипт не трогает: цены конкурентов собираются вручную в браузере,
 * автоматический обход omarket.kz запрещён правилами площадки.
 */

import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../data/omarket-offers.json", import.meta.url);

const FLOOR = { 65: 489_990, 75: 599_990 };
const ALONE = { 65: 650_000, 75: 750_000 };
const STEP = 1_000;
const TYPO_BELOW = 300_000;

const [obsPath, flag] = process.argv.slice(2);
if (!obsPath) {
  console.error("Нужен файл наблюдений: npm run omarket:reprice -- observations.json [--write]");
  process.exit(1);
}

const offers = JSON.parse(readFileSync(FILE, "utf8"));
const observations = JSON.parse(readFileSync(obsPath, "utf8"));
const bySku = new Map(offers.map((o) => [o.sku, o]));

const fmt = (n) => (n == null ? "—" : n.toLocaleString("ru-RU"));
const changes = [];

for (const [sku, obs] of Object.entries(observations)) {
  const offer = bySku.get(sku);
  if (!offer) {
    console.warn(`! ${sku}: нет в data/omarket-offers.json — пропускаю`);
    continue;
  }
  if (offer.mode === "fixed") continue;

  if (obs.stronger) {
    if (offer.mode !== "archived") {
      changes.push({ offer, from: offer.price, to: offer.price, note: "в архив: характеристики сильнее" });
      offer.mode = "archived";
    }
    continue;
  }

  // Опечатку не превращаем в «продавцов нет»: в наблюдение нужно записать
  // следующую по величине цену, а пока карточку не трогаем.
  if (obs.min != null && obs.min < TYPO_BELOW) {
    console.warn(`! ${sku}: чужая ${fmt(obs.min)} похожа на опечатку — укажите следующую цену`);
    continue;
  }

  const min = obs.min ?? null;
  let target;
  let note;
  if (min == null) {
    target = ALONE[offer.diag];
    note = "других продавцов нет";
  } else {
    target = min - STEP;
    note = `мин. ${fmt(min)}${obs.seller ? ` (${obs.seller})` : ""}`;
    if (target < FLOOR[offer.diag]) {
      target = FLOOR[offer.diag];
      note += " — ниже порога, стоим на пороге";
    }
  }

  if (offer.mode === "archived") {
    offer.mode = "auto";
    note += ", вернули из архива";
  }
  if (target !== offer.price || note.includes("вернули")) {
    changes.push({ offer, from: offer.price, to: target, note });
    offer.price = target;
  }
}

if (!changes.length) {
  console.log("Изменений нет.");
} else {
  for (const c of changes) {
    const arrow = c.to > c.from ? "↑" : c.to < c.from ? "↓" : "·";
    console.log(`${arrow} ${c.offer.sku}  ${fmt(c.from)} → ${fmt(c.to)}  ${c.offer.diag}"  ${c.offer.name.slice(0, 60)}  [${c.note}]`);
  }
  console.log(`\nИзменится: ${changes.length}`);
}

if (flag === "--write" && changes.length) {
  writeFileSync(FILE, "[\n" + offers.map((o) => "  " + JSON.stringify(o)).join(",\n") + "\n]\n");
  console.log("Записано в data/omarket-offers.json");
}
