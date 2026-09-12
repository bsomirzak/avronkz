import { readFileSync } from "node:fs";
import path from "node:path";
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

type Review = { src: string; index: number; width: number; height: number };

// Pixel size of a screenshot in public/, read from its PNG header at build time.
function pngSize(src: string) {
  const buf = readFileSync(path.join(process.cwd(), "public", src));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Greedy masonry: each review goes into the currently shortest column, so the
// first reviews (panel) sit at the top of every column and columns end evenly.
function toColumns(reviews: Review[], count: number): Review[][] {
  const columns: Review[][] = Array.from({ length: count }, () => []);
  const heights: number[] = new Array(count).fill(0);
  for (const review of reviews) {
    const i = heights.indexOf(Math.min(...heights));
    columns[i].push(review);
    // Height relative to column width, plus card padding and gap.
    heights[i] += review.height / review.width + 0.1;
  }
  return columns;
}

export default function ReviewsPage() {
  const reviews: Review[] = REVIEW_IMAGES.map((src, index) => ({ src, index, ...pngSize(src) }));
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

        {/* 3- and 2-column layouts, switched in CSS. On phones the 2-column one
            collapses to a single list ordered by `order`. */}
        {[3, 2].map((count) => (
          <section
            className={`reviews-masonry reviews-masonry--${count}`}
            aria-label="Отзывы покупателей"
            key={count}
          >
            {toColumns(reviews, count).map((column, c) => (
              <div className="reviews-col" key={c}>
                {column.map((review) => (
                  <figure className="review-item" key={review.src} style={{ order: review.index }}>
                    <Image
                      src={review.src}
                      alt={`Отзыв клиента AVRON №${review.index + 1}`}
                      width={review.width}
                      height={review.height}
                      sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 33vw"
                      unoptimized
                      style={{ width: "100%", height: "auto" }}
                    />
                  </figure>
                ))}
              </div>
            ))}
          </section>
        ))}

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
