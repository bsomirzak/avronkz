import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleBody } from "@/components/ArticleBody";
import { ARTICLES, articleDate, getArticle } from "@/lib/articles";
import { SITE } from "@/lib/site";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

// Статьи лежат в коде, поэтому список адресов известен заранее.
export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.seoTitle ?? article.title,
    description: article.description,
    alternates: { canonical: `/stati/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/stati/${article.slug}`,
      type: "article",
      publishedTime: article.date,
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const url = absoluteUrl(`/stati/${article.slug}`);
  const others = ARTICLES.filter((a) => a.slug !== article.slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: "ru-RU",
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/products/logo/logo.png") },
    },
  };

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Главная", url: absoluteUrl("/") },
    { name: "Статьи", url: absoluteUrl("/stati") },
    { name: article.title, url },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />
      <Header />
      <main className="container article-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <Link href="/stati">Статьи</Link>
          <span className="sep">/</span>
          <span className="current">{article.title}</span>
        </nav>

        <h1>{article.title}</h1>
        <p className="article-meta">Обновлено {articleDate(article.date)}</p>

        <article className="article-text">
          <ArticleBody blocks={article.body} />
        </article>

        <section className="article-cta">
          <h2>Поможем подобрать</h2>
          <p>
            Напишите размеры помещения и сколько человек — подберём диагональ и посчитаем
            доставку. Школам и компаниям выставляем счёт на организацию.
          </p>
          <div className="article-cta-links">
            <Link href="/catalog/interaktivnye-paneli" className="btn-primary">
              Смотреть панели
            </Link>
            <Link href="/contacts" className="btn-contact">
              Связаться с менеджером
            </Link>
          </div>
        </section>

        {others.length > 0 && (
          <section className="article-more">
            <h2>Ещё статьи</h2>
            <ul>
              {others.map((a) => (
                <li key={a.slug}>
                  <Link href={`/stati/${a.slug}`}>{a.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
