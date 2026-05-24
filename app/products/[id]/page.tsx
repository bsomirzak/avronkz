import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Gallery } from "@/components/Gallery";
import { ProductTabs } from "@/components/ProductTabs";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS, getProduct, formatPrice } from "@/lib/products";
import { SITE } from "@/lib/site";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  jsonLdScript,
  productJsonLd,
} from "@/lib/seo";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return {};
  const url = `/products/${product.id}`;
  const title = `${product.name} — купить в ${SITE.city}`;
  const description = `${product.desc} Цена: ${formatPrice(product.price)}. Рассрочка Kaspi 0-0-12. Гарантия 12 месяцев.`;
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      "product:price:amount": String(product.price),
      "product:price:currency": "KZT",
      "product:availability": "in stock",
      "product:condition": "new",
      "product:brand": SITE.name,
      "product:retailer_item_id": product.shortName,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  const similar = PRODUCTS.filter((p) => p.id !== id).slice(0, 4);
  const detailParagraphs = product.details ?? [
    "Прочная металлическая рама выдерживает до 80 кг, а столешница из ламинированного МДФ устойчива к царапинам и легко очищается.",
  ];
  const advantages = product.advantages ?? [
    "Электрический подъёмный механизм с памятью на 3 положения",
    "Бесшумный двигатель — менее 50 дБ",
    "Защита от препятствий и встроенный антиколлизионный датчик",
    "Прочная порошковая покраска рамы",
    "Простая сборка за 30 минут",
  ];

  const breadcrumbs = [
    { name: "Главная", url: absoluteUrl("/") },
    { name: "Каталог", url: absoluteUrl("/#catalog") },
    { name: product.cat, url: absoluteUrl(`/?cat=${product.catKey}`) },
    { name: product.shortName, url: absoluteUrl(`/products/${product.id}`) },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <Header />
      <div className="container">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <Link href="/#catalog">Каталог</Link>
          <span className="sep">/</span>
          <Link href={`/?cat=${product.catKey}`} className="current">{product.cat}</Link>
          <span className="sep">/</span>
          <span className="current">{product.shortName}</span>
        </nav>

        <div className="product-detail">
          <Gallery icon={product.icon} images={product.images} alt={product.name} />

          <div className="detail-info">
            <div className="stock-row">
              <span className="stock-dot">В наличии</span>
              {product.badge === "hit" && <span className="pill-hit">Хит продаж</span>}
            </div>
            <h1 className="detail-name">{product.name}</h1>
            <div className="detail-meta">
              <span className="detail-meta-item">
                <span className="stars">★★★★★</span> {product.rating.toFixed(1)}
              </span>
              <span className="detail-meta-item">{product.reviews} отзывов на Kaspi</span>
              <span className="detail-meta-item">SKU: {product.shortName}</span>
            </div>

            <div className="price-card">
              <div className="price-row">
                <span className="price-main">{formatPrice(product.price)}</span>
                {product.oldPrice && (
                  <span className="price-old">{formatPrice(product.oldPrice)}</span>
                )}
                {product.discount && (
                  <span className="price-discount">{product.discount}</span>
                )}
              </div>
              <div className="installment-row">
                <span className="installment-badge">0·0·12</span>
                <span>Рассрочка {product.installment}</span>
              </div>
            </div>

            <div className="cta-stack">
              <a
                href={product.kaspiUrl ?? SITE.social.kaspi}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-kaspi-buy"
              >
                Купить на Kaspi
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <Link href="/#contacts" className="btn-contact">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
                </svg>
                Связаться с менеджером
              </Link>
            </div>

            <div className="key-specs">
              <h4>Ключевые характеристики</h4>
              <ul className="key-specs-list">
                {product.specs.slice(0, 5).map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ProductTabs
          tabs={[
            {
              id: "desc",
              label: "Описание",
              panel: (
                <div className="desc-grid">
                  <div className="desc-block">
                    <h3>О товаре</h3>
                    <p>{product.desc}</p>
                    {detailParagraphs.map((paragraph, index) => (
                      <p key={`${product.id}-detail-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="desc-block">
                    <h3>Преимущества</h3>
                    <ul className="advantages">
                      {advantages.map((item, index) => (
                        <li key={`${product.id}-advantage-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ),
            },
            {
              id: "specs",
              label: "Характеристики",
              panel: (
                <ul className="key-specs-list" style={{ maxWidth: 560 }}>
                  {product.specs.map(([k, v]) => (
                    <li key={k}>
                      <span>{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              id: "reviews",
              label: "Отзывы",
              count: product.reviews,
              panel: (
                <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                  Все отзывы доступны в карточке товара на Kaspi.
                </p>
              ),
            },
            {
              id: "delivery",
              label: "Доставка",
              panel: (
                <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
                  Доставка по {SITE.city} — бесплатно при заказе от 50 000 ₸. По
                  Казахстану — через Kaspi доставку, сроки 2-5 рабочих дней.
                </p>
              ),
            },
          ]}
        />

        <section className="similar-wrap">
          <h2 className="similar-head">Похожие товары</h2>
          <div className="grid">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
