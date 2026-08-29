// Проверка нормализации на фейковом ответе Kaspi. Запуск: node test-normalize.js
process.env.PORT = '8899';
process.env.KASPI_TOKEN = 'fake';

const sample = {
  data: [
    { type: 'orders', id: 'A1', attributes: {
      code: '20013004', totalPrice: 96045, creationDate: 1755000000000,
      state: 'ARCHIVE', status: 'COMPLETED', deliveryMode: 'DELIVERY_PICKUP',
      customer: { firstName: 'Иван', lastName: 'Иванов', cellPhone: '7770000000' },
      deliveryAddress: { town: 'Алматы', formattedAddress: 'Алматы, Абая 1' } } },
    // повторный заказ того же клиента, номер записан иначе
    { type: 'orders', id: 'A2', attributes: {
      code: '20013005', totalPrice: 12000, creationDate: 1755500000000,
      state: 'ARCHIVE', status: 'COMPLETED',
      customer: { firstName: 'Иван', lastName: 'Иванов', cellPhone: '87770000000' } } },
    // номер только в phoneAlias
    { type: 'orders', id: 'A3', attributes: {
      code: '20013006', totalPrice: 4000, creationDate: 1755600000000, state: 'ARCHIVE',
      phoneAlias: '+ 7 (705) 943-05-21,1111111111',
      customer: { firstName: 'Пётр', lastName: 'Петров' } } },
    // номер скрыт (Kaspi Доставка)
    { type: 'orders', id: 'A4', attributes: {
      code: '20013007', totalPrice: 7000, creationDate: 1755700000000, state: 'KASPI_DELIVERY',
      isKaspiDelivery: true, customer: { firstName: 'Аслан', lastName: 'Асланов' } } },
  ],
};

let served = false;
globalThis.fetch = async () => ({
  ok: true, status: 200,
  text: async () => JSON.stringify(served ? { data: [] } : (served = true, sample)),
});

require('./server.js');

setTimeout(async () => {
  const r = await fetch; // не используется, ниже обычный http
  const http = require('node:http');
  http.get({ port: 8899, path: '/api/orders?from=2026-08-01&to=2026-08-05&states=ARCHIVE' }, (res) => {
    let b = ''; res.on('data', (c) => (b += c));
    res.on('end', () => {
      const { orders } = JSON.parse(b);
      console.table(orders.map((o) => ({ code: o.code, name: o.name, phone: o.phonePretty || '(скрыт)', город: o.city })));
      const ok =
        orders[0] && orders.every((o) => o.code) &&
        orders.find((o) => o.code === '20013004').phone === '77770000000' &&
        orders.find((o) => o.code === '20013005').phone === '77770000000' &&
        orders.find((o) => o.code === '20013006').phone === '77059430521' &&
        orders.find((o) => o.code === '20013007').masked === true;
      console.log(ok ? '\nOK: телефоны нормализованы, скрытые помечены' : '\nFAIL');
      process.exit(ok ? 0 : 1);
    });
  });
}, 300);
