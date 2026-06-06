import Image from "next/image";
import Link from "next/link";
import { REVIEW_IMAGES } from "@/lib/reviews";

export function Feedbacks() {
  // Duplicate the list so the CSS marquee can loop seamlessly (translateX -50%).
  const track = [...REVIEW_IMAGES, ...REVIEW_IMAGES];

  return (
    <section className="feedbacks-section" aria-label="Отзывы клиентов">
      <div className="feedbacks-head">
        <span className="feedbacks-title">Отзывы клиентов</span>
        <span className="feedbacks-sub">Что о нас говорят покупатели</span>
        <Link href="/reviews" className="feedbacks-link">
          Все отзывы
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="feedbacks-marquee">
        <div className="feedbacks-track">
          {track.map((src, i) => (
            <div className="feedback-card" key={i} aria-hidden={i >= REVIEW_IMAGES.length}>
              <Image
                src={src}
                alt="Отзыв клиента AVRON"
                fill
                sizes="280px"
                unoptimized
                loading="eager"
                style={{ objectFit: "contain" }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
