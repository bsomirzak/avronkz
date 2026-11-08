import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRequisites, isValidBin, isValidIban } from "../lib/docs/parse.ts";

test("контрольная цифра ИИН/БИН", () => {
  for (const ok of ["981014301009", "050820500624", "010614501060", "220742006852"]) assert.ok(isValidBin(ok), ok);
  assert.ok(!isValidBin("981014301008"));
  assert.ok(!isValidBin("12345"));
});

test("IBAN РК", () => {
  assert.ok(isValidIban("KZ03551A600004105934"));
  assert.ok(isValidIban("KZ93551X600008127112"));
  assert.ok(!isValidIban("KZ03551A600004105935"));
});

test("классический блок с двоеточиями", () => {
  const r = parseRequisites(`ТОО «KST BETON 2022»
БИН: 220740014391
Юр. адрес: РК, г. Костанай, ул. Байтурсынова 95
Банк: АО «Kaspi Bank»
БИК: CASPKZKA
ИИК: KZ59722S000012345678
Кбе: 17
Директор: Иванов Иван Иванович
Тел: +7 701 123 45 67
email: info@kst.kz`);
  assert.equal(r.name, "ТОО «KST BETON 2022»");
  assert.equal(r.bin, "220740014391");
  assert.equal(r.address, "РК, г. Костанай, ул. Байтурсынова 95");
  assert.equal(r.bank, "АО «Kaspi Bank»");
  assert.equal(r.bik, "CASPKZKA");
  assert.equal(r.iik, "KZ59722S000012345678");
  assert.equal(r.kbe, "17");
  assert.equal(r.headName, "Иванов Иван Иванович");
  assert.equal(r.headPosition, "Директор");
  assert.equal(r.phone, "+77011234567");
  assert.equal(r.email, "info@kst.kz");
  assert.equal(r.type, "too");
});

test("пробелы в номерах, кириллица в IBAN, тире и табы", () => {
  const r = parseRequisites(`Наименование — КГУ «Средняя школа №12»
БИН (ИИН)\t190 140 900 097
Р/с — КZ 226 018 821 000 029 331
БИК — НSВКKZКХ
Банк получателя — АО «Народный Банк Казахстана»`);
  assert.equal(r.name, "КГУ «Средняя школа №12»");
  assert.equal(r.bin, "190140900097");
  assert.equal(r.iik, "KZ226018821000029331");
  assert.equal(r.bik, "HSBKKZKX");
  assert.equal(r.bank, "АО «Народный Банк Казахстана»");
  assert.equal(r.type, "gov");
});

test("подписи IBAN / Номер счёта / ИИН/БИН и строки без подписей", () => {
  const r = parseRequisites(`Представительство АО «Атабай Кимья Санайи Ве Тиджарет Аноним Ширкети»
ИИН/БИН 220742006852
РК, г. Алматы, Бостандыкский район, микрорайон Керемет, дом 6, кв. 15
IBAN KZ03551A600004105934
KSNVKZKA`);
  assert.equal(r.bin, "220742006852");
  assert.equal(r.type, "foreign_rep");
  assert.match(r.address ?? "", /Керемет/);
  assert.equal(r.iik, "KZ03551A600004105934");
  assert.equal(r.bik, "KSNVKZKA");
  assert.equal(r.warnings.length, 0);

  const r2 = parseRequisites("Номер счёта: KZ93 551X 6000 0812 7112\nИИН 050820500624\nИП КУАНДЫК");
  assert.equal(r2.iik, "KZ93551X600008127112");
  assert.equal(r2.type, "ip");
});

test("ошибочный БИН даёт предупреждение, а не молчаливое сохранение", () => {
  const r = parseRequisites("ТОО Ромашка\nБИН 123456789012");
  assert.equal(r.bin, "123456789012");
  assert.equal(r.warnings.length, 1);
});
