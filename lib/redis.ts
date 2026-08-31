/**
 * Тонкий клиент Upstash Redis по REST — без SDK, чтобы не тянуть зависимость
 * ради пары команд. Переменные добавляет Vercel при подключении базы
 * (Storage → Marketplace → Upstash Redis); Marketplace называет их то KV_*,
 * то UPSTASH_*, поэтому читаем оба варианта.
 */

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

/** Есть ли внешнее хранилище. Без него всё живёт в памяти процесса. */
export const persistent = Boolean(URL_ && TOKEN);

async function call<T>(path: string, body: unknown): Promise<T | null> {
  if (!persistent) return null;
  try {
    const res = await fetch(`${URL_}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[redis]", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error("[redis] запрос не прошёл", e);
    return null;
  }
}

/** Одна команда: ["GET", "ключ"] → значение. */
export async function redis<T>(command: (string | number)[]): Promise<T | null> {
  const data = await call<{ result: T }>("", command);
  return data ? data.result : null;
}

/** Несколько команд одним запросом — заметно быстрее, когда нужны десятки ключей. */
export async function pipeline<T>(commands: (string | number)[][]): Promise<T[] | null> {
  if (!commands.length) return [];
  const data = await call<{ result: T }[]>("/pipeline", commands);
  return data ? data.map((item) => item.result) : null;
}
