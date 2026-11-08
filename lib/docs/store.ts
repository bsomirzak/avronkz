/**
 * Хранилище модуля документов — Upstash Redis (тот же, что у заказов и цен).
 *
 * Ключи (префикс DOCS_PREFIX, по умолчанию «docs:»; для локальных опытов
 * задайте DOCS_PREFIX=docs-dev:, чтобы не смешивать с боевыми):
 *   sellers, buyers, products, settings — JSON целиком (их десятки, не тысячи)
 *   docs      — hash id → JSON документа
 *   counters  — hash «<ИП>:<тип>» → последний выданный номер
 *   img:<ключ>:stamp|sign — PNG печати/подписи в base64
 *
 * Без Redis всё живёт в памяти процесса — годится только для разработки.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pipeline, persistent, redis } from "@/lib/redis";
import { SEED_PRODUCTS, SEED_SELLERS, SEED_SETTINGS } from "./seed";
import type { Buyer, CatalogItem, Doc, DocType, Seller, Settings } from "./types";

const P = process.env.DOCS_PREFIX ?? "docs:";
const memory = new Map<string, string>();
const memoryHash = new Map<string, Map<string, string>>();

async function getJson<T>(key: string): Promise<T | null> {
  const raw = persistent ? await redis<string>(["GET", P + key]) : (memory.get(key) ?? null);
  return raw ? (JSON.parse(raw) as T) : null;
}

async function setJson(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  if (persistent) await redis(["SET", P + key, raw]);
  else memory.set(key, raw);
}

function mhash(key: string) {
  let h = memoryHash.get(key);
  if (!h) memoryHash.set(key, (h = new Map()));
  return h;
}

// ── Справочники ──────────────────────────────────────────────────────────────

export async function getSellers(): Promise<Seller[]> {
  const saved = await getJson<Seller[]>("sellers");
  if (!saved) return SEED_SELLERS;
  // Новые поля из сидов подмешиваем к сохранённым ИП, чтобы старые записи не ломались.
  return saved.map((s) => ({ ...(SEED_SELLERS.find((x) => x.id === s.id) ?? SEED_SELLERS[0]), ...s }));
}

export async function getSeller(id: string): Promise<Seller | undefined> {
  return (await getSellers()).find((s) => s.id === id);
}

export async function saveSellers(list: Seller[]): Promise<void> {
  await setJson("sellers", list);
}

export async function getBuyers(): Promise<Buyer[]> {
  return (await getJson<Buyer[]>("buyers")) ?? [];
}

export async function saveBuyer(b: Buyer): Promise<Buyer> {
  const list = await getBuyers();
  const i = list.findIndex((x) => x.id === b.id);
  const next = { ...b, updatedAt: Date.now() };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  await setJson("buyers", list);
  return next;
}

export async function deleteBuyer(id: string): Promise<void> {
  await setJson("buyers", (await getBuyers()).filter((b) => b.id !== id));
}

export async function getProducts(): Promise<CatalogItem[]> {
  return (await getJson<CatalogItem[]>("products")) ?? SEED_PRODUCTS;
}

export async function saveProducts(list: CatalogItem[]): Promise<void> {
  await setJson("products", list);
}

export async function getSettings(): Promise<Settings> {
  const s = await getJson<Partial<Settings>>("settings");
  if (!s) return SEED_SETTINGS;
  return {
    ...SEED_SETTINGS,
    ...s,
    texts: { ...SEED_SETTINGS.texts, ...s.texts },
    placement: { ...SEED_SETTINGS.placement, ...s.placement },
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  await setJson("settings", s);
}

// ── Документы ────────────────────────────────────────────────────────────────

export async function listDocs(): Promise<Doc[]> {
  let entries: string[];
  if (persistent) {
    const flat = (await redis<string[]>(["HGETALL", P + "docs"])) ?? [];
    entries = flat.filter((_, i) => i % 2 === 1);
  } else entries = [...mhash("docs").values()];
  return entries.map((r) => JSON.parse(r) as Doc).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
}

export async function getDoc(id: string): Promise<Doc | null> {
  const raw = persistent ? await redis<string>(["HGET", P + "docs", id]) : (mhash("docs").get(id) ?? null);
  return raw ? (JSON.parse(raw) as Doc) : null;
}

export async function saveDoc(doc: Doc): Promise<Doc> {
  const next = { ...doc, updatedAt: Date.now() };
  const raw = JSON.stringify(next);
  // Счётчик двигаем только вперёд: ручной номер «5» после «66» его не откатит.
  const n = Number(doc.number);
  const field = `${doc.sellerId}:${doc.type}`;
  if (persistent) {
    const cmds: (string | number)[][] = [["HSET", P + "docs", doc.id, raw]];
    if (Number.isInteger(n) && n > 0) {
      const cur = Number((await redis<string>(["HGET", P + "counters", field])) ?? 0);
      if (n > cur) cmds.push(["HSET", P + "counters", field, n]);
    }
    await pipeline(cmds);
  } else {
    mhash("docs").set(doc.id, raw);
    const cur = Number(mhash("counters").get(field) ?? 0);
    if (Number.isInteger(n) && n > cur) mhash("counters").set(field, String(n));
  }
  return next;
}

export async function deleteDoc(id: string): Promise<void> {
  if (persistent) await redis(["HDEL", P + "docs", id]);
  else mhash("docs").delete(id);
}

export async function getCounters(): Promise<Record<string, number>> {
  let flat: string[];
  if (persistent) flat = (await redis<string[]>(["HGETALL", P + "counters"])) ?? [];
  else flat = [...mhash("counters").entries()].flat();
  const out: Record<string, number> = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]);
  return out;
}

/** Ручная правка счётчика («сбросить номер»): следующий документ получит value + 1. */
export async function setCounter(sellerId: string, type: DocType, value: number): Promise<void> {
  const field = `${sellerId}:${type}`;
  if (persistent) await redis(["HSET", P + "counters", field, value]);
  else mhash("counters").set(field, String(value));
}

