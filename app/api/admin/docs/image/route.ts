import type { NextRequest } from "next/server";
import { getImage, getSellers, saveImage, type ImageKind } from "@/lib/docs/store";

const PNG = [0x89, 0x50, 0x4e, 0x47];
const MAX = 3 * 1024 * 1024;

/** Загрузка обработанной в браузере печати/подписи (PNG). Ключ должен принадлежать одному из ИП. */
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const kind = req.nextUrl.searchParams.get("kind") as ImageKind;
  if (kind !== "stamp" && kind !== "sign") return new Response("kind: stamp | sign", { status: 400 });
  const sellers = await getSellers();
  const allowed = new Set(sellers.flatMap((s) => (kind === "stamp" ? [s.stampKey] : [s.signKey])));
  if (!allowed.has(key)) return new Response("Нет ИП с таким ключом печати/подписи", { status: 400 });
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.length > MAX) return new Response("Файл больше 3 МБ", { status: 413 });
  if (!PNG.every((b, i) => buf[i] === b)) return new Response("Нужен PNG", { status: 415 });
  await saveImage(key, kind, buf);
  return Response.json({ ok: true, bytes: buf.length });
}

/** Просмотр текущей печати/подписи в админке. */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const kind = req.nextUrl.searchParams.get("kind") as ImageKind;
  if (kind !== "stamp" && kind !== "sign") return new Response("kind", { status: 400 });
  const png = await getImage(key, kind);
  if (!png) return new Response("нет", { status: 404 });
  return new Response(Buffer.from(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
