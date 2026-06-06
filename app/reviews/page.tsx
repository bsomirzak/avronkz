import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";
import { REVIEW_IMAGES } from "@/lib/reviews";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Отзывы клиентов — ${SITE.name}`,
  description: `Реальные отзывы покупателей ${SITE.name} в ${SITE.city}: скриншоты с Kaspi и из мессенджеров. Качество техники и мебели, доставка, гарантия 12 месяцев.`,
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: `Отзывы клиентов — ${SITE.name}`,
    description: `Что говорят покупатели ${SITE.name} в ${SITE.city}.`,
    url: "/reviews",
  },
};

export default function ReviewsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Главная", url: absoluteUrl("/") },
    { name: "Отзывы", url: absoluteUrl("/reviews") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <Header />
      <main className="container reviews-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Отзывы</span>
        </nav>

        <header className="reviews-head">
          <h1>Отзывы клиентов</h1>
          <p>
            Скриншоты реальных отзывов наших покупателей — с Kaspi и из мессенджеров.
            Спасибо, что выбираете {SITE.name}!
          </p>
        </header>

        <section className="reviews-masonry" aria-label="Отзывы покупателей">
          {REVIEW_IMAGES.map((src, i) => (
            <figure className="review-item" key={src}>
              <Image
                src={src}
                alt={`Отзыв клиента AVRON №${i + 1}`}
                width={0}
                height={0}
                sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 33vw"
                unoptimized
                style={{ width: "100%", height: "auto" }}
              />
            </figure>
          ))}
        </section>

        <section className="reviews-cta">
          <h2>Хотите оставить отзыв?</h2>
          <p>Напишите нам в WhatsApp — будем рады обратной связи.</p>
          <a
            href={SITE.social.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Написать в WhatsApp
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
