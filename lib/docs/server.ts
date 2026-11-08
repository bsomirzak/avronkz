/** Серверная сборка PDF: подтягивает ИП, настройки и печати именно этого ИП. */

import { renderPdf } from "./pdf/render";
import { getImage, getSeller, getSettings } from "./store";
import type { Doc } from "./types";

export async function pdfForDoc(doc: Doc): Promise<Uint8Array> {
  const seller = await getSeller(doc.sellerId);
  if (!seller) throw new Error(`ИП «${doc.sellerId}» не найден`);
  const [settings, stamp, sign] = await Promise.all([
    getSettings(),
    doc.withStamp ? getImage(seller.stampKey, "stamp") : null,
    doc.withSign ? getImage(seller.signKey, "sign") : null,
  ]);
  return renderPdf(doc, seller, settings, {
    stamp: stamp ? { key: seller.stampKey, png: stamp } : null,
    sign: sign ? { key: seller.signKey, png: sign } : null,
  });
}

export function pdfResponse(pdf: Uint8Array, fileName: string, disposition: string): Response {
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-File-Name": encodeURIComponent(fileName),
    },
  });
}
