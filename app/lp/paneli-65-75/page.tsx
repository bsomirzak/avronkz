import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OrderForm } from "@/components/OrderForm";
import { getCatalog } from "@/lib/prices";
import { formatPrice, type Product } from "@/lib/products";
import { SITE } from "@/lib/site";

/**
 * Посадочная под рекламу в Instagram «Интерактивная панель 65" / 75"».
 * Показывает ровно то, что обещает креатив: две панели, цена, заказ.
 * В поиске ей делать нечего — категория /catalog/interaktivnye-paneli
 * остаётся единственной страницей панелей для Google.
 */
export const metadata: Metadata = {
  title: "Интерактивная панель 65 и 75 дюймов AVRON",
  description:
    "Интерактивные панели AVRON LT-65 и LT-75: 4K, Windows 10 Pro и Android 13 в одном устройстве, 20 касаний. Цена, заказ, доставка по Казахстану, счёт для организаций.",
  robots: { index: false, follow: true },
};

const IDS = ["avron-lt-65", "avron-lt-75"] as const;

/** WhatsApp с заготовленным первым сообщением: менеджер сразу видит, откуда человек. */
const WHATSAPP_HREF = `${SITE.social.whatsapp}?text=${encodeURIComponent(
  "Здравствуйте! Интересует интерактивная панель 65\" / 75\". Подскажите, пожалуйста.",
)}`;

const HIGHLIGHTS = [
  ["4K Ultra HD", "3840×2160, яркость 450 кд/м² — видно при включённом свете"],
  ["Windows 10 Pro + Android 13", "Intel Core i7, 8 ГБ RAM, 256 ГБ SSD — ноутбук не нужен"],
  ["20 касаний", "Пальцем и стилусом, несколько человек у доски одновременно"],
  ["Гарантия 12 месяцев", "Официальный магазин AVRON в Алматы"],
] as const;

const FAQ = [
  {
    q: "65 или 75 дюймов — что выбрать?",
    a: "Начинка одинаковая, разница только в размере экрана. До 7–8 метров до самого дальнего зрителя — класс, переговорная, кабинет — хватает 65 дюймов. Для конференц-зала, аудитории и зала длиннее 8 метров берите 75.",
  },
  {
    q: "Нужен ли отдельный компьютер?",
    a: "Нет. Внутри уже Windows 10 Pro на Intel Core i7 и отдельная система Android 13. Ноутбук при желании подключается по HDMI, DisplayPort или USB Type-C.",
  },
  {
    q: "Как оплатить и получить документы для организации?",
    a: "Наличными, переводом, по Kaspi QR или по счёту: выставляем счёт на организацию с закрывающими документами — при заказе выберите «Счёт для компании» и укажите название и БИН.",
  },
  {
    q: "Как доставляете?",
    a: "По Алматы бесплатно при заказе от 50 000 ₸. В другие города Казахстана — железной дорогой (до 15 000 ₸) или Jet Logistics от двери до двери. Точную сумму и срок менеджер называет при оформлении.",
  },
  {
    q: "Что в комплекте?",
    a: "LT-65 — настенное крепление, стойка на колёсах, стилус, телескопическая указка. LT-75 — настенные крепления, стилус, указка и кабель питания; стойка на колёсах докупается отдельно.",
  },
];

function PanelBlock({ product, forRoom }: { product: Product; forRoom: string }) {
  const priceText =
    product.price !== null ? formatPrice(product.price) : (product.priceNote ?? "Цена по запросу");
  return (
    <section className="lp-panel" id={product.id}>
      <div className="lp-panel-media">
        {product.images?.[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            width={640}
            height={640}
            sizes="(max-width: 768px) 100vw, 480px"
            style={{ width: "100%", height: "auto" }}
          />
        )}
      </div>
      <div className="lp-panel-info">
        <h2>{product.name}</h2>
        <p className="lp-panel-room">{forRoom}</p>
        <div className="lp-panel-price">{priceText}</div>
        <ul className="key-specs-list lp-panel-specs">
          {product.specs.slice(0, 6).map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        <div className="cta-stack">
          <OrderForm
            productId={product.id}
            productName={product.name}
            price={product.price}
            priceText={priceText}
          />
          <a
            href={product.kaspiUrl ?? SITE.social.kaspi}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-kaspi-buy secondary"
            data-analytics-value={product.price ?? undefined}
            data-analytics-product={product.id}
          >
            Купить на Kaspi.kz
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <p className="cta-note">На Kaspi.kz — своя цена и условия рассрочки.</p>
          <Link href={`/products/${product.id}`} className="btn-contact">
            Все характеристики и отзывы
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function PanelsLandingPage() {
  const catalog = await getCatalog();
  const panels = IDS.map((id) => catalog.find((p) => p.id === id)).filter(
    (p): p is Product => Boolean(p),
  );

  return (
    <>
      <Header />
      <main className="container lp-page">
        <section className="lp-hero">
          <p className="lp-eyebrow">Официальный магазин AVRON · Алматы</p>
          <h1>
            Интерактивная панель <span>65&quot; и 75&quot;</span>
          </h1>
          <p className="lp-lead">
            Две системы в одном устройстве — Windows 10 Pro и Android 13. 4K-экран, 20 касаний,
            стойка на колёсах. Для школ, учебных центров и переговорных.
          </p>
          <div className="lp-hero-ctas">
            {/* Из Instagram приходят с телефона и охотнее пишут, чем заполняют форму —
                поэтому WhatsApp стоит первым, ещё до цен. */}
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3c.2-.6.2-1.1.2-1.2l-.5-.3Z" />
              </svg>
              Написать в WhatsApp
            </a>
            {panels.map((p) => (
              <a key={p.id} href={`#${p.id}`} className="btn-primary">
                {p.shortName}
                {p.price !== null ? ` — ${formatPrice(p.price)}` : ""}
              </a>
            ))}
          </div>
          <p className="lp-hero-note">
            Напишите размеры помещения и число людей — подскажем диагональ. Или позвоните:{" "}
            <a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a>
          </p>
        </section>

        <section className="lp-highlights" aria-label="Главное">
          {HIGHLIGHTS.map(([title, text]) => (
            <div key={title} className="lp-highlight">
              <b>{title}</b>
              <span>{text}</span>
            </div>
          ))}
        </section>

        {panels[0] && (
          <PanelBlock
            product={panels[0]}
            forRoom="Для класса на 25–30 человек, переговорной и кабинета — до 8 метров до зрителя"
          />
        )}
        {panels[1] && (
          <PanelBlock
            product={panels[1]}
            forRoom="Для конференц-зала, актового зала и большой аудитории — когда зал длиннее 8 метров"
          />
        )}

        <section className="category-block">
          <h2>Для организаций</h2>
          <p className="lp-text">
            Школам, учебным центрам и компаниям выставляем счёт на организацию с закрывающими
            документами. Поможем подобрать диагональ под помещение: напишите размеры и число
            людей. Доставка по Алматы и всему Казахстану, гарантия 12 месяцев.
          </p>
          <div className="lp-hero-ctas">
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Написать в WhatsApp
            </a>
            <a href={`tel:${SITE.phoneRaw}`} className="btn-contact">
              {SITE.phone}
            </a>
          </div>
        </section>

        <section className="category-block">
          <h2>Частые вопросы</h2>
          <div className="faq">
            {FAQ.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
