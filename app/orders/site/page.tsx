import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PAYMENT_METHODS } from "@/lib/order-options";
import { formatPrice } from "@/lib/products";
import { listOrders, orderTotal, prettyPhone } from "@/lib/site-orders";

export const metadata: Metadata = {
  title: "Заказы с сайта — AVRON",
  // Контакты покупателей: в поиске этой странице делать нечего. Пароль — proxy.ts.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Almaty",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function SiteOrdersPage() {
  const orders = await listOrders();

  return (
    <>
      <Header />
      <main className="container orders-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <Link href="/orders">Заказы</Link>
          <span className="sep">/</span>
          <span className="current">С сайта</span>
        </nav>

        <h1 className="orders-title">Заказы с сайта</h1>
        <p className="orders-lead">
          Заказы через кнопку «Заказать» на странице товара, по цене сайта. Последние 200, новые сверху.
          Время — по Алматы.
        </p>

        {orders === null ? (
          <p className="orders-error">Не удалось прочитать заказы: хранилище недоступно.</p>
        ) : orders.length === 0 ? (
          <p className="orders-note">Заказов с сайта пока нет.</p>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>№</th>
                  <th>Товар</th>
                  <th>Сумма</th>
                  <th>Покупатель</th>
                  <th>Город</th>
                  <th>Оплата</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const total = orderTotal(o);
                  return (
                    <tr key={o.id}>
                      <td>{dateFormat.format(o.createdAt)}</td>
                      <td>{o.id}</td>
                      <td>
                        <Link href={`/products/${o.productId}`}>{o.productName}</Link> × {o.qty}
                      </td>
                      <td>{total === null ? "по запросу" : formatPrice(total)}</td>
                      <td>
                        {o.name}
                        <br />
                        <a href={`tel:+${o.phone}`}>{prettyPhone(o.phone)}</a>{" · "}
                        <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                      </td>
                      <td>{o.city}</td>
                      <td>
                        {PAYMENT_METHODS[o.payment] ?? o.payment}
                        {o.company && (
                          <>
                            <br />
                            {o.company}, БИН {o.bin}
                          </>
                        )}
                      </td>
                      <td>{o.comment ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
