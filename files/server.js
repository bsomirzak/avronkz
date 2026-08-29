/**
 * Kaspi Contacts — локальный сервер.
 * Тянет заказы из официального Kaspi Merchant API и отдаёт нормализованный список
 * с контактами покупателей. Токен остаётся на этой машине.
 *
 * Запуск: node server.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// ---------- конфиг ----------
const PORT = Number(process.env.PORT || 8787);
const ENV = loadEnv(path.join(__dirname, '.env'));
const TOKEN_FROM_ENV = ENV.KASPI_TOKEN || process.env.KASPI_TOKEN || '';

const API = 'https://kaspi.kz/shop/api/v2/orders';
const ALL_STATES = ['NEW', 'SIGN_REQUIRED', 'PICKUP', 'DELIVERY', 'KASPI_DELIVERY', 'ARCHIVE'];
const PAGE_SIZE = 100;          // максимум, который отдаёт Kaspi
const WINDOW_DAYS = 13;         // Kaspi не принимает интервал длиннее 14 дней
const MAX_RANGE_DAYS = 180;     // предохранитель от случайного «выгрузить всё»
const THROTTLE_MS = 220;        // пауза между запросами, чтобы не ловить 429
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- работа с Kaspi ----------
async function kaspiGet(params, token, attempt = 0) {
  const url = `${API}?${params.toString()}`;
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'X-Auth-Token': token,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'User-Agent': 'kaspi-contacts/1.0',
      },
    });
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      await sleep(800 * (attempt + 1));
      return kaspiGet(params, token, attempt + 1);
    }
    throw new Error('Kaspi не отвечает. Проверьте интернет и попробуйте ещё раз.');
  }

  const text = await res.text();

  // 429 и 5xx — временные, повторяем с паузой
  if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
    await sleep(1200 * (attempt + 1));
    return kaspiGet(params, token, attempt + 1);
  }
  if (!res.ok) {
    const err = new Error(`Kaspi ответил ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Kaspi вернул не JSON. Обычно это значит, что токен неверный.');
  }
}

/** Один диапазон дат + одно состояние, со всеми страницами. */
async function fetchWindow({ token, state, from, to, log }) {
  const rows = [];
  for (let page = 0; page < 200; page++) {
    const params = new URLSearchParams({
      'page[number]': String(page),
      'page[size]': String(PAGE_SIZE),
      'filter[orders][state]': state,
      'filter[orders][creationDate][$ge]': String(from),
      'filter[orders][creationDate][$le]': String(to),
    });

    const json = await kaspiGet(params, token);
    const data = Array.isArray(json.data) ? json.data : [];
    rows.push(...data);
    log.requests++;

    if (data.length < PAGE_SIZE) break;
    await sleep(THROTTLE_MS);
  }
  return rows;
}

/** Разбивает период на окна по 13 дней и обходит выбранные состояния. */
async function fetchOrders({ token, fromMs, toMs, states, log }) {
  const raw = [];
  const step = WINDOW_DAYS * 24 * 60 * 60 * 1000;

  for (let start = fromMs; start <= toMs; start += step) {
    const end = Math.min(start + step - 1, toMs);
    for (const state of states) {
      try {
        raw.push(...(await fetchWindow({ token, state, from: start, to: end, log })));
      } catch (e) {
        if (e.status === 401 || e.status === 403) throw e;
        log.warnings.push(`${state} ${new Date(start).toISOString().slice(0, 10)}: ${e.message}`);
      }
      await sleep(THROTTLE_MS);
    }
  }
  return raw;
}

// ---------- нормализация ----------
/** Приводит номер к формату 77XXXXXXXXX (11 цифр). Возвращает '' если не похоже на номер. */
function normalizePhone(input) {
  if (!input) return '';
  const d = String(input).replace(/\D/g, '');
  if (d.length === 10) return '7' + d;
  if (d.length === 11 && (d[0] === '8' || d[0] === '7')) return '7' + d.slice(1);
  return '';
}

function prettyPhone(e164) {
  if (e164.length !== 11) return e164;
  return `+${e164[0]} (${e164.slice(1, 4)}) ${e164.slice(4, 7)}-${e164.slice(7, 9)}-${e164.slice(9)}`;
}

