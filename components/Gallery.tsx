"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductIcon } from "./ProductIcon";
import type { IconName } from "@/lib/products";

const THUMB_BG_FALLBACKS = ["#D6EBFF", "#FFE891", "#D4F0CE", "#FBD4CD"];

type GalleryProps = {
  icon: IconName;
  bg: string;
  images?: ReadonlyArray<string>;
  alt?: string;
};

export function Gallery({ icon, bg, images, alt }: GalleryProps) {
  const hasPhotos = !!images && images.length > 0;
  const slides = hasPhotos ? images! : [bg, ...THUMB_BG_FALLBACKS];

  const [activeIdx, setActiveIdx] = useState(0);
  const active = slides[activeIdx];

  const next = () => setActiveIdx((i) => (i + 1) % slides.length);
  const prev = () => setActiveIdx((i) => (i - 1 + slides.length) % slides.length);

  return (
    <div className="gallery">
      <div
        className="gallery-main"
        style={hasPhotos ? { background: bg } : { background: active }}
      >
        <button className="gallery-arrow prev" aria-label="Предыдущее" onClick={prev}>
          <svg viewBox="0 0 24 24" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {hasPhotos ? (
          <Image
            src={active}
            alt={alt ?? "Фото товара"}
            fill
            sizes="(max-width: 900px) 100vw, 600px"
            style={{ objectFit: "contain" }}
            priority={activeIdx === 0}
          />
        ) : (
          <div><ProductIcon name={icon} /></div>
        )}
        <button className="gallery-arrow next" aria-label="Следующее" onClick={next}>
          <svg viewBox="0 0 24 24" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="gallery-thumbs">
        {slides.map((slide, i) => (
          <button
            key={i}
            type="button"
            className={`thumb${i === activeIdx ? " active" : ""}`}
            style={hasPhotos ? { background: bg, position: "relative" } : { background: slide }}
            onClick={() => setActiveIdx(i)}
            aria-label={`Фото ${i + 1}`}
          >
            {hasPhotos ? (
              <Image
                src={slide}
                alt=""
                fill
                sizes="120px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <ProductIcon name={icon} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
