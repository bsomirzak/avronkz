import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";

// Эта страница — «URL правил возврата» в Google Merchant Center. Условия здесь
// и в Merchant Center (и в разметке товаров, lib/seo.ts) должны совпадать.
export const metadata: Metadata = {
  title: "Возврат и обмен",
  description: `Условия возврата и обмена товаров в магазине ${SITE.name}: брак, гарантия 12 месяцев, как обратиться.`,
  alternates: { canonical: "/vozvrat" },
};

/** Дата последнего пересмотра условий — обновляйте при изменениях. */
const UPDATED = "18 сентября 2026 года";

export default function ReturnsPage() {
  return (
    <>
      <Header />
      <main className="container legal-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Возврат и обмен</span>
        </nav>

        <h1>Возврат и обмен</h1>
        <p className="legal-updated">Обновлено {UPDATED}</p>

        <h2>Товар с браком</h2>
        <p>
          Если товар оказался бракованным, мы вернём за него деньги или обменяем его на такой же
          исправный. Обратиться можно в течение гарантийного срока — 12 месяцев с момента покупки.
        </p>

        <h2>Товар надлежащего качества</h2>
        <p>
          Возврат и обмен исправных товаров, которые не подошли, не предусмотрены, за исключением
          случаев, установленных законодательством Республики Казахстан.
        </p>

        <h2>Доставка при возврате</h2>
        <p>Отправку товара обратно в магазин оплачивает покупатель.</p>

        <h2>Как оформить возврат</h2>
        <p>
          Свяжитесь с менеджером по телефону <a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a>,
          в <a href={SITE.social.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>{" "}
          или по почте <a href={`mailto:${SITE.email}`}>{SITE.email}</a>: укажите, какой товар
          и когда вы купили, и опишите неисправность. Менеджер подскажет, куда отправить товар.
        </p>

        <h2>Продавец</h2>
        <p>
          {SITE.legal.name}, ИИН {SITE.legal.iin}. Магазин {SITE.name}: {SITE.address.street},{" "}
          {SITE.address.locality}, {SITE.address.region}, Казахстан.
        </p>
      </main>
      <Footer />
    </>
  );
}
