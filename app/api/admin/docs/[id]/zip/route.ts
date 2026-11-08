import JSZip from "jszip";
import { deriveFrom } from "@/lib/docs/derive";
import { pdfForDoc } from "@/lib/docs/server";
import { getDoc, listDocs } from "@/lib/docs/store";
import { contentDisposition, docFileName, fileSlugSafe } from "@/lib/docs/totals";
import type { Doc, DocType } from "@/lib/docs/types";

/**
 * Пакет одним ZIP: счёт + накладная + гарантийный талон. Если накладной или
 * талона к счёту ещё нет — собираем их на лету (номер = номер счёта), не сохраняя.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/docs/[id]/zip">) {
  const { id } = await ctx.params;
  const inv = await getDoc(id);
  if (!inv) return new Response("Документ не найден", { status: 404 });
  const children = (await listDocs()).filter((d) => d.parentId === inv.id);
  const pick = (type: DocType): Doc =>
    children.find((d) => d.type === type) ?? deriveFrom(inv, type, { date: inv.date });
  const set: Doc[] = inv.type === "invoice" ? [inv, pick("waybill"), pick("warranty")] : [inv];
  const zip = new JSZip();
  for (const d of set) zip.file(docFileName(d), await pdfForDoc(d));
  const body = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const name = `Документы_${inv.number}_${fileSlugSafe(inv.buyer.name)}.zip`;
  return new Response(Buffer.from(body), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": contentDisposition(name), "Cache-Control": "no-store" },
  });
}