/** Следующий номер: больше и счётчика, и любого уже выданного номера. */
export async function nextNumber(sellerId: string, type: DocType): Promise<string> {
  const counters = await getCounters();
  let max = counters[`${sellerId}:${type}`] ?? 0;
  for (const d of await listDocs()) {
    if (d.sellerId === sellerId && d.type === type) {
      const n = Number(d.number);
      if (Number.isInteger(n) && n > max) max = n;
    }
  }
  return String(max + 1);
}

/** Документы того же ИП и типа с тем же номером — для предупреждения о дубле. */
export async function findDuplicates(doc: Pick<Doc, "id" | "sellerId" | "type" | "number">): Promise<Doc[]> {
  return (await listDocs()).filter(
    (d) => d.id !== doc.id && d.sellerId === doc.sellerId && d.type === doc.type && d.number.trim() === doc.number.trim(),
  );
}

// ── Печати и подписи ─────────────────────────────────────────────────────────

export type ImageKind = "stamp" | "sign";

export async function getImage(key: string, kind: ImageKind): Promise<Uint8Array | null> {
  const name = `img:${key}:${kind}`;
  const b64 = persistent ? await redis<string>(["GET", P + name]) : (memory.get(name) ?? null);
  if (b64) return Buffer.from(b64, "base64");
  // Локально — из папки stamps/ (она в .gitignore, на сервер не попадает).
  try {
    return await readFile(path.join(process.cwd(), "stamps", `${kind}_${key}.png`));
  } catch {
    return null;
  }
}

export async function saveImage(key: string, kind: ImageKind, png: Uint8Array): Promise<void> {
  const name = `img:${key}:${kind}`;
  const b64 = Buffer.from(png).toString("base64");
  if (persistent) await redis(["SET", P + name, b64]);
  else memory.set(name, b64);
}

export async function hasImages(): Promise<Record<string, boolean>> {
  const keys = (await getSellers()).flatMap((s) => [`img:${s.stampKey}:stamp`, `img:${s.signKey}:sign`]);
  const uniq = [...new Set(keys)];
  if (!persistent) return Object.fromEntries(uniq.map((k) => [k, memory.has(k)]));
  const res = (await pipeline<number>(uniq.map((k) => ["EXISTS", P + k]))) ?? [];
  return Object.fromEntries(uniq.map((k, i) => [k, res[i] === 1]));
}

export const storageIsPersistent = persistent;
