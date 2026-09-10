import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PricesEditor } from "@/components/PricesEditor";

export const metadata: Metadata = {
  title: "Цены — AVRON",
  // Внутренний раздел: в поиске ему делать нечего.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="container admin-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Цены</span>
        </nav>

        <h1 className="admin-title">Цены товаров</h1>
        <p className="admin-lead">
          Правьте цены прямо здесь — пересобирать сайт не нужно. Новая цена появляется в каталоге,
          на странице товара и в ответах WhatsApp-бота в течение нескольких секунд. Платёж по рассрочке и процент
          скидки пересчитываются из цены при сохранении — в колонке «Будет на сайте» видно заранее. «Вернуть» ставит цену обратно ту, что прошита в коде.
        </p>

        <PricesEditor />
      </main>
    </>
  );
}
