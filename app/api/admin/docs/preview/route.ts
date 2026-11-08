import type { NextRequest } from "next/server";
import { pdfForDoc, pdfResponse } from "@/lib/docs/server";
import { contentDisposition, docFileName } from "@/lib/docs/totals";
import type { Doc } from "@/lib/docs/types";

/** Предпросмотр несохранённого документа: форма шлёт JSON, получает PDF. */
export async function POST(req: NextRequest) {
  const doc = (await req.json()) as Doc;
  try {
    const pdf = await pdfForDoc(doc);
    const name = docFileName(doc);
    return pdfResponse(pdf, name, contentDisposition(name, true));
  } catch (e) {
    return new Response((e as Error).message, { status: 400 });
  }
}