function pickPhone(a) {
  const candidates = [
    a?.customer?.cellPhone,
    a?.recipient?.cellPhone,
    // phoneAlias приходит строкой вида "+ 7 (705) 943-05-21,1111111111"
    typeof a?.phoneAlias === 'string' ? a.phoneAlias.split(',')[0] : null,
  ];
  for (const c of candidates) {
    const n = normalizePhone(c);
    if (n) return n;
  }
  return '';
}

function fullName(a) {
  const c = a?.customer || {};
  const r = a?.recipient || {};
  const name =
    [c.lastName, c.firstName, c.name].filter(Boolean).join(' ').trim() ||
    [r.lastName, r.firstName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function normalize(order) {
  const a = order.attributes || {};
  const addr = a.deliveryAddress || {};
  const phone = pickPhone(a);
  return {
    id: order.id,
    code: a.code || '',
    date: a.creationDate || null,
    state: a.state || '',
    status: a.status || '',
    name: fullName(a),
    phone,
    phonePretty: phone ? prettyPhone(phone) : '',
    masked: !phone,
    total: Number(a.totalPrice || 0),
    city: addr.town || '',
    address: addr.formattedAddress || '',
    deliveryMode: a.deliveryMode || '',
    kaspiDelivery: Boolean(a.isKaspiDelivery),
  };
}

// ---------- HTTP ----------
async function handleOrders(req, res, url) {
  const token = req.headers['x-kaspi-token'] || TOKEN_FROM_ENV;
  if (!token) return json(res, 400, { error: 'Токен не задан. Добавьте его в .env или в поле на странице.' });

  const q = url.searchParams;
  const to = q.get('to') ? endOfDay(q.get('to')) : Date.now();
  const from = q.get('from') ? startOfDay(q.get('from')) : to - 30 * 864e5;

  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    return json(res, 400, { error: 'Некорректные даты периода.' });
  }
  const days = (to - from) / 864e5;
  if (days > MAX_RANGE_DAYS) {
    return json(res, 400, { error: `Период больше ${MAX_RANGE_DAYS} дней. Разбейте на части.` });
  }

  const requested = (q.get('states') || 'ARCHIVE').split(',').map((s) => s.trim()).filter(Boolean);
  const states = requested.filter((s) => ALL_STATES.includes(s));
  if (!states.length) return json(res, 400, { error: 'Не выбрано ни одного статуса заказа.' });

  const log = { requests: 0, warnings: [] };
  try {
    const raw = await fetchOrders({ token, fromMs: from, toMs: to, states, log });

    const byId = new Map();
    for (const o of raw) if (!byId.has(o.id)) byId.set(o.id, normalize(o));
    const orders = [...byId.values()].sort((a, b) => (b.date || 0) - (a.date || 0));

    json(res, 200, { orders, meta: { requests: log.requests, warnings: log.warnings, from, to, states } });
  } catch (e) {
    const code = e.status === 401 || e.status === 403 ? 401 : 502;
    const msg =
      code === 401
        ? 'Kaspi отклонил токен. Сформируйте его заново: кабинет продавца → Настройки → Токен API.'
        : e.message;
    json(res, code, { error: msg });
  }
}

const startOfDay = (s) => new Date(`${s}T00:00:00+05:00`).getTime();
const endOfDay = (s) => new Date(`${s}T23:59:59+05:00`).getTime();

function json(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}

function serveStatic(res, file) {
  const full = path.join(__dirname, 'public', file);
  if (!full.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(full)) {
    res.writeHead(404).end('Not found');
    return;
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/api/orders') return handleOrders(req, res, url);
    if (url.pathname === '/api/config') return json(res, 200, { hasToken: Boolean(TOKEN_FROM_ENV), states: ALL_STATES });
    return serveStatic(res, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  })
  .listen(PORT, () => {
    console.log(`\n  Kaspi Contacts → http://localhost:${PORT}`);
    console.log(`  Токен из .env: ${TOKEN_FROM_ENV ? 'найден' : 'не найден (введите на странице)'}\n`);
  });
