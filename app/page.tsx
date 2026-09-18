import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Feedbacks } from "@/components/Feedbacks";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { categoryHref, countLabel, getCategory } from "@/lib/products";
import { getCatalog } from "@/lib/prices";
import { getKaspiSnapshot } from "@/lib/kaspi-reviews";
import { catalogJsonLd, jsonLdScript } from "@/lib/seo";

type SP = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const query = await searchParams;

  // Категории раньше жили на /?cat=<key>. Такие ссылки остались в индексе
  // Google, рекламе и соцсетях — постоянный редирект переносит их вес на
  // отдельные страницы категорий. Остальные параметры (gclid, utm_*) не
  // теряем, иначе рекламная аналитика перестанет видеть переходы.
  const category = typeof query.cat === "string" ? getCategory(query.cat) : undefined;
  if (category && category.key !== "all") {
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "cat" || value === undefined) continue;
      for (const one of [value].flat()) rest.append(key, one);
    }
    const qs = rest.toString();
    const href = categoryHref(category.key);
    permanentRedirect(qs ? `${href}?${qs}` : href);
  }

  // Цены берём из хранилища (их правят на /admin), остальное — из каталога в коде.
  const all = await getCatalog();
  const kaspi = await getKaspiSnapshot();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(catalogJsonLd(all)) }}
      />
      <Header />
      <Hero />
      <div className="container">
        <section className="cats-section" id="catalog">
          <div className="cats-label">Категории</div>
          <CategoryChips active="all" />
        </section>
        <section className="catalog-section">
          <div className="catalog-head">
            <div>
              <span className="catalog-title">Каталог</span>
              <span className="catalog-count">{countLabel(all.length)}</span>
            </div>
            {/* <button className="sort-btn" type="button">
              По популярности
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button> */}
          </div>
          <div className="grid">
            {all.map((p) => (
              <ProductCard key={p.id} product={p} kaspi={kaspi.products[p.id]} />
            ))}
          </div>
        </section>
        <Feedbacks />
        <Features />
      </div>
      <Footer />
    </>
  );
}
