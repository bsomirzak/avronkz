import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { OrdersView } from "@/components/OrdersView";

export const metadata: Metadata = {
  title: "Заказы и контакты — AVRON",
  // Раздел внутренний: здесь контакты покупателей, в поиске ему делать нечего.
  robots: { index: false, follow: false, nocache: true },
};

export default function OrdersPage() {
  return (
    <>
      <Header />
      <main className="container orders-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Заказы</span>
        </nav>

        <h1 className="orders-title">Заказы и контакты покупателей</h1>
        <p className="orders-lead">
          Данные приходят напрямую из вашего кабинета Kaspi через официальный Merchant API.
          Токен хранится на сервере и в браузер не передаётся.
        </p>

        <OrdersView />
      </main>
    </>
  );
}
