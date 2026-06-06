import Image from "next/image";

const FEEDBACKS = Array.from({ length: 19 }, (_, i) => `/feedbacks/feedback-${i + 1}.png`);

export function Feedbacks() {
  // Duplicate the list so the CSS marquee can loop seamlessly (translateX -50%).
  const track = [...FEEDBACKS, ...FEEDBACKS];

  return (
    <section className="feedbacks-section" aria-label="Отзывы клиентов">
      <div className="feedbacks-head">
        <span className="feedbacks-title">Отзывы клиентов</span>
        <span className="feedbacks-sub">Что о нас говорят покупатели</span>
      </div>
      <div className="feedbacks-marquee">
        <div className="feedbacks-track">
          {track.map((src, i) => (
            <div className="feedback-card" key={i} aria-hidden={i >= FEEDBACKS.length}>
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
