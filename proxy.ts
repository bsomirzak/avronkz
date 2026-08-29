import { NextResponse, type NextRequest } from "next/server";

/**
 * Пароль на раздел с заказами.
 *
 * За /orders лежат имена, телефоны и адреса покупателей, поэтому раздел закрыт
 * HTTP Basic Auth. Если логин или пароль не заданы — доступ закрыт полностью:
 * лучше отдать 503, чем случайно выложить контакты клиентов в открытый доступ.
 *
 * В Next 16 middleware называется proxy — см. node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 */

/** Сравнение без раннего выхода, чтобы по времени ответа нельзя было подбирать пароль. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Требуется вход", {
    status: 401,
    headers: {
      // Только ASCII: значения заголовков — ByteString, кириллица и тире их ломают.
      "WWW-Authenticate": 'Basic realm="AVRON orders", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(request: NextRequest) {
  const user = process.env.ORDERS_USER;
  const password = process.env.ORDERS_PASSWORD;

  if (!user || !password) {
    return new NextResponse(
      "Раздел не настроен: задайте ORDERS_USER и ORDERS_PASSWORD.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  if (sep < 0) return unauthorized();

  const okUser = safeEqual(decoded.slice(0, sep), user);
  const okPass = safeEqual(decoded.slice(sep + 1), password);
  if (!okUser || !okPass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // /print не закрываем: страница ничего не хранит и не спрашивает у сервера —
  // накладные разбираются прямо в браузере продавца.
  matcher: ["/orders/:path*", "/api/kaspi/:path*"],
};
