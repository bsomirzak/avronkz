import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import {
  CATEGORIES,
  categoryHref,
  formatPrice,
  getCategoryBySlug,
  type Product,
} from "@/lib/products";
import { getCatalog } from "@/lib/prices";
import { getKaspiSnapshot } from "@/lib/kaspi-reviews";
import { SITE } from "@/lib/site";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  catalogJsonLd,
  faqJsonLd,
  jsonLdScript,
} from "@/lib/seo";

type Params = Promise<{ slug: string }>;

// Страниц ровно столько, сколько категорий в каталоге: чужой slug — 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.filter((c) => c.key !== "all").map((c) => ({ slug: c.slug }));
}

async function loadCategory(slug: string) {
  const category = getCategoryBySlug(slug);
  if (!category) return null;
  // Цены берём из хранилища (их правят на /admin), поэтому «от …» в текстах
  // считаем на лету, а не пишем руками.
  const products = (await getCatalog()).filter((p) => p.catKey === category.key);
  return { category, products };
}

function minPriceText(products: ReadonlyArray<Product>): string | null {
  const prices = products.map((p) => p.price).filter((n): n is number => n !== null);
  return prices.length ? `от ${formatPrice(Math.min(...prices))}` : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) return {};
  const { category, products } = data;
  const url = categoryHref(category.key);
  const heading = category.heading ?? `${category.label} в ${SITE.city}`;
  const title = category.title ?? `${heading} — цены, купить`;
  const from = minPriceText(products);
  const description = [
    category.description ?? category.intro,
    from && `Цены ${from}.`,
    "Рассрочка Kaspi, доставка по Казахстану.",
  ]
    .filter(Boolean)
    .join(" ");
  const ogImages = products.flatMap((p) => p.images?.slice(0, 1) ?? []).map((src) => absoluteUrl(src));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: SITE.name,
      locale: SITE.locale,
      images: ogImages,
    },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) notFound();
  const { category, products } = data;
  const kaspi = await getKaspiSnapshot();

  const url = categoryHref(category.key);
  const heading = category.heading ?? `${category.label} в ${SITE.city}`;
  const from = minPriceText(products);
  const fill = (text: string) => text.replaceAll("{minPrice}", from ?? "по запросу");
  const faq = (category.faq ?? []).map(({ q, a }) => ({ q, a: fill(a) }));
  const compare = category.compare ?? [];

  const breadcrumbs = [
    { name: "Главная", url: absoluteUrl("/") },
    { name: "Каталог", url: absoluteUrl("/#catalog") },
    { name: category.label, url: absoluteUrl(url) },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(catalogJsonLd(products, { path: url, name: heading })),
        }}
      />
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq)) }}
        />
      )}
      <Header />
      <div className="container category-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <Link href="/#catalog">Каталог</Link>
          <span className="sep">/</span>
          <span className="current">{category.label}</span>
        </nav>

        <header className="category-head">
          <h1>{heading}</h1>
          {category.intro && <p>{category.intro}</p>}
        </header>

        <section className="cats-section" id="catalog">
          <CategoryChips active={category.key} />
        </section>

        <section className="catalog-section">
          <div className="grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} kaspi={kaspi.products[p.id]} />
            ))}
          </div>
        </section>

        {compare.length > 0 && products.length > 1 && (
          <section className="category-block">
            <h2>Сравнение моделей</h2>
            <div className="compare-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Модель</th>
                    {compare.map((k) => (
                      <th scope="col" key={k}>{k}</th>
                    ))}
                    <th scope="col">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const specs = new Map(p.specs);
                    return (
                      <tr key={p.id}>
                        <th scope="row">
                          <Link href={`/products/${p.id}`}>{p.name}</Link>
                        </th>
                        {compare.map((k) => (
                          <td key={k}>{specs.get(k) ?? "—"}</td>
                        ))}
                        <td className="compare-price">
                          {p.price !== null ? formatPrice(p.price) : (p.priceNote ?? "Цена по запросу")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {category.sections && (
          <section className="category-block category-text">
            {category.sections.map((s) => (
              <div key={s.heading}>
                <h2>{s.heading}</h2>
                {s.paragraphs.map((text, i) => (
                  <p key={i}>{fill(text)}</p>
                ))}
              </div>
            ))}
          </section>
        )}

        {faq.length > 0 && (
          <section className="category-block">
            <h2>Частые вопросы</h2>
            <div className="faq">
              {faq.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
