import type { PDFImage } from "pdf-lib";
import { totals, type Totals } from "../totals.ts";
import type { Doc, Placement, Seller, Settings } from "../types.ts";
import { MM, drawCentered, type Canvas } from "./kit.ts";

export type Seal = { stamp?: PDFImage; sign?: PDFImage };

export type Ctx = {
  doc: Doc;
  seller: Seller;
  settings: Settings;
  t: Totals;
  seal: Seal;
};

export function makeCtx(doc: Doc, seller: Seller, settings: Settings, seal: Seal): Ctx {
  return { doc, seller, settings, t: totals(doc), seal };
}

/**
 * Подпись — на линию подписи, печать — на «М.П.», с частичным перекрытием
 * подписи, как вживую. Смещения и размеры — из настроек документа, в мм
 * (dy > 0 — ниже).
 */
export function drawSeal(
  c: Canvas,
  ctx: Ctx,
  anchors: { sign?: { x: number; y: number }[]; stamp?: { x: number; y: number } },
): void {
  const p: Placement = ctx.settings.placement[ctx.doc.type];
  if (ctx.doc.withSign && ctx.seal.sign && anchors.sign) {
    for (const a of anchors.sign) drawCentered(c, ctx.seal.sign, a.x + p.signDx * MM, a.y + p.signDy * MM, p.signW * MM);
  }
  if (ctx.doc.withStamp && ctx.seal.stamp && anchors.stamp) {
    drawCentered(c, ctx.seal.stamp, anchors.stamp.x + p.stampDx * MM, anchors.stamp.y + p.stampDy * MM, p.stampD * MM);
  }
}

/** «Ед.» без точки в счёте, «шт.» в накладной — как в прежних документах. */
export function unitShort(u: string): string {
  return u.replace(/\.$/, "");
}

export function qtyFmt(q: number, decimals = 0): string {
  return q.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: 3 }).replace(/ /g, " ");
}
