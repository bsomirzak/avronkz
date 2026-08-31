import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StatsView } from "@/components/StatsView";
import { PRODUCTS } from "@/lib/products";

export const metadata: Metadata = {
  title: "Клики и переходы — AVRON",
  // Внутренняя статистика, в поиске ей делать нечего.
  robots: { index: false, follow: false, nocache: true },
};

export default function StatsPage() {
  // Названия товаров считаем на сервере: незачем тащить весь каталог в браузер.
  const names = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.shortName || p.name]));

  return (
    <>
      <Header />
      <main className="container stats-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Статистика</span>
        </nav>

        <h1 className="stats-title">Клики и переходы</h1>
        <p className="stats-lead">
          Свой счётчик: сколько раз нажали «Купить на Kaspi», написали в WhatsApp или позвонили.
          Считается на нашем сервере, поэтому цифры не теряются из-за блокировщиков рекламы.
          Это переходы, а не оплаченные заказы — сами покупки видны только в кабинете Kaspi.
        </p>

        <StatsView names={names} />
      </main>
    </>
  );
}
