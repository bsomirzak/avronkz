import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ARTICLES, articleDate } from "@/lib/articles";
import { SITE } from "@/lib/site";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Статьи о выборе техники",
  description: `Как выбрать интерактивную панель для класса и переговорной, какую диагональ брать и чем панель отличается от проектора — статьи ${SITE.name}.`,
  alternates: { canonical: "/stati" },
};

export default function ArticlesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Главная", url: absoluteUrl("/") },
    { name: "Статьи", url: absoluteUrl("/stati") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <Header />
      <main className="container article-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Статьи</span>
        </nav>

        <h1>Статьи</h1>
        <p className="article-lead">
          Помогаем выбрать технику до покупки: что подходит классу, переговорной и офису.
        </p>

        <div className="article-list">
          {ARTICLES.map((a) => (
            <Link key={a.slug} href={`/stati/${a.slug}`} className="article-card">
              <span className="article-card-date">{articleDate(a.date)}</span>
              <h2>{a.title}</h2>
              <p>{a.lead}</p>
              <span className="article-card-more">Читать →</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
