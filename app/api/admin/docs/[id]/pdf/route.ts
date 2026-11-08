import type { NextRequest } from "next/server";
import { pdfForDoc, pdfResponse } from "@/lib/docs/server";
import { getDoc } from "@/lib/docs/store";
import { contentDisposition, docFileName } from "@/lib/docs/totals";

/** PDF сохранённого документа; ?inline=1 — открыть в браузере, иначе скачать. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/docs/[id]/pdf">) {
  const { id } = await ctx.params;
  const doc = await getDoc(id);
  if (!doc) return new Response("Документ не найден", { status: 404 });
  const name = docFileName(doc);
  return pdfResponse(await pdfForDoc(doc), name, contentDisposition(name, req.nextUrl.searchParams.has("inline")));
}
