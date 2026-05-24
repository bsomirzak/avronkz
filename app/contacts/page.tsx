import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Контакты — ${SITE.name}`,
  description: `Свяжитесь с ${SITE.name} в ${SITE.city}: WhatsApp, Telegram, Instagram, TikTok, Kaspi Магазин и email. ${SITE.hours}.`,
  alternates: { canonical: "/contacts" },
  openGraph: {
    title: `Контакты — ${SITE.name}`,
    description: `Свяжитесь с ${SITE.name} в ${SITE.city}.`,
    url: "/contacts",
  },
};

type Channel = {
  key: string;
  title: string;
  value: string;
  href: string;
  external?: boolean;
  tone: "green" | "blue" | "pink" | "dark" | "yellow" | "navy";
  icon: React.ReactNode;
};

const CHANNELS: Channel[] = [
  {
    key: "whatsapp",
    title: "WhatsApp",
    value: SITE.phone,
    href: SITE.social.whatsapp,
    external: true,
    tone: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    key: "telegram",
    title: "Telegram",
    value: SITE.phone,
    href: SITE.social.telegram,
    external: true,
    tone: "blue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    title: "Instagram",
    value: "@avron.kz",
    href: SITE.social.instagram,
    external: true,
    tone: "pink",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2z" />
        <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
      </svg>
    ),
  },
  {
    key: "tiktok",
    title: "TikTok",
    value: "@avron.kz",
    href: SITE.social.tiktok,
    external: true,
    tone: "dark",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    ),
  },
  {
    key: "email",
    title: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    tone: "yellow",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 6l-10 7L2 6" />
      </svg>
    ),
  },
  {
    key: "kaspi",
    title: "Kaspi Магазин",
    value: "kaspi.kz",
    href: SITE.social.kaspi,
    external: true,
    tone: "navy",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];

export default function ContactsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Главная", url: absoluteUrl("/") },
    { name: "Контакты", url: absoluteUrl("/contacts") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <Header />
      <main className="container contacts-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Контакты</span>
        </nav>

        <header className="contacts-head">
          <h1>Контакты</h1>
          <p>
            Напишите или позвоните — отвечаем ежедневно, помогаем с выбором, оформлением рассрочки
            Kaspi 0-0-12 и доставкой по {SITE.city}.
          </p>
        </header>

        <section className="contacts-grid" aria-label="Каналы связи">
          {CHANNELS.map((c) => (
            <a
              key={c.key}
              href={c.href}
              {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`contact-card tone-${c.tone}`}
            >
              <span className="contact-icon" aria-hidden="true">{c.icon}</span>
              <span className="contact-meta">
                <span className="contact-title">{c.title}</span>
                <span className="contact-value">{c.value}</span>
              </span>
              <span className="contact-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </span>
            </a>
          ))}
        </section>

        <section className="contacts-info" aria-label="Информация о магазине">
          <div className="contacts-info-card">
            <div className="contacts-info-label">Адрес</div>
            <div className="contacts-info-title">{SITE.address.street}</div>
            <div className="contacts-info-text">
              {SITE.address.locality}, {SITE.address.region}, {SITE.address.postal}
            </div>
            <a
              className="contacts-info-link contacts-map-link"
              href={SITE.address.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Открыть в 2ГИС
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          </div>
          <div className="contacts-info-card">
            <div className="contacts-info-label">Часы работы</div>
            <div className="contacts-info-title">{SITE.hours}</div>
            <div className="contacts-info-text">Без выходных</div>
          </div>
          <div className="contacts-info-card">
            <div className="contacts-info-label">Телефон</div>
            <a className="contacts-info-title contacts-info-link" href={`tel:${SITE.phoneRaw}`}>
              {SITE.phone}
            </a>
            <div className="contacts-info-text">WhatsApp и Telegram на этом же номере</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
