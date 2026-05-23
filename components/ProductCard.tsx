import Link from "next/link";
import Image from "next/image";
import { ProductIcon } from "./ProductIcon";
import { FavButton } from "./FavButton";
import { formatPrice, type Product } from "@/lib/products";

function Badge({ p }: { p: Product }) {
  if (!p.badge) return null;
  if (p.discount && p.badge !== "hit") {
    return <span className="badge badge-sale">{p.discount}</span>;
  }
  // if (p.badge === "hit") return <span className="badge badge-hit">Хит</span>;
  // if (p.badge === "new") return <span className="badge badge-new">Новинка</span>;
  return null;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" aria-label={`Рейтинг ${rating.toFixed(1)} из 5`}>
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

export function ProductCard({ product: p }: { product: Product }) {
  const href = `/products/${p.id}`;
  return (
    <article
      className="card"
      itemScope
      itemType="https://schema.org/Product"
      style={{ position: "relative" }}
    >
      <div className="card-image">
        <Badge p={p} />
        {/* <FavButton /> */}
        {p.images?.[0] ? (
          <Image
            src={p.images[0]}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1240px) 33vw, 300px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <ProductIcon name={p.icon} />
        )}
      </div>
      <div className="card-body">
        <h3 className="card-name" itemProp="name">
          <Link href={href} style={{ position: "absolute", inset: 0, zIndex: 1 }} aria-label={p.name} />
          <span style={{ position: "relative", zIndex: 2 }}>{p.name}</span>
        </h3>
        {/* <div className="card-rating">
          <Stars rating={p.rating} /> {p.rating.toFixed(1)}{" "}
          <span style={{ color: "var(--ink-mute)" }}>({p.reviews})</span>
        </div> */}
        <div
          className="card-price-row"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <meta itemProp="priceCurrency" content="KZT" />
          <meta itemProp="price" content={String(p.price)} />
          <meta itemProp="availability" content="https://schema.org/InStock" />
          <span className="card-price">{formatPrice(p.price)}</span>
          {p.oldPrice && <span className="card-price-old">{formatPrice(p.oldPrice)}</span>}
        </div>
        <div className="card-installment">
          <span className="installment-badge">0·0·12</span>
          <span>{p.installment}</span>
        </div>
        <span className="card-cta">
          Подробнее
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </article>
  );
}
