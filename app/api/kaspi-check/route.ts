// ВРЕМЕННО: проверка, отвечает ли Kaspi серверу Vercel. Удалить после диагностики.
export const dynamic = "force-dynamic";

export async function GET() {
  const url =
    "https://kaspi.kz/yml/review-view/api/v1/reviews/product/160858335?filter=COMMENT&sort=POPULARITY&limit=1&merchantCodes=30391363&withAgg=true";
  const variants: Record<string, Record<string, string>> = {
    plain: { Accept: "application/json" },
    browser: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      Referer: "https://kaspi.kz/shop/p/avron-lt-65-65-djuim-160858335/",
    },
  };
  const out: Record<string, unknown> = { region: process.env.VERCEL_REGION ?? null };
  for (const [name, headers] of Object.entries(variants)) {
    try {
      const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
      out[name] = { status: res.status, body: (await res.text()).slice(0, 200) };
    } catch (e) {
      out[name] = { error: String(e) };
    }
  }
  return Response.json(out);
}
