"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";

const INTERVAL_MS = 4500;
const SWIPE_THRESHOLD = 40; // px — minimum horizontal travel to count as a swipe

export function HeroCarousel({ products }: { products: ReadonlyArray<Product> }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const dragRef = useRef<{ id: number; x: number; y: number; swiped: boolean } | null>(null);
  const justSwipedRef = useRef(false);

  useEffect(() => {
    if (paused || products.length < 2) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % products.length),
      INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [paused, products.length]);

  if (products.length === 0) return null;
  const active = products[idx];

  const advance = (dir: 1 | -1) => {
    setIdx((i) => (i + dir + products.length) % products.length);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (products.length < 2) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
    setPaused(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    // Only commit to a swipe once we're clearly moving horizontally — otherwise let the page scroll vertically.
    if (!drag.swiped && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      drag.swiped = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    if (drag.swiped && Math.abs(dx) >= SWIPE_THRESHOLD) {
      advance(dx < 0 ? 1 : -1);
      justSwipedRef.current = true;
    }
    dragRef.current = null;
    setPaused(false);
  };

  // Swallow the click that follows a swipe so the underlying <Link> doesn't navigate.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justSwipedRef.current) {
      justSwipedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      className="hero-card hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={onClickCapture}
    >
      <div className="hero-slides">
        {products.map((p, i) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className={`hero-slide${i === idx ? " active" : ""}`}
            aria-hidden={i !== idx}
            tabIndex={i === idx ? 0 : -1}
            aria-label={p.name}
            draggable={false}
          >
            <Image
              src={p.images![0]}
              alt={p.name}
              fill
              sizes="(max-width: 900px) 90vw, 520px"
              style={{ objectFit: "contain" }}
              priority={i === 0}
              draggable={false}
            />
          </Link>
        ))}
      </div>
      <Link href={`/products/${active.id}`} className="hero-slide-label">
        <span className="hero-slide-name">{active.name}</span>
        <span className="hero-slide-cta">
          Подробнее
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </Link>
      <div className="hero-dots" role="tablist" aria-label="Слайды">
        {products.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`hero-dot${i === idx ? " active" : ""}`}
            onClick={() => setIdx(i)}
            aria-label={`Перейти к слайду ${i + 1}`}
            aria-current={i === idx}
          />
        ))}
      </div>
    </div>
  );
}
