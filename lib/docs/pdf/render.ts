/**
 * Сборка PDF любого документа. Печать и подпись приходят байтами, но
 * принимаются только с ключом того ИП, который стоит поставщиком в документе —
 * подставить чужую печать нельзя даже по ошибке в вызывающем коде.
 */

import type { Doc, Seller, Settings } from "../types.ts";
import { makeCtx, type Seal } from "./common.ts";
import { drawInvoice } from "./invoice.ts";
import { drawWaybill } from "./waybill.ts";
import { drawWarranty } from "./warranty.ts";
import { drawOffer } from "./offer.ts";
import { newPdf } from "./kit.ts";
import { DOC_TYPE_LABEL } from "../types.ts";

export type SealBytes = {
  stamp?: { key: string; png: Uint8Array } | null;
  sign?: { key: string; png: Uint8Array } | null;
};

export class SealMismatchError extends Error {}

export async function renderPdf(doc: Doc, seller: Seller, settings: Settings, bytes: SealBytes = {}): Promise<Uint8Array> {
  if (doc.sellerId !== seller.id) throw new SealMismatchError("ИП документа и переданный ИП не совпадают");
  if (bytes.stamp && bytes.stamp.key !== seller.stampKey) throw new SealMismatchError(`Печать «${bytes.stamp.key}» не принадлежит ${seller.name}`);
  if (bytes.sign && bytes.sign.key !== seller.signKey) throw new SealMismatchError(`Подпись «${bytes.sign.key}» не принадлежит ${seller.name}`);

  const { pdf, fonts } = await newPdf(`${DOC_TYPE_LABEL[doc.type]} № ${doc.number}`);
  const seal: Seal = {};
  if (doc.withStamp && bytes.stamp) seal.stamp = await pdf.embedPng(bytes.stamp.png);
  if (doc.withSign && bytes.sign) seal.sign = await pdf.embedPng(bytes.sign.png);
  const ctx = makeCtx(doc, seller, settings, seal);

  if (doc.type === "invoice") drawInvoice(pdf, fonts, ctx);
  else if (doc.type === "waybill") drawWaybill(pdf, fonts, ctx);
  else if (doc.type === "warranty") drawWarranty(pdf, fonts, ctx);
  else drawOffer(pdf, fonts, ctx);

  return pdf.save();
}
