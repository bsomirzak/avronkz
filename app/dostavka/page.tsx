import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";

// Условия здесь, во вкладке «Доставка» на странице товара и в настройках
// доставки Google Merchant Center должны совпадать — иначе Merchant Center
// считает это искажением фактов.
export const metadata: Metadata = {
  title: "Доставка по Алматы и Казахстану",
  description: `Как ${SITE.name} доставляет заказы: по Алматы, СДЭК, железная дорога, Jet Logistics от двери до двери и Kaspi Доставка. Стоимость и для каких товаров подходит каждый способ.`,
  alternates: { canonical: "/dostavka" },
};

/** Дата последнего пересмотра условий — обновляйте при изменениях. */
const UPDATED = "18 сентября 2026 года";

export default function DeliveryPage() {
  return (
    <>
      <Header />
      <main className="container legal-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Доставка</span>
        </nav>

        <h1>Доставка</h1>
        <p className="legal-updated">Обновлено {UPDATED}</p>

        <p>
          Доставляем по всему Казахстану. Способ подбираем под размер товара и ваш город —
          менеджер согласует его с вами при оформлении заказа и заранее назовёт стоимость.
        </p>

        <h2>По Алматы</h2>
        <p>Бесплатно при заказе от 50 000 ₸.</p>

        <h2>По Казахстану</h2>
        <ul>
          <li>
            <b>СДЭК</b> — для небольших товаров: мини-принтеров, маркираторов, электронных книг,
            адаптеров. Стоимость — по тарифу СДЭК для вашего города.
          </li>
          <li>
            <b>Железная дорога</b> — для крупных товаров: интерактивных панелей, столов и других
            габаритных заказов. Самый недорогой способ — <b>до 15 000 ₸</b>. Отправляем почти в
            любой город Казахстана.
          </li>
          <li>
            <b>Jet Logistics</b> — от двери до двери: забирают у нас и привозят на ваш адрес.
            Около <b>25 000–30 000 ₸</b>.
          </li>
          <li>
            <b>Kaspi Доставка</b> — если оформляете заказ в нашем{" "}
            <a href={SITE.social.kaspi} target="_blank" rel="noopener noreferrer">магазине на Kaspi.kz</a>.
            Доставку выполняет Kaspi и отвечает за неё; стоимость и срок видны при оформлении
            заказа.
          </li>
        </ul>

        <h2>Сроки</h2>
        <p>
          Зависят от города и способа доставки. Точный срок менеджер назовёт при оформлении заказа.
        </p>

        <h2>Как заказать</h2>
        <p>
          Позвоните по телефону <a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a> или напишите
          в <a href={SITE.social.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>:
          назовите товар и город — подберём способ доставки и посчитаем стоимость. Условия
          возврата — на странице <Link href="/vozvrat">«Возврат и обмен»</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
