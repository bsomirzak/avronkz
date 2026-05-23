"use client";

import { useState } from "react";
import { ProductIcon } from "./ProductIcon";
import type { IconName } from "@/lib/products";

const THUMB_BG_FALLBACKS = ["#D6EBFF", "#FFE891", "#D4F0CE", "#FBD4CD"];

export function Gallery({ icon, bg }: { icon: IconName; bg: string }) {
  const thumbBgs = [bg, ...THUMB_BG_FALLBACKS];
  const [activeIdx, setActiveIdx] = useState(0);
  const activeBg = thumbBgs[activeIdx];

  const next = () => setActiveIdx((i) => (i + 1) % thumbBgs.length);
  const prev = () => setActiveIdx((i) => (i - 1 + thumbBgs.length) % thumbBgs.length);

  return (
    <div className="gallery">
      <div className="gallery-main" style={{ background: activeBg }}>
        <button className="gallery-arrow prev" aria-label="Предыдущее" onClick={prev}>
          <svg viewBox="0 0 24 24" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div><ProductIcon name={icon} /></div>
        <button className="gallery-arrow next" aria-label="Следующее" onClick={next}>
          <svg viewBox="0 0 24 24" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="gallery-thumbs">
        {thumbBgs.map((b, i) => (
          <button
            key={i}
            type="button"
            className={`thumb${i === activeIdx ? " active" : ""}`}
            style={{ background: b }}
            onClick={() => setActiveIdx(i)}
            aria-label={`Фото ${i + 1}`}
          >
            <ProductIcon name={icon} />
          </button>
        ))}
      </div>
    </div>
  );
}
