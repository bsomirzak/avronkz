import type { Seller } from "../types.ts";
import type { Canvas } from "./kit.ts";

/** Шапка гарантийного талона и КП: AVRON слева, реквизиты поставщика справа. Возвращает y под шапкой. */
export function brandHeader(c: Canvas, seller: Seller, L: number, R: number): number {
  c.text("AVRON", L, 40, { size: 26, font: "b", color: [0.06, 0.13, 0.33] });
  c.text("avron.kz", L, 72, { size: 9, color: [0.3, 0.3, 0.3] });
  const lines = [
    seller.name,
    `ИИН ${seller.iin}`,
    seller.address,
    `${seller.bank}, БИК ${seller.bik}`,
    `ИИК ${seller.iik}`,
    [seller.phone, seller.email].filter(Boolean).join(", "),
  ].filter(Boolean);
  let y = 40;
  const w = 260;
  lines.forEach((l, i) => {
    y += c.para(l, R - w, y, w, { size: i === 0 ? 8.5 : 7.5, font: i === 0 ? "b" : "r", align: "right", lead: 10 });
  });
  y = Math.max(y, 86) + 8;
  c.line(L, y, R, y, 1.5);
  return y + 18;
}
