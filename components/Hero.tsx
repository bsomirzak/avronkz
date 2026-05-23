import Link from "next/link";

export function Hero() {
  return (
    <div className="hero-wrap">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6L12 2z" />
            </svg>
            Официальный магазин в Алматы
          </div>
          <h1 className="hero-title">
            Качественная техника
            <br />и мебель для <em>дома</em> и <em>офиса</em>
          </h1>
          <p className="hero-desc">
            Столы, мониторы, электроника и многое другое. Прямые поставки, гарантия 12
            месяцев. Оплата через Каспи с рассрочкой 0-0-12.
          </p>
          <div className="hero-ctas">
            <Link href="/#catalog" className="btn-primary">
              Смотреть каталог
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/#contacts" className="btn-ghost">Связаться с нами</Link>
          </div>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-val">4.9<span className="star">★</span></div>
              <div className="hero-stat-label">на Kaspi</div>
            </div>
            <div>
              <div className="hero-stat-val">36+</div>
              <div className="hero-stat-label">отзывов</div>
            </div>
            <div>
              <div className="hero-stat-val">15+</div>
              <div className="hero-stat-label">товаров</div>
            </div>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-img">
            <svg viewBox="0 0 100 100" fill="none" stroke="#FFCD3C" strokeWidth="2.2">
              <rect x="14" y="38" width="72" height="6" rx="1" />
              <line x1="24" y1="44" x2="24" y2="82" />
              <line x1="76" y1="44" x2="76" y2="82" />
              <line x1="22" y1="82" x2="34" y2="82" />
              <line x1="66" y1="82" x2="78" y2="82" />
              <circle cx="73" cy="41" r="1.5" fill="#FFCD3C" />
            </svg>
          </div>
          <div className="hero-card-label">AVRON AVR-001</div>
        </div>
      </section>
    </div>
  );
}
