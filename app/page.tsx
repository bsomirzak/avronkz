import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, productsByCategory, countLabel } from "@/lib/products";
import { SITE } from "@/lib/site";

type SP = Promise<{ cat?: string }>;

const VALID_KEYS = new Set<string>(CATEGORIES.map((c) => c.key));

function resolveCat(raw: string | undefined): string {
  if (!raw || !VALID_KEYS.has(raw)) return "all";
  return raw;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SP;
}): Promise<Metadata> {
  const { cat } = await searchParams;
  const key = resolveCat(cat);
  if (key === "all") {
    return {
      alternates: { canonical: "/" },
    };
  }
  const meta = CATEGORIES.find((c) => c.key === key)!;
  return {
    title: `${meta.label} в ${SITE.city}`,
    description: `${meta.label} от ${SITE.name} в ${SITE.city}: качественные товары, гарантия 12 месяцев, рассрочка Kaspi 0-0-12.`,
    alternates: { canonical: `/?cat=${key}` },
    openGraph: {
      title: `${meta.label} — ${SITE.name}`,
      description: `${meta.label} от ${SITE.name}. Доставка по ${SITE.city}, рассрочка 0-0-12.`,
      url: `/?cat=${key}`,
    },
  };
}

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const { cat } = await searchParams;
  const activeKey = resolveCat(cat);
  const list = productsByCategory(activeKey);

  return (
    <>
      <Header />
      <Hero />
      <div className="container">
        <section className="cats-section" id="catalog">
          <div className="cats-label">Категории</div>
          <CategoryChips active={activeKey} />
        </section>
        <section className="catalog-section">
          <div className="catalog-head">
            <div>
              <span className="catalog-title">Каталог</span>
              <span className="catalog-count">{countLabel(list.length)}</span>
            </div>
            <button className="sort-btn" type="button">
              По популярности
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <div className="grid">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
        <Features />
      </div>
      <Footer />
    </>
  );
}
