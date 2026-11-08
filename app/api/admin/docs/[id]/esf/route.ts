import type { NextRequest } from "next/server";
import { esfContainer, esfCsv } from "@/lib/docs/esf/export";
import { validateEsf } from "@/lib/docs/esf/validate";
import { getDoc, getSeller, listDocs } from "@/lib/docs/store";
import { contentDisposition, fileSlugSafe, todayIso } from "@/lib/docs/totals";

/**
 * ЭСФ по документу: ?format=xml (импорт в ИС ЭСФ), csv (ручной перенос),
 * check (только проверка, JSON). XML с ошибками не отдаём — сначала исправить.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/docs/[id]/esf">) {
  const { id } = await ctx.params;
  const doc = await getDoc(id);
  if (!doc) return new Response("Документ не найден", { status: 404 });
  const seller = await getSeller(doc.sellerId);
  if (!seller) return new Response("ИП не найден", { status: 404 });
  const issues = validateEsf(doc, seller);
  const format = req.nextUrl.searchParams.get("format") ?? "check";
  if (format === "check") return Response.json({ issues });
  const waybill = (await listDocs()).find((d) => d.parentId === doc.id && d.type === "waybill") ?? (doc.type === "waybill" ? doc : null);
  const input = { doc, seller, waybill, issueDate: todayIso(), paymentForm: "NON_CASH" as const };
  const base = `ЭСФ_${doc.number}_${fileSlugSafe(doc.buyer.name)}`;
  if (format === "csv") {
    return new Response(esfCsv(input), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": contentDisposition(`${base}.csv`), "Cache-Control": "no-store" },
    });
  }
  if (issues.some((i) => i.level === "error") && !req.nextUrl.searchParams.has("force")) {
    return Response.json({ issues }, { status: 422 });
  }
  return new Response(esfContainer([input]), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": contentDisposition(`${base}.xml`), "Cache-Control": "no-store" },
  });
}
